import path from "node:path";
import fs from "fs-extra";
import { sceneAssetPaths } from "./scene-assets.js";
import type { ImageApproval, Prompt } from "./schemas.js";

export interface ImageAssetState {
  expected: number;
  available: number;
  missingSceneNumbers: number[];
  promptPackReady: boolean;
}

export interface ApprovalState {
  expected: number;
  approved: number;
  pending: number;
  ready: boolean;
}

export async function readScenePrompts(outputFolder: string): Promise<Prompt[]> {
  const promptsPath = path.join(outputFolder, "03_prompts", "prompts.json");
  return (await fs.pathExists(promptsPath)) ? ((await fs.readJson(promptsPath)) as Prompt[]) : [];
}

export async function getImageAssetState(outputFolder: string, prompts: Prompt[]): Promise<ImageAssetState> {
  const missingSceneNumbers: number[] = [];

  for (const prompt of prompts) {
    if (!(await hasSceneImage(outputFolder, prompt))) {
      missingSceneNumbers.push(prompt.scene_number);
    }
  }

  return {
    expected: prompts.length,
    available: prompts.length - missingSceneNumbers.length,
    missingSceneNumbers,
    promptPackReady:
      (await fs.pathExists(path.join(outputFolder, "04_images", "full", "full_prompts.json"))) ||
      (await fs.pathExists(path.join(outputFolder, "04_images", "full", "full_prompts.md")))
  };
}

export async function hasSceneImage(outputFolder: string, prompt: Prompt): Promise<boolean> {
  const paths = sceneAssetPaths(outputFolder, prompt.scene_number);
  const candidates = [
    paths.videoClip,
    paths.upscaledImage,
    paths.approvedImage,
    paths.image,
    path.join(outputFolder, "04_images", "full", prompt.image_filename)
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return true;
    }
  }

  return false;
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
  const approved = approvals.filter((approval) => approval.status === "approved").length;
  const assets = imageState ?? (await getImageAssetState(outputFolder, prompts));

  return {
    expected: prompts.length,
    approved,
    pending: Math.max(0, prompts.length - approved),
    ready: prompts.length > 0 && assets.available === prompts.length && approved === prompts.length
  };
}

export function imageAssetDetail(state: ImageAssetState): string {
  if (state.expected === 0) {
    return "no scene prompts yet.";
  }

  if (state.available === state.expected) {
    return `${state.available}/${state.expected} real scene assets available.`;
  }

  if (state.promptPackReady) {
    return `${state.available}/${state.expected} real scene assets available; external/manual prompt pack is ready.`;
  }

  return `${state.available}/${state.expected} real scene assets available.`;
}
