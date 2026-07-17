import path from "node:path";
import fs from "fs-extra";
import type { LoadedProject } from "./validation.js";
import { getApprovalState, getImageAssetState, readScenePrompts } from "./workflow-assets.js";
import { getVisualEventAssetState, type VisualEventAssetState } from "./visual-event-assets.js";

export type ProductionDeliverableLevel =
  | "setup"
  | "production-plan"
  | "visual-review"
  | "assembly-draft"
  | "editor-ready-pack"
  | "rendered-draft";

export interface ProductionReadiness {
  level: ProductionDeliverableLevel;
  label: string;
  summary: string;
  scenes: number;
  baseAssets: {
    expected: number;
    available: number;
    realAvailable: number;
    mockPlaceholders: number;
    approved: number;
  };
  visualEvents: VisualEventAssetState;
  audioPresent: boolean;
  editorPackPresent: boolean;
  remotionProjectPresent: boolean;
  renderedVideoPresent: boolean;
  renderedVideoPath?: string;
}

export async function inspectProductionReadiness(project: LoadedProject): Promise<ProductionReadiness> {
  const output = project.paths.outputFolder;
  const scenesPath = path.join(output, "02_scenes", "scenes.json");
  const scenes = (await fs.pathExists(scenesPath)) ? ((await fs.readJson(scenesPath)) as unknown[]) : [];
  const prompts = await readScenePrompts(output);
  const imageState = await getImageAssetState(output, prompts);
  const approvalState = await getApprovalState(output, prompts, imageState);
  const visualEvents = await getVisualEventAssetState({ projectRoot: project.root, outputFolder: output });
  const audioPresent = Boolean(project.paths.audioFile && (await fs.pathExists(project.paths.audioFile)));
  const editorPackPresent = await allExist([
    path.join(output, "05_captions", "captions.srt"),
    path.join(output, "06_edit_pack", "edit_manifest.json")
  ]);
  const remotionProjectPresent = await fs.pathExists(path.join(output, "08_remotion", "package.json"));
  const renderedVideoPath = await firstExisting([
    path.join(output, "08_remotion", "render", "video.mp4"),
    path.join(output, "render", "video.mp4"),
    path.join(output, "video.mp4")
  ]);
  const baseReady =
    imageState.expected > 0 &&
    imageState.realAvailable === imageState.expected &&
    approvalState.approved === imageState.expected;
  const supplementalReady = visualEvents.expected === 0 || visualEvents.approved === visualEvents.expected;
  const level = selectLevel({
    sceneCount: scenes.length,
    baseAvailable: imageState.realAvailable,
    baseReady,
    supplementalReady,
    audioPresent,
    editorPackPresent,
    renderedVideoPresent: Boolean(renderedVideoPath)
  });

  return {
    level,
    label: levelLabel(level),
    summary: levelSummary(level, audioPresent),
    scenes: scenes.length,
    baseAssets: {
      expected: imageState.expected,
      available: imageState.available,
      realAvailable: imageState.realAvailable,
      mockPlaceholders: imageState.mockPlaceholders,
      approved: approvalState.approved
    },
    visualEvents,
    audioPresent,
    editorPackPresent,
    remotionProjectPresent,
    renderedVideoPresent: Boolean(renderedVideoPath),
    renderedVideoPath
  };
}

function selectLevel(options: {
  sceneCount: number;
  baseAvailable: number;
  baseReady: boolean;
  supplementalReady: boolean;
  audioPresent: boolean;
  editorPackPresent: boolean;
  renderedVideoPresent: boolean;
}): ProductionDeliverableLevel {
  if (options.renderedVideoPresent) {
    return "rendered-draft";
  }
  if (options.editorPackPresent && options.baseReady && options.supplementalReady && options.audioPresent) {
    return "editor-ready-pack";
  }
  if (options.editorPackPresent) {
    return "assembly-draft";
  }
  if (options.baseAvailable > 0) {
    return "visual-review";
  }
  if (options.sceneCount > 0) {
    return "production-plan";
  }
  return "setup";
}

function levelLabel(level: ProductionDeliverableLevel): string {
  switch (level) {
    case "setup":
      return "Setup";
    case "production-plan":
      return "Production plan";
    case "visual-review":
      return "Visual review";
    case "assembly-draft":
      return "Assembly draft";
    case "editor-ready-pack":
      return "Editor-ready pack";
    case "rendered-draft":
      return "Rendered draft";
  }
}

function levelSummary(level: ProductionDeliverableLevel, audioPresent: boolean): string {
  switch (level) {
    case "setup":
      return "The private production folder exists; the script and route still need shaping.";
    case "production-plan":
      return "Scenes and edit intent exist, but production assets are not yet reviewed.";
    case "visual-review":
      return "Visual assets exist and need human review before editor packaging.";
    case "assembly-draft":
      return "Assembly files exist, but one or more required visual assets or approvals are still missing.";
    case "editor-ready-pack":
      return "Approved visual coverage, narration and editor assembly files are present. No final MP4 has been rendered.";
    case "rendered-draft":
      return audioPresent
        ? "A rendered MP4 draft exists with narration available; it still needs final human playback and publishing review."
        : "A rendered MP4 draft exists without a configured narration file; it still needs final human playback and publishing review.";
  }
}

async function allExist(paths: string[]): Promise<boolean> {
  return (await Promise.all(paths.map((filePath) => fs.pathExists(filePath)))).every(Boolean);
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const filePath of paths) {
    if (await fs.pathExists(filePath)) {
      return filePath;
    }
  }
  return undefined;
}
