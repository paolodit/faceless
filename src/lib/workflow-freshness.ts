import path from "node:path";
import fs from "fs-extra";
import type { Prompt, SceneProductionPlan } from "./schemas.js";
import type { LoadedProject } from "./validation.js";

export interface ProjectWorkflowFreshness {
  plan: boolean;
  proposal: boolean;
  scenes: boolean;
  visualEvents: boolean;
  prompts: boolean;
  preview: boolean;
  package: boolean;
}

export async function inspectProjectWorkflowFreshness(
  project: LoadedProject
): Promise<ProjectWorkflowFreshness> {
  const output = project.paths.outputFolder;
  const routeReview = path.join(output, "00_analysis", "route_review.json");
  const costEstimate = path.join(output, "cost_estimate.json");
  const proposal = path.join(output, "00_proposal", "proposal.md");
  const scenes = path.join(output, "02_scenes", "scenes.json");
  const visualEvents = path.join(output, "02_scenes", "visual_events.json");
  const sceneProduction = path.join(output, "02_scenes", "scene_production.json");
  const overlayText = path.join(output, "06_edit_pack", "overlay_text.csv");
  const prompts = path.join(output, "03_prompts", "prompts.json");
  const thumbnailPrompts = path.join(output, "03_prompts", "thumbnail_prompts.json");
  const approvals = path.join(output, "04_images", "approvals.json");
  const nextSteps = path.join(output, "README_NEXT_STEPS.md");
  const editManifest = path.join(output, "06_edit_pack", "edit_manifest.json");
  const copyPack = path.join(output, "07_publish", "copy_pack.json");

  const planCurrent = await outputsAreCurrent(
    [costEstimate],
    [routeReview, project.paths.projectFile]
  );
  const proposalCurrent =
    planCurrent && (await outputsAreCurrent([proposal], [costEstimate, project.paths.projectFile]));
  const sceneInputs = compactPaths([
    project.paths.projectFile,
    project.paths.scriptFile,
    project.paths.audioFile,
    project.paths.characterBible
  ]);
  const scenesCurrent = await outputsAreCurrent([scenes], sceneInputs);
  const assetInputs = await filesUnder(project.paths.assetsFolder);
  const visualInputs = [scenes, project.paths.projectFile, ...assetInputs];
  const visualEventsCurrent =
    scenesCurrent &&
    (await outputsAreCurrent([visualEvents, sceneProduction, overlayText], visualInputs));
  const promptInputs = compactPaths([
    scenes,
    project.paths.projectFile,
    project.paths.styleBible,
    project.paths.characterBible,
    project.paths.channelBible,
    project.paths.continuityFile
  ]);
  const promptsCurrent =
    scenesCurrent &&
    (await outputsAreCurrent([prompts, thumbnailPrompts], promptInputs)) &&
    (await promptsMatchProduction(prompts, sceneProduction, visualEvents));
  const previewCurrent =
    promptsCurrent &&
    (await folderHasCurrentFile(path.join(output, "04_images", "preview"), [prompts]));
  const packageCurrent =
    promptsCurrent &&
    (await outputsAreCurrent(
      [nextSteps, editManifest, copyPack],
      compactPaths([scenes, prompts, approvals])
    ));

  return {
    plan: planCurrent,
    proposal: proposalCurrent,
    scenes: scenesCurrent,
    visualEvents: visualEventsCurrent,
    prompts: promptsCurrent,
    preview: previewCurrent,
    package: packageCurrent
  };
}

async function promptsMatchProduction(
  promptsPath: string,
  sceneProductionPath: string,
  visualEventsPath: string
): Promise<boolean> {
  if (!(await fs.pathExists(promptsPath))) {
    return false;
  }

  let plans: SceneProductionPlan[] = [];
  if (await fs.pathExists(sceneProductionPath)) {
    plans = (await fs.readJson(sceneProductionPath)) as SceneProductionPlan[];
  } else if (await fs.pathExists(visualEventsPath)) {
    const events = (await fs.readJson(visualEventsPath)) as Array<{ production?: SceneProductionPlan }>;
    plans = events.map((event) => event.production).filter(Boolean) as SceneProductionPlan[];
  } else {
    return true;
  }

  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const planByScene = new Map(plans.map((plan) => [plan.scene_number, plan]));
  return (
    prompts.length === plans.length &&
    prompts.every((prompt) => {
      const plan = planByScene.get(prompt.scene_number);
      return Boolean(plan) && JSON.stringify(prompt.scene_production) === JSON.stringify(plan);
    })
  );
}

export async function outputIsCurrent(outputPath: string, inputPaths: string[]): Promise<boolean> {
  return outputsAreCurrent([outputPath], inputPaths);
}

export async function outputsAreCurrent(outputPaths: string[], inputPaths: string[]): Promise<boolean> {
  if (outputPaths.length === 0 || !(await allPathsExist(outputPaths))) {
    return false;
  }

  const existingInputs = await existingPaths(inputPaths);
  if (existingInputs.length !== inputPaths.length) {
    return false;
  }

  const [outputStats, inputStats] = await Promise.all([
    Promise.all(outputPaths.map((file) => fs.stat(file))),
    Promise.all(existingInputs.map((file) => fs.stat(file)))
  ]);
  const oldestOutput = Math.min(...outputStats.map((stat) => stat.mtimeMs));
  const newestInput = inputStats.length > 0 ? Math.max(...inputStats.map((stat) => stat.mtimeMs)) : 0;
  return oldestOutput >= newestInput;
}

export async function fileIsAtLeastAsNewAs(filePath: string, inputPath: string): Promise<boolean> {
  if (!(await fs.pathExists(filePath)) || !(await fs.pathExists(inputPath))) {
    return false;
  }

  const [file, input] = await Promise.all([fs.stat(filePath), fs.stat(inputPath)]);
  return file.mtimeMs >= input.mtimeMs;
}

async function folderHasCurrentFile(folder: string, inputPaths: string[]): Promise<boolean> {
  const files = await filesUnder(folder);
  if (files.length === 0) {
    return false;
  }

  const existingInputs = await existingPaths(inputPaths);
  if (existingInputs.length !== inputPaths.length) {
    return false;
  }

  const inputStats = await Promise.all(existingInputs.map((file) => fs.stat(file)));
  const newestInput = inputStats.length > 0 ? Math.max(...inputStats.map((stat) => stat.mtimeMs)) : 0;
  const fileStats = await Promise.all(files.map((file) => fs.stat(file)));
  return fileStats.some((stat) => stat.mtimeMs >= newestInput);
}

async function filesUnder(folder: string): Promise<string[]> {
  if (!(await fs.pathExists(folder))) {
    return [];
  }

  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(entryPath)));
    } else if (entry.isFile() && entry.name !== ".gitkeep") {
      files.push(entryPath);
    }
  }
  return files;
}

async function existingPaths(paths: string[]): Promise<string[]> {
  const checks = await Promise.all(paths.map(async (file) => ({ file, exists: await fs.pathExists(file) })));
  return checks.filter((check) => check.exists).map((check) => check.file);
}

async function allPathsExist(paths: string[]): Promise<boolean> {
  const checks = await Promise.all(paths.map((file) => fs.pathExists(file)));
  return checks.every(Boolean);
}

function compactPaths(paths: Array<string | undefined>): string[] {
  return paths.filter((file): file is string => Boolean(file));
}
