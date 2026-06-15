import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { escapeMarkdownTableCell } from "../lib/format.js";
import { splitTranscriptIntoScenes } from "../lib/script.js";
import type { Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function prepareProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const script = (await fs.readFile(project.paths.scriptFile, "utf8")).trim();

  if (!script) {
    throw new Error(`Script file is empty:\n${displayPath(project.root, project.paths.scriptFile)}`);
  }

  const primaryCharacter =
    project.characterBible.characters.find((character) => /main/i.test(character.name)) ??
    project.characterBible.characters[0];
  const scenes = splitTranscriptIntoScenes(script, {
    targetSceneSeconds:
      project.config.generation.scene_duration_target_seconds ?? project.profile.targetSceneSeconds,
    minSceneSeconds:
      project.config.generation.min_scene_duration_seconds ?? project.profile.minSceneSeconds,
    maxSceneSeconds:
      project.config.generation.max_scene_duration_seconds ?? project.profile.maxSceneSeconds,
    wordsPerMinute: project.config.generation.words_per_minute,
    primaryCharacter: primaryCharacter.name
  });

  const transcriptFolder = path.join(project.paths.outputFolder, "01_transcript");
  const scenesFolder = path.join(project.paths.outputFolder, "02_scenes");
  const results = await Promise.all([
    writeTextFile(path.join(transcriptFolder, "transcript.txt"), script, options),
    writeJsonFile(path.join(transcriptFolder, "timestamps.json"), createTimestamps(scenes), options),
    writeJsonFile(path.join(scenesFolder, "scenes.json"), scenes, options),
    writeTextFile(path.join(scenesFolder, "scenes.md"), scenesMarkdown(scenes), options)
  ]);

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

video-pack prompts --project ${displayPath(process.cwd(), project.root) || "."}`;
}

function createTimestamps(scenes: Scene[]): unknown {
  return {
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
