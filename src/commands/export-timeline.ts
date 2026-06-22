import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeTextFile } from "../lib/files.js";
import {
  capCutAssemblyGuide,
  createTimelineRows,
  timelineRowsToCsv,
  timelineRowsToFcpxml
} from "../lib/timeline.js";
import type { Prompt, Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function exportTimelineCommand(
  projectPath: string,
  options: { force?: boolean; format?: "all" | "premiere" | "davinci" | "fcpxml" | "capcut" } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");

  if (!(await fs.pathExists(scenesPath)) || !(await fs.pathExists(promptsPath))) {
    throw new Error(`Timeline export needs scenes and prompts.

Run:
video-pack prepare --project ${projectPath}
video-pack visual-events --project ${projectPath}
video-pack prompts --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const rows = createTimelineRows(project.root, scenes, prompts);
  const timelineFolder = path.join(project.paths.outputFolder, "06_edit_pack", "timelines");
  const format = options.format ?? "all";
  const writes = [];

  if (format === "all" || format === "premiere") {
    writes.push(
      writeTextFile(path.join(timelineFolder, "premiere_timeline.csv"), timelineRowsToCsv(rows, "premiere"), options)
    );
  }

  if (format === "all" || format === "davinci") {
    writes.push(
      writeTextFile(path.join(timelineFolder, "davinci_timeline.csv"), timelineRowsToCsv(rows, "davinci"), options)
    );
  }

  if (format === "all" || format === "capcut") {
    writes.push(
      writeTextFile(path.join(timelineFolder, "capcut_timeline.csv"), timelineRowsToCsv(rows, "capcut"), options),
      writeTextFile(
        path.join(project.paths.outputFolder, "06_edit_pack", "capcut_assembly_guide.md"),
        capCutAssemblyGuide(project.config.project_name),
        options
      )
    );
  }

  if (format === "all" || format === "fcpxml") {
    writes.push(
      writeTextFile(path.join(timelineFolder, "timeline.fcpxml"), timelineRowsToFcpxml(rows, project.config.project_name), options)
    );
  }

  const results = await Promise.all(writes);

  return `Timeline export complete.

Created:
${listCreated(results, project.root).join("\n") || "- none"}

Skipped existing:
${listSkipped(results, project.root).join("\n") || "- none"}

Review:
${displayPath(project.root, timelineFolder)}/`;
}
