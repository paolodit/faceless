import path from "node:path";
import fs from "fs-extra";
import { sceneAssetPaths, sceneFolderName } from "./scene-assets.js";
import { isCurrentMockAsset } from "./mock-png.js";
import type { ImageApproval, Prompt } from "./schemas.js";
import { fileIsAtLeastAsNewAs } from "./workflow-freshness.js";

export interface ImageAssetState {
  expected: number;
  available: number;
  realAvailable: number;
  mockPlaceholders: number;
  missingSceneNumbers: number[];
  mockSceneNumbers: number[];
  promptPackReady: boolean;
}

export interface ApprovalState {
  expected: number;
  approved: number;
  pending: number;
  ready: boolean;
}

export interface SceneAssetFolderState {
  expected: number;
  current: number;
  missingSceneNumbers: number[];
  staleFolderNames: string[];
  outdatedFolderNames: string[];
  upscaled: number;
  videos: number;
  ready: boolean;
}

export async function readScenePrompts(outputFolder: string): Promise<Prompt[]> {
  const promptsPath = path.join(outputFolder, "03_prompts", "prompts.json");
  return (await fs.pathExists(promptsPath)) ? ((await fs.readJson(promptsPath)) as Prompt[]) : [];
}

export async function getImageAssetState(outputFolder: string, prompts: Prompt[]): Promise<ImageAssetState> {
  const missingSceneNumbers: number[] = [];
  const mockSceneNumbers: number[] = [];
  const promptPackPath = path.join(outputFolder, "03_prompts", "prompts.json");

  for (const prompt of prompts) {
    const assetPath = await findSceneAssetPath(outputFolder, prompt, promptPackPath);
    if (!assetPath) {
      missingSceneNumbers.push(prompt.scene_number);
    } else if (await isCurrentMockAsset(assetPath)) {
      mockSceneNumbers.push(prompt.scene_number);
    }
  }

  const available = prompts.length - missingSceneNumbers.length;

  return {
    expected: prompts.length,
    available,
    realAvailable: available - mockSceneNumbers.length,
    mockPlaceholders: mockSceneNumbers.length,
    missingSceneNumbers,
    mockSceneNumbers,
    promptPackReady:
      (await fs.pathExists(path.join(outputFolder, "04_images", "full", "full_prompts.json"))) ||
      (await fs.pathExists(path.join(outputFolder, "04_images", "full", "full_prompts.md")))
  };
}

export async function hasSceneImage(
  outputFolder: string,
  prompt: Prompt,
  freshnessInput?: string
): Promise<boolean> {
  return Boolean(await findSceneAssetPath(outputFolder, prompt, freshnessInput));
}

export async function hasRealSceneAsset(
  outputFolder: string,
  prompt: Prompt,
  freshnessInput?: string
): Promise<boolean> {
  const assetPath = await findSceneAssetPath(outputFolder, prompt, freshnessInput);
  return Boolean(assetPath) && !(await isCurrentMockAsset(assetPath));
}

async function findSceneAssetPath(
  outputFolder: string,
  prompt: Prompt,
  freshnessInput?: string
): Promise<string | undefined> {
  const paths = sceneAssetPaths(outputFolder, prompt.scene_number);
  const candidates = [
    paths.videoClip,
    paths.upscaledImage,
    paths.approvedImage,
    paths.image,
    path.join(outputFolder, "04_images", "full", prompt.image_filename)
  ];
  let mockFallback: string | undefined;

  for (const candidate of candidates) {
    if (
      (await fs.pathExists(candidate)) &&
      (!freshnessInput || (await fileIsAtLeastAsNewAs(candidate, freshnessInput)))
    ) {
      if (await isCurrentMockAsset(candidate)) {
        mockFallback ??= candidate;
      } else {
        return candidate;
      }
    }
  }

  return mockFallback;
}

