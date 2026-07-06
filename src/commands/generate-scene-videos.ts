import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile, type WriteResult } from "../lib/files.js";
import { generateSceneVideoWithMagnific, magnificAspectRatio } from "../lib/magnific.js";
import { normalizeSceneVideoProvider } from "../lib/providers.js";
import {
  findSceneImageSource,
  sceneAssetPaths,
  sceneFolderName,
  syncSceneAssetPacks
} from "../lib/scene-assets.js";
import { selectPrompts } from "../lib/selection.js";
import type { Prompt, Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function generateSceneVideosCommand(
  projectPath: string,
  options: {
    force?: boolean;
    resume?: boolean;
    scene?: string;
    fromScene?: string;
    provider?: string;
    duration?: string;
    audio?: boolean;
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
  const sceneByNumber = new Map(scenes.map((scene) => [scene.scene_number, scene]));
  const { selected, fromScene, sceneSelection, filterDescription } = selectPrompts(prompts, options);
  const provider = normalizeSceneVideoProvider(options.provider ?? project.config.generation.scene_video_provider);
  const durationSeconds = parseDuration(
    options.duration,
    project.config.providers.magnific.video_duration_seconds || project.config.generation.scene_video_duration_seconds,
    provider
  );

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

  if (provider === "manual" || provider === "higgsfield") {
    const requestResults = await writeSceneVideoRequests({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      prompts: selected,
      sceneByNumber,
      provider,
      durationSeconds,
      force: options.force,
      higgsfieldMcpUrl: project.config.providers.higgsfield.mcp_url,
      higgsfieldCliCommand: project.config.providers.higgsfield.cli_command
    });

    return sceneVideoMessage(project.root, provider, [...scenePackResults, ...requestResults]);
  }

  const writeResults: WriteResult[] = [];
  for (const prompt of selected) {
    const paths = sceneAssetPaths(project.paths.outputFolder, prompt.scene_number);
    const source = await findSceneImageSource({
      outputFolder: project.paths.outputFolder,
      prompt,
      preferUpscaled: project.config.generation.prefer_upscaled_images_for_video
    });
    const scene = sceneByNumber.get(prompt.scene_number);
    const result = await generateSceneVideoWithMagnific({
      prompt: sceneVideoPrompt(prompt, scene),
      negativePrompt: prompt.negative_prompt,
      inputImagePath: source?.filePath,
      outputPath: paths.videoClip,
      config: project.config,
      force: options.force,
      durationSeconds,
      generateAudio: options.audio ?? project.config.providers.magnific.video_generate_audio
    });

    writeResults.push({ filePath: result.filePath, written: result.written });
    writeResults.push(
      await writeJsonFile(
        path.join(paths.videoFolder, "magnific_video.json"),
        {
          provider,
          generated_at: new Date().toISOString(),
          source: source ? displayPath(project.root, source.filePath) : "",
          source_kind: source?.source ?? "text-only",
          output: displayPath(project.root, result.filePath),
          duration_seconds: durationSeconds,
          model: project.config.providers.magnific.video_model,
          aspect_ratio: magnificAspectRatio(project.config.aspect_ratio),
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
      path.join(project.paths.outputFolder, "04_images", "scene_video_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        from_scene: fromScene,
        scene_filter: sceneSelection ? [...sceneSelection] : undefined,
        count: selected.length,
        duration_seconds: durationSeconds,
        model: project.config.providers.magnific.video_model,
        files: writeResults.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        }))
      },
      { force: true }
    )
  );

  return sceneVideoMessage(project.root, provider, [...scenePackResults, ...writeResults]);
}

function parseDuration(raw: string | undefined, fallback: number, provider: string): number {
  const value = raw ? Number(raw) : fallback;

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Use --duration with a positive whole number of seconds.");
  }

  if (provider === "magnific" && value !== 5 && value !== 10) {
    throw new Error("Magnific scene videos currently support --duration 5 or --duration 10.");
  }

  return value;
}

