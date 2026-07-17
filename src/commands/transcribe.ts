import path from "node:path";
import { detectAudioInfo } from "../lib/audio.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { transcribeAudioWithOpenAI } from "../lib/openai.js";
import { loadValidProject } from "../lib/validation.js";

export async function transcribeProjectCommand(
  projectPath: string,
  options: { force?: boolean; provider?: string } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const provider = options.provider ?? project.config.transcription.provider;
  const transcriptFolder = path.join(project.paths.outputFolder, "01_transcript");

  if (!project.paths.audioFile) {
    throw new Error(`No audio file is configured.

Add input/voice.mp3, input/voice.wav, input/voice.m4a, or input/voice.aac. For another filename, update project.yml:

input:
  audio_file: "./input/voice.mp3"`);
  }

  const audioInfo = await detectAudioInfo(project.paths.audioFile);

  if (provider !== "openai") {
    throw new Error(`Transcription provider "${provider}" does not transcribe audio.

Use:
video-pack transcribe --project ${projectPath} --provider openai`);
  }

  const result = await transcribeAudioWithOpenAI({
    audioPath: project.paths.audioFile,
    config: project.config
  });

  const writes = await Promise.all([
    writeTextFile(path.join(transcriptFolder, "transcript.txt"), result.text.trim(), options),
    writeJsonFile(
      path.join(transcriptFolder, "transcription_raw.json"),
      {
        provider,
        model: result.model,
        audio: audioInfo,
        raw: result.raw
      },
      options
    ),
    writeJsonFile(path.join(transcriptFolder, "audio_info.json"), audioInfo, options)
  ]);

  const created = listCreated(writes, project.root);
  const skipped = listSkipped(writes, project.root);

  return `Transcription complete.

Audio: ${displayPath(project.root, project.paths.audioFile)}
Duration: ${audioInfo.duration_seconds ? `${audioInfo.duration_seconds}s` : "unknown"}
Model: ${result.model}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next step:
video-pack prepare --project ${displayPath(process.cwd(), project.root) || "."}`;
}
