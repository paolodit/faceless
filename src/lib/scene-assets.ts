import path from "node:path";
import fs from "fs-extra";
import { displayPath, writeJsonFile, writeTextFile, type WriteResult } from "./files.js";
import { pad } from "./format.js";
import { sceneProductionMarkdown } from "./scene-production.js";
import type { ImageApproval, Prompt, Scene } from "./schemas.js";

export interface SceneAssetPaths {
  folder: string;
  promptJson: string;
  promptMarkdown: string;
  manifestJson: string;
  sceneProductionJson: string;
  sceneProductionMarkdown: string;
  notesMarkdown: string;
  image: string;
  approvedImage: string;
  variationsFolder: string;
  upscaledFolder: string;
  upscaledImage: string;
  videoFolder: string;
  videoClip: string;
}

export interface SceneAssetCandidate {
  filePath: string;
  kind: "image" | "video";
  source: "scene-video" | "upscaled" | "approved" | "scene-image" | "full";
}

export function sceneFolderName(sceneNumber: number): string {
  return `scene_${pad(sceneNumber, 3)}`;
}

export function sceneAssetPaths(outputFolder: string, sceneNumber: number): SceneAssetPaths {
  const folder = path.join(outputFolder, "04_images", "scenes", sceneFolderName(sceneNumber));
  const upscaledFolder = path.join(folder, "upscaled");
  const videoFolder = path.join(folder, "video");

  return {
    folder,
    promptJson: path.join(folder, "prompt.json"),
    promptMarkdown: path.join(folder, "prompt.md"),
    manifestJson: path.join(folder, "manifest.json"),
    sceneProductionJson: path.join(folder, "scene_production.json"),
    sceneProductionMarkdown: path.join(folder, "scene_production.md"),
    notesMarkdown: path.join(folder, "notes.md"),
    image: path.join(folder, "image.png"),
    approvedImage: path.join(folder, "approved.png"),
    variationsFolder: path.join(folder, "variations"),
    upscaledFolder,
    upscaledImage: path.join(upscaledFolder, "upscaled.png"),
    videoFolder,
    videoClip: path.join(videoFolder, "clip.mp4")
  };
}

export async function writeSceneAssetPack(options: {
  projectRoot: string;
  outputFolder: string;
  scene?: Scene;
  prompt: Prompt;
  sourceImagePath?: string;
  force?: boolean;
}): Promise<WriteResult[]> {
  const paths = sceneAssetPaths(options.outputFolder, options.prompt.scene_number);
  const results: WriteResult[] = [];

  await Promise.all([
    fs.ensureDir(paths.variationsFolder),
    fs.ensureDir(paths.upscaledFolder),
    fs.ensureDir(paths.videoFolder)
  ]);

  results.push(
    await writeJsonFile(paths.promptJson, options.prompt, { force: true }),
    await writeTextFile(paths.promptMarkdown, scenePromptMarkdown(options.prompt, options.scene), { force: true }),
    ...(options.prompt.scene_production
      ? [
          await writeJsonFile(paths.sceneProductionJson, options.prompt.scene_production, { force: true }),
          await writeTextFile(
            paths.sceneProductionMarkdown,
            sceneProductionMarkdown([options.prompt.scene_production], options.scene ? [options.scene] : []),
            { force: true }
          )
        ]
      : []),
    await writeJsonFile(
      paths.manifestJson,
      sceneManifest(options.projectRoot, options.outputFolder, paths, options.prompt, options.sourceImagePath),
      { force: true }
    ),
    await writeTextFile(paths.notesMarkdown, sceneNotesMarkdown(options.prompt.scene_number), { force: false }),
    await writeTextFile(path.join(paths.variationsFolder, ".gitkeep"), "", { force: false }),
    await writeTextFile(path.join(paths.upscaledFolder, ".gitkeep"), "", { force: false }),
    await writeTextFile(path.join(paths.videoFolder, ".gitkeep"), "", { force: false })
  );

  if (options.sourceImagePath && (await fs.pathExists(options.sourceImagePath))) {
    results.push(await copyOutputFile(options.sourceImagePath, paths.image, options.force));
  }

  return results;
}

export async function syncSceneAssetPacks(options: {
  projectRoot: string;
  outputFolder: string;
  scenes: Scene[];
  prompts: Prompt[];
  force?: boolean;
}): Promise<WriteResult[]> {
  const sceneByNumber = new Map(options.scenes.map((scene) => [scene.scene_number, scene]));
  const results: WriteResult[] = [];

  for (const prompt of options.prompts) {
    const sourceImagePath = path.join(options.outputFolder, "04_images", "full", prompt.image_filename);
    results.push(
      ...(await writeSceneAssetPack({
        projectRoot: options.projectRoot,
        outputFolder: options.outputFolder,
        scene: sceneByNumber.get(prompt.scene_number),
        prompt,
        sourceImagePath,
        force: options.force
      }))
    );
  }

  return results;
}

export async function syncApprovedSceneAssets(options: {
  projectRoot: string;
  outputFolder: string;
  approvals: ImageApproval[];
  force?: boolean;
}): Promise<WriteResult[]> {
  const results: WriteResult[] = [];

  for (const approval of options.approvals) {
    const paths = sceneAssetPaths(options.outputFolder, approval.scene_number);
    const source =
      (await firstExisting([paths.image, path.join(options.outputFolder, "04_images", "full", approval.image_filename)])) ??
      "";

    await fs.ensureDir(paths.folder);
    results.push(await writeJsonFile(path.join(paths.folder, "approval.json"), approval, { force: true }));

    if (approval.status === "approved" && source) {
      results.push(await copyOutputFile(source, paths.approvedImage, options.force));
    }
  }

  return results;
}