async function writeSceneVideoRequests(options: {
  projectRoot: string;
  outputFolder: string;
  prompts: Prompt[];
  sceneByNumber: Map<number, Scene>;
  provider: "manual" | "higgsfield";
  durationSeconds: number;
  force?: boolean;
  higgsfieldMcpUrl: string;
  higgsfieldCliCommand: string;
}): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  const requests = [];

  for (const prompt of options.prompts) {
    const paths = sceneAssetPaths(options.outputFolder, prompt.scene_number);
    const source = await findSceneImageSource({
      outputFolder: options.outputFolder,
      prompt,
      preferUpscaled: true
    });
    const scene = options.sceneByNumber.get(prompt.scene_number);
    const request = {
      scene_number: prompt.scene_number,
      scene_folder: displayPath(options.projectRoot, paths.folder),
      source_image: source ? displayPath(options.projectRoot, source.filePath) : "",
      source_kind: source?.source ?? "",
      target_file: displayPath(options.projectRoot, paths.videoClip),
      provider: options.provider,
      duration_seconds: options.durationSeconds,
      higgsfield_mcp_url: options.provider === "higgsfield" ? options.higgsfieldMcpUrl : "",
      higgsfield_cli_command: options.provider === "higgsfield" ? options.higgsfieldCliCommand : "",
      prompt: sceneVideoPrompt(prompt, scene),
      negative_prompt: prompt.negative_prompt
    };

    requests.push(request);
    results.push(
      await writeJsonFile(path.join(paths.videoFolder, "request.json"), request, { force: true }),
      await writeTextFile(path.join(paths.videoFolder, "request.md"), sceneVideoRequestMarkdown(request), {
        force: options.force
      })
    );
  }

  results.push(
    await writeJsonFile(path.join(options.outputFolder, "04_images", "scene_video_requests.json"), requests, {
      force: true
    }),
    await writeTextFile(
      path.join(options.outputFolder, "04_images", "scene_video_requests.md"),
      sceneVideoRequestsMarkdown(requests),
      { force: true }
    )
  );

  return results;
}

function sceneVideoPrompt(prompt: Prompt, scene?: Scene): string {
  const sceneContext = scene
    ? `Scene ${scene.scene_number}, ${scene.duration_seconds}s. Visual goal: ${scene.visual_goal}. Narration: ${scene.transcript}.`
    : `Scene ${prompt.scene_number}.`;

  return `${sceneContext} Animate this as a short cinematic scene clip with natural motion, clear subject continuity, smooth camera movement, and no readable text unless it is already part of the source image. Image prompt: ${prompt.prompt}`;
}

function sceneVideoRequestsMarkdown(requests: Array<Record<string, unknown>>): string {
  return `# Scene Video Requests

${requests.map(sceneVideoRequestMarkdown).join("\n")}`;
}

function sceneVideoRequestMarkdown(request: Record<string, unknown>): string {
  const higgsfield = request.provider === "higgsfield"
    ? `
Higgsfield:
- MCP URL: \`${request.higgsfield_mcp_url}\`
- CLI command: \`${request.higgsfield_cli_command}\`
`
    : "";

  return `## ${sceneFolderName(Number(request.scene_number))}

Source image: \`${request.source_image || "(optional text-to-video / add image first)"}\`

Target clip: \`${request.target_file}\`

Provider: \`${request.provider}\`
Duration: ${request.duration_seconds}s
${higgsfield}
Prompt:

${request.prompt}

Negative prompt:

${request.negative_prompt || "(none)"}
`;
}

function sceneVideoMessage(projectRoot: string, provider: string, results: WriteResult[]): string {
  const reviewFiles =
    provider === "magnific"
      ? ["output/04_images/scenes/", "output/04_images/scene_video_report.json"]
      : ["output/04_images/scenes/", "output/04_images/scene_video_requests.md"];

  return `Scene video step complete.

Provider: ${provider}

Created:
${listCreated(results, projectRoot).join("\n") || "- none"}

Skipped existing:
${listSkipped(results, projectRoot).join("\n") || "- none"}

Review:
${reviewFiles.map((file) => `- ${file}`).join("\n")}

Next step:
video-pack remotion --project ${displayPath(process.cwd(), projectRoot) || "."} --force`;
}
