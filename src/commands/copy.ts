import path from "node:path";
import fs from "fs-extra";
import { createCopyPack, copyPackToMarkdown } from "../lib/copy.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import type { Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function copyProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");

  if (!(await fs.pathExists(scenesPath))) {
    throw new Error(`Could not find scenes.json.

Run:
video-pack prepare --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const pack = createCopyPack(
    project.config.project_name,
    project.config.profile,
    scenes,
    project.channelBible,
    project.config.copy.title_options
  );
  const publishFolder = path.join(project.paths.outputFolder, "07_publish");
  const results = await Promise.all([
    writeJsonFile(path.join(publishFolder, "copy_pack.json"), pack, options),
    writeTextFile(path.join(publishFolder, "copy_pack.md"), copyPackToMarkdown(pack), options)
  ]);

  return `Copy pack generated.

Created:
${listCreated(results, project.root).join("\n") || "- none"}

Skipped existing:
${listSkipped(results, project.root).join("\n") || "- none"}

Review:
${displayPath(project.root, publishFolder)}/`;
}
