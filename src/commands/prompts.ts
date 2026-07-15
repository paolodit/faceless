import path from "node:path";
import fs from "fs-extra";
import { writeContinuityReview } from "../lib/continuity.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { createPrompts, createThumbnailPrompts } from "../lib/prompting.js";
import { normalizeImageProvider } from "../lib/providers.js";
import type { Prompt, ProjectConfig, Scene, SceneProductionPlan, ThumbnailPrompt } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { createVisualEventScenePlans } from "../lib/visual-events.js";
import { outputIsCurrent } from "../lib/workflow-freshness.js";

export async function promptsProjectCommand(
  projectPath: string,
  options: { force?: boolean; provider?: string } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");

  if (!(await fs.pathExists(scenesPath))) {
    throw new Error(`Could not find scenes.json.

Run:
video-pack prepare --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const provider = normalizeImageProvider(options.provider ?? project.config.generation.image_provider);
  const sceneProductionPlans = await loadSceneProductionPlans(
    project.paths.outputFolder,
    project.paths.projectFile,
    project.config,
    scenes
  );
  const prompts = createPrompts(
    scenes,
    project.styleBible,
    project.characterBible,
    provider,
    project.channelBible,
    sceneProductionPlans,
    project.continuity
  );
  const thumbnails = createThumbnailPrompts(
    scenes,
    project.styleBible,
    project.characterBible,
    project.channelBible,
    project.continuity
  );
  const promptFolder = path.join(project.paths.outputFolder, "03_prompts");
  const editFolder = path.join(project.paths.outputFolder, "06_edit_pack");
  const continuityReviewResult =
    project.config.pipeline === "narrated-visual-story"
      ? await writeContinuityReview({
          projectName: project.config.project_name,
          outputFolder: project.paths.outputFolder,
          scenes,
          continuity: project.continuity,
          continuityFile: project.paths.continuityFile ? displayPath(project.root, project.paths.continuityFile) : undefined,
          prompts,
          force: true
        })
      : undefined;
  const results = [
    ...(continuityReviewResult?.writes ?? []),
    ...(await Promise.all([
    writeJsonFile(path.join(promptFolder, "prompts.json"), prompts, options),
    writeTextFile(path.join(promptFolder, "prompts.md"), promptsMarkdown(prompts), options),
    writeJsonFile(path.join(promptFolder, "thumbnail_prompts.json"), thumbnails, options),
    writeTextFile(path.join(promptFolder, "thumbnail_prompts.md"), thumbnailPromptsMarkdown(thumbnails), options),
    writeTextFile(path.join(editFolder, "storyboard.md"), storyboardMarkdown(scenes, prompts), options)
    ]))
  ];

  const created = listCreated(results, project.root);
  const skipped = listSkipped(results, project.root);

  return `Generated image prompts.

Scene production layouts:
${summarizeLayouts(sceneProductionPlans)}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next step:
video-pack preview --project ${displayPath(process.cwd(), project.root) || "."} --count ${
    project.config.generation.preview_scenes
  } --force`;
}

async function loadSceneProductionPlans(
  outputFolder: string,
  projectFile: string,
  config: ProjectConfig,
  scenes: Scene[]
): Promise<SceneProductionPlan[]> {
  const scenesPath = path.join(outputFolder, "02_scenes", "scenes.json");
  const sceneProductionPath = path.join(outputFolder, "02_scenes", "scene_production.json");
  if (await outputIsCurrent(sceneProductionPath, [scenesPath, projectFile])) {
    return (await fs.readJson(sceneProductionPath)) as SceneProductionPlan[];
  }

  const visualEventsPath = path.join(outputFolder, "02_scenes", "visual_events.json");
  if (await outputIsCurrent(visualEventsPath, [scenesPath, projectFile])) {
    const plans = (await fs.readJson(visualEventsPath)) as Array<{ production?: SceneProductionPlan }>;
    const production = plans.map((plan) => plan.production).filter(Boolean) as SceneProductionPlan[];
    if (production.length > 0) {
      return production;
    }
  }

  return createVisualEventScenePlans(config, scenes).map((plan) => plan.production);
}

function summarizeLayouts(plans: SceneProductionPlan[]): string {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    counts.set(plan.layout_mode, (counts.get(plan.layout_mode) ?? 0) + 1);
  }

  return [...counts.entries()].map(([layout, count]) => `- ${layout}: ${count}`).join("\n") || "- none";
}

export function thumbnailPromptsMarkdown(prompts: ThumbnailPrompt[]): string {
  const sections = prompts.map(
    (prompt) => `## ${prompt.title}

Image file: \`${prompt.image_filename}\`

Rationale:

${prompt.rationale}

Prompt:

${prompt.prompt}

Negative prompt:

${prompt.negative_prompt || "(none)"}
`
  );

  return `# Thumbnail Prompts

${sections.join("\n")}`;
}

export function promptsMarkdown(prompts: Prompt[]): string {
  const sections = prompts.map(
    (prompt) => `## Scene ${prompt.scene_number}

Image file: \`${prompt.image_filename}\`

Provider: \`${prompt.provider}\`

Layout: \`${prompt.scene_production?.layout_mode ?? "unspecified"}\`

Continuity: \`${prompt.scene_production?.continuity_group ?? "none"}\`

Prompt:

${prompt.prompt}

Negative prompt:

${prompt.negative_prompt || "(none)"}
`
  );

  return `# Image Prompts

${sections.join("\n")}`;
}

function storyboardMarkdown(scenes: Scene[], prompts: Prompt[]): string {
  const promptByScene = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));
  const sections = scenes.map((scene) => {
    const prompt = promptByScene.get(scene.scene_number);

    return `## Scene ${scene.scene_number}

Time: ${scene.start} to ${scene.end}

Transcript:

${scene.transcript}

Visual goal:

${scene.visual_goal}

Production layout:

${prompt?.scene_production?.layout_mode ?? "(not generated)"}

Layering:

${prompt?.scene_production?.layering ?? "(not generated)"}

Image file:

${prompt?.image_filename ?? "(not generated)"}

Prompt:

${prompt?.prompt ?? "(not generated)"}
`;
  });

  return `# Storyboard

${sections.join("\n")}`;
}