export async function findScenePrimaryAsset(options: {
  outputFolder: string;
  prompt: Prompt;
  preferVideo?: boolean;
  preferUpscaled?: boolean;
}): Promise<SceneAssetCandidate | undefined> {
  const paths = sceneAssetPaths(options.outputFolder, options.prompt.scene_number);
  const candidates: Array<SceneAssetCandidate | undefined> = [];

  if (options.preferVideo ?? true) {
    candidates.push(await videoCandidate(paths));
  }

  if (options.preferUpscaled ?? true) {
    candidates.push(await imageCandidate(paths.upscaledImage, "upscaled"));
    candidates.push(await firstFolderImageCandidate(paths.upscaledFolder, "upscaled"));
  }

  candidates.push(
    await imageCandidate(paths.approvedImage, "approved"),
    await imageCandidate(paths.image, "scene-image"),
    await imageCandidate(path.join(options.outputFolder, "04_images", "full", options.prompt.image_filename), "full")
  );

  return candidates.find(Boolean);
}

export async function findSceneImageSource(options: {
  outputFolder: string;
  prompt: Prompt;
  preferUpscaled?: boolean;
}): Promise<SceneAssetCandidate | undefined> {
  return findScenePrimaryAsset({
    outputFolder: options.outputFolder,
    prompt: options.prompt,
    preferVideo: false,
    preferUpscaled: options.preferUpscaled
  });
}

export function scenePromptMarkdown(prompt: Prompt, scene?: Scene): string {
  return `# ${sceneFolderName(prompt.scene_number)}

Image file: \`${prompt.image_filename}\`

Provider: \`${prompt.provider}\`

Layout: \`${prompt.scene_production?.layout_mode ?? "unspecified"}\`

Continuity: \`${prompt.scene_production?.continuity_group ?? "none"}\`

${scene ? `Time: ${scene.start} to ${scene.end}\n\nTranscript:\n\n${scene.transcript}\n\nVisual goal:\n\n${scene.visual_goal}\n\n` : ""}Prompt:

${prompt.prompt}

Negative prompt:

${prompt.negative_prompt || "(none)"}
`;
}

function sceneNotesMarkdown(sceneNumber: number): string {
  return `# Scene ${sceneNumber} Notes

Use this file for human review notes, regeneration ideas, provider settings, or edit decisions.
`;
}

function sceneManifest(
  projectRoot: string,
  outputFolder: string,
  paths: SceneAssetPaths,
  prompt: Prompt,
  sourceImagePath?: string
): Record<string, unknown> {
  return {
    scene_number: prompt.scene_number,
    scene_folder: displayPath(projectRoot, paths.folder),
    prompt_json: displayPath(projectRoot, paths.promptJson),
    prompt_markdown: displayPath(projectRoot, paths.promptMarkdown),
    scene_production_json: displayPath(projectRoot, paths.sceneProductionJson),
    scene_production_markdown: displayPath(projectRoot, paths.sceneProductionMarkdown),
    layout_mode: prompt.scene_production?.layout_mode ?? "",
    continuity_group: prompt.scene_production?.continuity_group ?? "",
    expected_scene_assets: prompt.scene_production?.expected_assets ?? [],
    source_image_filename: prompt.image_filename,
    flat_full_image: displayPath(projectRoot, path.join(outputFolder, "04_images", "full", prompt.image_filename)),
    image_alias: displayPath(projectRoot, paths.image),
    approved_image: displayPath(projectRoot, paths.approvedImage),
    variations_folder: displayPath(projectRoot, paths.variationsFolder),
    upscaled_folder: displayPath(projectRoot, paths.upscaledFolder),
    video_folder: displayPath(projectRoot, paths.videoFolder),
    copied_from: sourceImagePath ? displayPath(projectRoot, sourceImagePath) : "",
    updated_at: new Date().toISOString()
  };
}

async function copyOutputFile(source: string, destination: string, force = false): Promise<WriteResult> {
  await fs.ensureDir(path.dirname(destination));

  if (!force && (await fs.pathExists(destination))) {
    return { filePath: destination, written: false };
  }

  await fs.copyFile(source, destination);
  return { filePath: destination, written: true };
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const filePath of paths) {
    if (await fs.pathExists(filePath)) {
      return filePath;
    }
  }

  return undefined;
}

async function imageCandidate(
  filePath: string,
  source: SceneAssetCandidate["source"]
): Promise<SceneAssetCandidate | undefined> {
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  return { filePath, kind: "image", source };
}

async function videoCandidate(paths: SceneAssetPaths): Promise<SceneAssetCandidate | undefined> {
  if (await fs.pathExists(paths.videoClip)) {
    return { filePath: paths.videoClip, kind: "video", source: "scene-video" };
  }

  if (!(await fs.pathExists(paths.videoFolder))) {
    return undefined;
  }

  const files = (await fs.readdir(paths.videoFolder))
    .filter((file) => [".mp4", ".mov", ".webm"].includes(path.extname(file).toLowerCase()))
    .sort();
  const first = files[0];

  if (!first) {
    return undefined;
  }

  return { filePath: path.join(paths.videoFolder, first), kind: "video", source: "scene-video" };
}

async function firstFolderImageCandidate(
  folder: string,
  source: SceneAssetCandidate["source"]
): Promise<SceneAssetCandidate | undefined> {
  if (!(await fs.pathExists(folder))) {
    return undefined;
  }

  const files = (await fs.readdir(folder))
    .filter((file) => [".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(file).toLowerCase()))
    .sort();
  const first = files[0];

  if (!first) {
    return undefined;
  }

  return { filePath: path.join(folder, first), kind: "image", source };
}
