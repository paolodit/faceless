import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { createPrompts, createThumbnailPrompts } from "../lib/prompting.js";
import { normalizeImageProvider } from "../lib/providers.js";
import type { Prompt, Scene, ThumbnailPrompt } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

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
  const prompts = createPrompts(scenes, project.styleBible, project.characterBible, provider, project.channelBible);
  const thumbnails = createThumbnailPrompts(
    scenes,
    project.styleBible,
    project.characterBible,
    project.channelBible
  );
  const promptFolder = path.join(project.paths.outputFolder, "03_prompts");
  const editFolder = path.join(project.paths.outputFolder, "06_edit_pack");
  const results = await Promise.all([
    writeJsonFile(path.join(promptFolder, "prompts.json"), prompts, options),
    writeTextFile(path.join(promptFolder, "prompts.md"), promptsMarkdown(prompts), options),
    writeJsonFile(path.join(promptFolder, "thumbnail_prompts.json"), thumbnails, options),
    writeTextFile(path.join(promptFolder, "thumbnail_prompts.md"), thumbnailPromptsMarkdown(thumbnails), options),
    writeTextFile(path.join(editFolder, "storyboard.md"), storyboardMarkdown(scenes, prompts), options)
  ]);

  const created = listCreated(results, project.root);
  const skipped = listSkipped(results, project.root);

  return `Generated image prompts.

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next step:
video-pack preview --project ${displayPath(process.cwd(), project.root) || "."} --count ${
    project.config.generation.preview_scenes
  }`;
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

Image file:

${prompt?.image_filename ?? "(not generated)"}

Prompt:

${prompt?.prompt ?? "(not generated)"}
`;
  });

  return `# Storyboard

${sections.join("\n")}`;
}