export async function getApprovalState(
  outputFolder: string,
  prompts: Prompt[],
  imageState?: ImageAssetState
): Promise<ApprovalState> {
  const approvalsPath = path.join(outputFolder, "04_images", "approvals.json");
  const approvals = (await fs.pathExists(approvalsPath))
    ? ((await fs.readJson(approvalsPath)) as ImageApproval[])
    : [];
  const promptByScene = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));
  const promptPackPath = path.join(outputFolder, "03_prompts", "prompts.json");
  const promptPackMtime = (await fs.pathExists(promptPackPath))
    ? (await fs.stat(promptPackPath)).mtimeMs
    : Number.POSITIVE_INFINITY;
  const approved = new Set(
    approvals
      .filter((approval) => {
        const prompt = promptByScene.get(approval.scene_number);
        return (
          prompt !== undefined &&
          prompt.image_filename === approval.image_filename &&
          approval.status === "approved" &&
          Date.parse(approval.updated_at) >= promptPackMtime
        );
      })
      .map((approval) => approval.scene_number)
  ).size;
  const assets = imageState ?? (await getImageAssetState(outputFolder, prompts));

  return {
    expected: prompts.length,
    approved,
    pending: Math.max(0, prompts.length - approved),
    ready: prompts.length > 0 && assets.realAvailable === prompts.length && approved === prompts.length
  };
}

export async function getSceneAssetFolderState(
  outputFolder: string,
  prompts: Prompt[]
): Promise<SceneAssetFolderState> {
  const scenesFolder = path.join(outputFolder, "04_images", "scenes");
  const expectedFolders = new Map(
    prompts.map((prompt) => [sceneFolderName(prompt.scene_number), prompt.scene_number])
  );
  const existingFolders = new Set<string>();

  if (await fs.pathExists(scenesFolder)) {
    const entries = await fs.readdir(scenesFolder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("scene_")) {
        existingFolders.add(entry.name);
      }
    }
  }

  const staleFolderNames = [...existingFolders].filter((folder) => !expectedFolders.has(folder)).sort();
  const currentFolders: string[] = [];
  const outdatedFolderNames: string[] = [];
  for (const [folder, sceneNumber] of expectedFolders) {
    if (!existingFolders.has(folder)) {
      continue;
    }

    const promptPath = path.join(scenesFolder, folder, "prompt.json");
    const expectedPrompt = prompts.find((prompt) => prompt.scene_number === sceneNumber);
    const actualPrompt = (await fs.pathExists(promptPath)) ? ((await fs.readJson(promptPath)) as Prompt) : undefined;
    if (expectedPrompt && actualPrompt && JSON.stringify(actualPrompt) === JSON.stringify(expectedPrompt)) {
      currentFolders.push(folder);
    } else {
      outdatedFolderNames.push(folder);
    }
  }
  const missingSceneNumbers = [...expectedFolders.entries()]
    .filter(([folder]) => !currentFolders.includes(folder))
    .map(([, sceneNumber]) => sceneNumber);
  let upscaled = 0;
  let videos = 0;

  for (const folder of currentFolders) {
    if (await fs.pathExists(path.join(scenesFolder, folder, "upscaled", "upscaled.png"))) {
      upscaled += 1;
    }
    if (await fs.pathExists(path.join(scenesFolder, folder, "video", "clip.mp4"))) {
      videos += 1;
    }
  }

  return {
    expected: prompts.length,
    current: currentFolders.length,
    missingSceneNumbers,
    staleFolderNames,
    outdatedFolderNames,
    upscaled,
    videos,
    ready: prompts.length > 0 && missingSceneNumbers.length === 0
  };
}

export function sceneAssetFolderDetail(state: SceneAssetFolderState): string {
  if (state.expected === 0) {
    return "no current scene prompts yet.";
  }

  const stale =
    state.staleFolderNames.length > 0
      ? ` ${state.staleFolderNames.length} stale folder${state.staleFolderNames.length === 1 ? "" : "s"} preserved and ignored.`
      : "";
  const outdated =
    state.outdatedFolderNames.length > 0
      ? ` ${state.outdatedFolderNames.length} current-number folder${state.outdatedFolderNames.length === 1 ? " is" : "s are"} outdated.`
      : "";
  return `${state.current}/${state.expected} current scene folders (${state.upscaled} upscaled image aliases, ${state.videos} scene video clips).${outdated}${stale}`;
}

export function imageAssetDetail(state: ImageAssetState): string {
  if (state.expected === 0) {
    return "no scene prompts yet.";
  }

  if (state.available === state.expected) {
    if (state.mockPlaceholders > 0) {
      return `${state.realAvailable}/${state.expected} real scene assets available; ${state.mockPlaceholders} mock placeholders cannot be approved.`;
    }
    return `${state.realAvailable}/${state.expected} real scene assets available.`;
  }

  if (state.promptPackReady) {
    return `${state.realAvailable}/${state.expected} real scene assets available; external/manual prompt pack is ready.`;
  }

  return `${state.realAvailable}/${state.expected} real scene assets available.`;
}
