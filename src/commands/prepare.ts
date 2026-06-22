import path from "node:path";
import fs from "fs-extra";
import { detectAudioInfo, type AudioInfo } from "../lib/audio.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { escapeMarkdownTableCell } from "../lib/format.js";
import { transcribeAudioWithOpenAI } from "../lib/openai.js";
import { retimeScenesToDuration, splitTranscriptIntoScenes } from "../lib/script.js";
import type { Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function prepareProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const transcriptFolder = path.join(project.paths.outputFolder, "01_transcript");
  const transcriptPath = path.join(transcriptFolder, "transcript.txt");
  let script = await resolveTranscript(projectPath, transcriptPath, project, options);
  const audioInfo = project.paths.audioFile ? await detectAudioInfo(project.paths.audioFile) : undefined;

  if (!script) {
    throw new Error(`Script file is empty:\n${displayPath(project.root, project.paths.scriptFile)}`);
  }

  const primaryCharacter =
    project.characterBible.characters.find((character) => /main/i.test(character.name)) ??
    project.characterBible.characters[0];
  let scenes = splitTranscriptIntoScenes(script, {
    targetSceneSeconds:
      project.config.generation.scene_duration_target_seconds ?? project.profile.targetSceneSeconds,
    minSceneSeconds:
      project.config.generation.min_scene_duration_seconds ?? project.profile.minSceneSeconds,
    maxSceneSeconds:
      project.config.generation.max_scene_duration_seconds ?? project.profile.maxSceneSeconds,
    wordsPerMinute: project.config.generation.words_per_minute,
    primaryCharacter: primaryCharacter.name
  });

  if (audioInfo?.duration_seconds) {
    scenes = retimeScenesToDuration(scenes, audioInfo.duration_seconds);
  }

  const scenesFolder = path.join(project.paths.outputFolder, "02_scenes");
  const writes = [
    writeTextFile(transcriptPath, script, options),
    writeJsonFile(path.join(transcriptFolder, "timestamps.json"), createTimestamps(scenes, audioInfo), options),
    writeJsonFile(path.join(scenesFolder, "scenes.json"), scenes, options),
    writeTextFile(path.join(scenesFolder, "scenes.md"), scenesMarkdown(scenes), options)
  ];

  if (audioInfo) {
    writes.push(writeJsonFile(path.join(transcriptFolder, "audio_info.json"), audioInfo, options));
  }

  const results = await Promise.all(writes);

  const created = listCreated(results, project.root);
  const skipped = listSkipped(results, project.root);

  return `Prepared transcript and scenes.

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next step:
Review output/02_scenes/scenes.md.
Edit any visual goals you want to change.
Then run:

video-pack visual-events --project ${displayPath(process.cwd(), project.root) || "."}`;
}

async function resolveTranscript(
  projectPath: string,
  transcriptPath: string,
  project: Awaited<ReturnType<typeof loadValidProject>>,
  options: { force?: boolean }
): Promise<string> {
  if (!options.force && (await fs.pathExists(transcriptPath))) {
    return (await fs.readFile(transcriptPath, "utf8")).trim();
  }

  if (project.config.transcription.provider === "openai") {
    if (!project.paths.audioFile) {
      throw new Error(`Transcription provider is openai, but no audio file is configured.

Update project.yml:

input:
  audio_file: "./input/voice.mp3"`);
    }

    const result = await transcribeAudioWithOpenAI({
      audioPath: project.paths.audioFile,
      config: project.config
    });
    await writeJsonFile(
      path.join(path.dirname(transcriptPath), "transcription_raw.json"),
      {
        provider: "openai",
        model: result.model,
        raw: result.raw
      },
      { force: true }
    );
    return result.text.trim();
  }

  const script = (await fs.readFile(project.paths.scriptFile, "utf8")).trim();
  return script;
}

function createTimestamps(scenes: Scene[], audioInfo?: AudioInfo): unknown {
  return {
    audio: audioInfo,
    scenes: scenes.map((scene) => ({
      scene_number: scene.scene_number,
      start: scene.start,
      end: scene.end,
      duration_seconds: scene.duration_seconds,
      transcript: scene.transcript
    }))
  };
}

function scenesMarkdown(scenes: Scene[]): string {
  const rows = scenes.map(
    (scene) =>
      `| ${scene.scene_number} | ${scene.start} | ${scene.end} | ${escapeMarkdownTableCell(
        scene.transcript
      )} | ${escapeMarkdownTableCell(scene.visual_goal)} |`
  );

  return `# Scenes

| Scene | Start | End | Transcript | Visual goal |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
}
