import path from "node:path";
import fs from "fs-extra";
import { displayPath, type WriteResult } from "../lib/files.js";
import { syncApprovedSceneAssets, syncSceneAssetPacks } from "../lib/scene-assets.js";
import type { ImageApproval, Prompt, Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { inspectProjectWorkflowFreshness } from "../lib/workflow-freshness.js";

export async function sceneAssetsCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  if (!(await inspectProjectWorkflowFreshness(project)).prompts) {
    throw new Error(`The prompt pack is stale because a scene, bible or project setting changed.

Run:
video-pack next --project ${projectPath}`);
  }
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");
  const approvalsPath = path.join(project.paths.outputFolder, "04_images", "approvals.json");

  if (!(await fs.pathExists(promptsPath))) {
    throw new Error(`Could not find prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  const scenes = (await fs.pathExists(scenesPath)) ? ((await fs.readJson(scenesPath)) as Scene[]) : [];
  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const approvals = (await fs.pathExists(approvalsPath))
    ? ((await fs.readJson(approvalsPath)) as ImageApproval[])
    : [];
  const sceneResults = await syncSceneAssetPacks({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    scenes,
    prompts,
    force: options.force
  });
  const approvalResults = await syncApprovedSceneAssets({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    approvals,
    force: options.force
  });
  const results = [...sceneResults, ...approvalResults];
  const summary = summarizeResults(results);

  return `Scene asset folders updated.

Scene folders:
- ${prompts.length} expected

Files:
- created or updated: ${summary.created}
- skipped existing: ${summary.skipped}

Review:
${displayPath(project.root, path.join(project.paths.outputFolder, "04_images", "scenes"))}/

Next useful commands:
video-pack upscale-images --project ${displayPath(process.cwd(), project.root) || "."}
video-pack generate-scene-videos --project ${displayPath(process.cwd(), project.root) || "."}`;
}

function summarizeResults(results: WriteResult[]): { created: number; skipped: number } {
  return {
    created: results.filter((result) => result.written).length,
    skipped: results.filter((result) => !result.written).length
  };
}
