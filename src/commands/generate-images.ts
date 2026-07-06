import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { generateImageWithMagnific } from "../lib/magnific.js";
import { writeMockPng } from "../lib/mock-png.js";
import { generateImageWithOpenAI } from "../lib/openai.js";
import { normalizeImageProvider } from "../lib/providers.js";
import { syncSceneAssetPacks } from "../lib/scene-assets.js";
import { selectPrompts } from "../lib/selection.js";
import type { Prompt, Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { promptsMarkdown } from "./prompts.js";

export async function generateImagesCommand(
  projectPath: string,
  options: { force?: boolean; resume?: boolean; scene?: string; fromScene?: string; provider?: string } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");

  if (!(await fs.pathExists(promptsPath))) {
    throw new Error(`Could not find prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const { selected, fromScene, sceneSelection, filterDescription } = selectPrompts(prompts, options);
  const provider = normalizeImageProvider(options.provider ?? project.config.generation.image_provider);
  const fullFolder = path.join(project.paths.outputFolder, "04_images", "full");
  const scenes = await loadScenes(project.paths.outputFolder);

  if (selected.length === 0) {
    throw new Error(`No prompts matched ${filterDescription}.`);
  }

  if (provider === "manual" || provider === "external") {
    const results = await Promise.all([
      writeJsonFile(path.join(fullFolder, "full_prompts.json"), selected, options),
      writeTextFile(path.join(fullFolder, "full_prompts.md"), promptsMarkdown(selected), options)
    ]);
    const sceneResults = await syncSceneAssetPacks({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      scenes,
      prompts: selected,
      force: options.force
    });
    const allResults = [...results, ...sceneResults];

    return generationMessage(project.root, fullFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  if (provider === "mock") {
    const writeResults = await Promise.all(
      selected.map(async (prompt) => {
        const written = await writeMockPng({
          filePath: path.join(fullFolder, prompt.image_filename),
          aspectRatio: project.config.aspect_ratio,
          sceneNumber: prompt.scene_number,
          start: prompt.image_filename.match(/_(\d{2}-\d{2})_to_/)?.[1]?.replace("-", ":") ?? "00:00",
          end: prompt.image_filename.match(/_to_(\d{2}-\d{2})\.png$/)?.[1]?.replace("-", ":") ?? "00:00",
          force: options.force
        });
        return { filePath: path.join(fullFolder, prompt.image_filename), written };
      })
    );
    const sceneResults = await syncSceneAssetPacks({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      scenes,
      prompts: selected,
      force: options.force
    });
    const allResults = [...writeResults, ...sceneResults];

    return generationMessage(project.root, fullFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  if (provider === "openai") {
    const writeResults = [];
    for (const prompt of selected) {
      const result = await generateImageWithOpenAI({
        prompt: prompt.prompt,
        outputPath: path.join(fullFolder, prompt.image_filename),
        config: project.config,
        force: options.force
      });
      writeResults.push({ filePath: result.filePath, written: result.written });
    }
    await writeJsonFile(
      path.join(fullFolder, "openai_generation_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        from_scene: fromScene,
        scene_filter: sceneSelection ? [...sceneSelection] : undefined,
        count: selected.length,
        files: writeResults.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        })),
        model: project.config.providers.openai.image_model,
        size: project.config.providers.openai.image_size,
        quality: project.config.providers.openai.image_quality,
        output_format: project.config.providers.openai.image_output_format
      },
      { force: true }
    );
    const sceneResults = await syncSceneAssetPacks({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      scenes,
      prompts: selected,
      force: options.force
    });
    const allResults = [...writeResults, ...sceneResults];

    return generationMessage(project.root, fullFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  if (provider === "magnific") {
    const writeResults = [];
    for (const prompt of selected) {
      const result = await generateImageWithMagnific({
        prompt: prompt.prompt,
        outputPath: path.join(fullFolder, prompt.image_filename),
        config: project.config,
        force: options.force
      });
      writeResults.push({ filePath: result.filePath, written: result.written });
    }
    await writeJsonFile(
      path.join(fullFolder, "magnific_generation_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        from_scene: fromScene,
        scene_filter: sceneSelection ? [...sceneSelection] : undefined,
        count: selected.length,
        files: writeResults.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        })),
        model: project.config.providers.magnific.image_model,
        resolution: project.config.providers.magnific.image_resolution,
        aspect_ratio: project.config.aspect_ratio
      },
      { force: true }
    );
    const sceneResults = await syncSceneAssetPacks({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      scenes,
      prompts: selected,
      force: options.force
    });
    const allResults = [...writeResults, ...sceneResults];

    return generationMessage(project.root, fullFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  throw new Error(`Provider "${provider}" is scaffolded but not implemented yet.

Use:
video-pack generate-images --project ${projectPath} --provider manual
video-pack generate-images --project ${projectPath} --provider external
video-pack generate-images --project ${projectPath} --provider mock
video-pack generate-images --project ${projectPath} --provider openai
video-pack generate-images --project ${projectPath} --provider magnific`);
}

async function loadScenes(outputFolder: string): Promise<Scene[]> {
  const scenesPath = path.join(outputFolder, "02_scenes", "scenes.json");
  return (await fs.pathExists(scenesPath)) ? ((await fs.readJson(scenesPath)) as Scene[]) : [];
}

function generationMessage(
  projectRoot: string,
  fullFolder: string,
  created: string[],
  skipped: string[]
): string {
  return `Image generation step complete.

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Review:
${displayPath(projectRoot, fullFolder)}/
${displayPath(projectRoot, path.join(path.dirname(fullFolder), "scenes"))}/

Next steps:
1. If you used manual/external mode, save final images into output/04_images/full/ using the suggested filenames.
2. video-pack scene-assets --project ${displayPath(process.cwd(), projectRoot) || "."}
3. video-pack approve-images --project ${displayPath(process.cwd(), projectRoot) || "."}`;
}
