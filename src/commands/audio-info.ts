import path from "node:path";
import { detectAudioInfo } from "../lib/audio.js";
import { displayPath, listCreated, listSkipped, writeJsonFile } from "../lib/files.js";
import { loadValidProject } from "../lib/validation.js";

export async function audioInfoProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);

  if (!project.paths.audioFile) {
    throw new Error(`No audio file is configured.

Update project.yml:

input:
  audio_file: "./input/voice.mp3"`);
  }

  const info = await detectAudioInfo(project.paths.audioFile);
  const result = await writeJsonFile(
    path.join(project.paths.outputFolder, "01_transcript", "audio_info.json"),
    info,
    options
  );
  const created = listCreated([result], project.root);
  const skipped = listSkipped([result], project.root);

  return `Audio info

File: ${displayPath(project.root, project.paths.audioFile)}
Format: ${info.format}
Duration: ${info.duration_seconds ? `${info.duration_seconds}s` : "unknown"}
Method: ${info.method}
${info.warning ? `Warning: ${info.warning}\n` : ""}
Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}`;
}
