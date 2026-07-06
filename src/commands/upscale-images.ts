import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile, type WriteResult } from "../lib/files.js";
import { upscaleImageWithMagnific } from "../lib/magnific.js";
import {
  findSceneImageSource,
  sceneAssetPaths,
  sceneFolderName,
  syncSceneAssetPacks
} from "../lib/scene-assets.js";
import { selectPrompts } from "../lib/selection.js";
import type { Prompt, Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

type UpscaleProvider = "manual" | "magnific";
type UpscaleFlavor = "sublime" | "photo" | "photo_denoiser";

export async function upscaleImagesCommand(
  projectPath: string,
  options: {
    force?: boolean;
    resume?: boolean;
    scene?: string;
    fromScene?: string;
    provider?: string;
    scale?: string;
    flavor?: string;
  } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");

  if (!(await fs.pathExists(promptsPath))) {
    throw new Error(`Could not find prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const scenes = (await fs.pathExists(scenesPath)) ? ((await fs.readJson(scenesPath)) as Scene[]) : [];
  const { selected, fromScene, sceneSelection, filterDescription } = selectPrompts(prompts, options);
  const provider = normalizeUpscaleProvider(options.provider ?? "manual");
  const scaleFactor = parseScaleFactor(options.scale, project.config.providers.magnific.upscale_scale_factor);
  const flavor = parseFlavor(options.flavor, project.config.providers.magnific.upscale_flavor);

  if (selected.length === 0) {
    throw new Error(`No prompts matched ${filterDescription}.`);
  }

  const scenePackResults = await syncSceneAssetPacks({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    scenes,
    prompts: selected,
    force: options.force
  });

  if (provider === "manual") {
    const requestResults = await writeManualUpscaleRequests({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      prompts: selected,
      force: options.force,
      scaleFactor,
      flavor
    });
    const allResults = [...scenePackResults, ...requestResults];

    return upscaleMessage(project.root, provider, allResults);
  }

  const writeResults: WriteResult[] = [];
  for (const prompt of selected) {
    const source = await findSceneImageSource({
      outputFolder: project.paths.outputFolder,
      prompt,
      preferUpscaled: false
    });

    if (!source) {
      throw new Error(`No source image found for ${sceneFolderName(prompt.scene_number)}.

Run:
video-pack generate-images --project ${projectPath}

Or place an image at:
${displayPath(project.root, sceneAssetPaths(project.paths.outputFolder, prompt.scene_number).image)}`);
    }

    const paths = sceneAssetPaths(project.paths.outputFolder, prompt.scene_number);
    const result = await upscaleImageWithMagnific({
      inputPath: source.filePath,
      outputPath: paths.upscaledImage,
      config: project.config,
      force: options.force,
      scaleFactor,
      flavor
    });
    writeResults.push({ filePath: result.filePath, written: result.written });
    writeResults.push(
      await writeJsonFile(
        path.join(paths.upscaledFolder, "magnific_upscale.json"),
        {
          provider,
          generated_at: new Date().toISOString(),
          source: displayPath(project.root, source.filePath),
          source_kind: source.source,
          output: displayPath(project.root, result.filePath),
          scale_factor: scaleFactor,
          flavor,
          task_id: result.taskId,
          status: result.status,
          generated_url: result.generatedUrl
        },
        { force: true }
      )
    );
  }

  writeResults.push(
    await writeJsonFile(
      path.join(project.paths.outputFolder, "04_images", "magnific_upscale_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        from_scene: fromScene,
        scene_filter: sceneSelection ? [...sceneSelection] : undefined,
        count: selected.length,
        scale_factor: scaleFactor,
        flavor,
        files: writeResults.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        }))
      },
      { force: true }
    )
  );

  return upscaleMessage(project.root, provider, [...scenePackResults, ...writeResults]);
}

function normalizeUpscaleProvider(value: string): UpscaleProvider {
  if (value === "manual" || value === "magnific") {
    return value;
  }

  throw new Error(`Unknown upscale provider: "${value}"

Valid providers:
- manual
- magnific`);
}

function parseScaleFactor(raw: string | undefined, fallback: number): number {
  const value = raw ? Number(raw) : fallback;

  if (!Number.isInteger(value) || value < 2 || value > 16) {
    throw new Error("Use --scale with an integer from 2 to 16.");
  }

  return value;
}

function parseFlavor(raw: string | undefined, fallback: UpscaleFlavor): UpscaleFlavor {
  const value = raw ?? fallback;

  if (value === "sublime" || value === "photo" || value === "photo_denoiser") {
    return value;
  }

  throw new Error("Use --flavor sublime, photo, or photo_denoiser.");
}

async function writeManualUpscaleRequests(options: {
  projectRoot: string;
  outputFolder: string;
  prompts: Prompt[];
  force?: boolean;
  scaleFactor: number;
  flavor: UpscaleFlavor;
}): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  const requests = [];

  for (const prompt of options.prompts) {
    const paths = sceneAssetPaths(options.outputFolder, prompt.scene_number);
    const source = await findSceneImageSource({
      outputFolder: options.outputFolder,
      prompt,
      preferUpscaled: false
    });
    const request = {
      scene_number: prompt.scene_number,
      source_image: source ? displayPath(options.projectRoot, source.filePath) : "",
      source_kind: source?.source ?? "",
      target_file: displayPath(options.projectRoot, paths.upscaledImage),
      provider: "manual",
      recommended_provider: "magnific",
      scale_factor: options.scaleFactor,
      flavor: options.flavor,
      prompt: prompt.prompt,
      negative_prompt: prompt.negative_prompt
    };

    requests.push(request);
    results.push(
      await writeJsonFile(path.join(paths.upscaledFolder, "request.json"), request, { force: true }),
      await writeTextFile(path.join(paths.upscaledFolder, "request.md"), upscaleRequestMarkdown(request), {
        force: options.force
      })
    );
  }

  results.push(
    await writeJsonFile(path.join(options.outputFolder, "04_images", "upscale_requests.json"), requests, {
      force: true
    }),
    await writeTextFile(path.join(options.outputFolder, "04_images", "upscale_requests.md"), upscaleRequestsMarkdown(requests), {
      force: true
    })
  );

  return results;
}

function upscaleRequestsMarkdown(requests: Array<Record<string, unknown>>): string {
  return `# Upscale Requests

${requests.map(upscaleRequestMarkdown).join("\n")}`;
}

function upscaleRequestMarkdown(request: Record<string, unknown>): string {
  return `## Scene ${request.scene_number}

Source image: \`${request.source_image || "(missing - generate or add image first)"}\`

Target file: \`${request.target_file}\`

Recommended provider: \`${request.recommended_provider}\`

Settings:
- scale factor: ${request.scale_factor}
- flavor: ${request.flavor}

Prompt:

${request.prompt}

Negative prompt:

${request.negative_prompt || "(none)"}
`;
}

function upscaleMessage(projectRoot: string, provider: UpscaleProvider, results: WriteResult[]): string {
  const reviewFiles =
    provider === "manual"
      ? ["output/04_images/scenes/", "output/04_images/upscale_requests.md"]
      : ["output/04_images/scenes/", "output/04_images/magnific_upscale_report.json"];

  return `Image upscale step complete.

Provider: ${provider}

Created:
${listCreated(results, projectRoot).join("\n") || "- none"}

Skipped existing:
${listSkipped(results, projectRoot).join("\n") || "- none"}

Review:
${reviewFiles.map((file) => `- ${file}`).join("\n")}

Next step:
video-pack generate-scene-videos --project ${displayPath(process.cwd(), projectRoot) || "."}`;
}
