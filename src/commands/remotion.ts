import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped } from "../lib/files.js";
import { writeRemotionProject } from "../lib/remotion.js";
import type { Prompt, Scene, VisualEventScenePlan } from "../lib/schemas.js";
import { flattenVisualEvents, createVisualEventScenePlans } from "../lib/visual-events.js";
import { loadValidProject } from "../lib/validation.js";

export async function remotionProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");

  if (!(await fs.pathExists(scenesPath)) || !(await fs.pathExists(promptsPath))) {
    throw new Error(`Remotion output needs scenes and prompts.

Run:
video-pack prepare --project ${projectPath}
video-pack prompts --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const plans = await loadVisualEventPlans(project.paths.outputFolder, project.config, scenes);
  const events = flattenVisualEvents(plans);
  const result = await writeRemotionProject({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    config: project.config,
    profile: project.profile,
    scenes,
    prompts,
    plans,
    events,
    audioFile: project.paths.audioFile,
    force: options.force
  });

  return `Remotion output complete.

Created:
${listCreated(result.writes, project.root).join("\n") || "- none"}

Skipped existing:
${listSkipped(result.writes, project.root).join("\n") || "- none"}

Copied assets: ${result.copiedAssets}

Preview:
cd ${displayPath(project.root, result.remotionFolder)}
npm install
npm run dev

Render:
npm run render`;
}

async function loadVisualEventPlans(
  outputFolder: string,
  config: Parameters<typeof createVisualEventScenePlans>[0],
  scenes: Scene[]
): Promise<VisualEventScenePlan[]> {
  const visualEventsPath = path.join(outputFolder, "02_scenes", "visual_events.json");

  if (await fs.pathExists(visualEventsPath)) {
    return (await fs.readJson(visualEventsPath)) as VisualEventScenePlan[];
  }

  return createVisualEventScenePlans(config, scenes);
}
