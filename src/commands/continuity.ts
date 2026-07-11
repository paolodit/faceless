import path from "node:path";
import fs from "fs-extra";
import { writeContinuityReview } from "../lib/continuity.js";
import { displayPath, listCreated, listSkipped } from "../lib/files.js";
import type { Prompt, Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function continuityProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  if (project.config.pipeline !== "narrated-visual-story") {
    return `Continuity review is a narrated visual-story checkpoint.

This project is ${project.config.pipeline}, so no story-world review stage is required.`;
  }

  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  if (!(await fs.pathExists(scenesPath))) {
    throw new Error(`Could not find scenes.json.

Run:
video-pack prepare --project ${projectPath}`);
  }

  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");
  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const prompts = (await fs.pathExists(promptsPath)) ? ((await fs.readJson(promptsPath)) as Prompt[]) : [];
  const result = await writeContinuityReview({
    projectName: project.config.project_name,
    outputFolder: project.paths.outputFolder,
    scenes,
    continuity: project.continuity,
    continuityFile: project.paths.continuityFile ? displayPath(project.root, project.paths.continuityFile) : undefined,
    prompts,
    force: options.force
  });

  return `Continuity review generated.

Status: ${result.review.status}
Scenes needing attention: ${result.review.summary.scenes_needing_attention}
Average score: ${result.review.summary.average_score}/100
Prompts missing anchors: ${result.review.summary.prompts_missing_anchors}

Created:
${listCreated(result.writes, project.root).join("\n") || "- none"}

Skipped existing:
${listSkipped(result.writes, project.root).join("\n") || "- none"}

Review:
${displayPath(project.root, project.paths.outputFolder)}/02_scenes/continuity_review.html`;
}
