import path from "node:path";
import fs from "fs-extra";
import { displayPath } from "../lib/files.js";
import { getProductionPipeline } from "../lib/pipelines.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";

interface Stage {
  id: string;
  name: string;
  complete: boolean;
  detail: string;
  nextCommand?: string;
  why?: string;
  after?: string;
  optional?: boolean;
}

export async function statusProjectCommand(projectPath: string): Promise<string> {
  const validation = await validateProject(projectPath);

  if (!validation.valid || !validation.project) {
    return `${formatValidationFailure(validation.issues)}

Project status could not be computed until validation passes.`;
  }

  const project = validation.project;
  const output = project.paths.outputFolder;
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const pipeline = getProductionPipeline(project.config.pipeline);
  const scenesReady = await exists(output, "02_scenes", "scenes.json");
  const sceneAssetsReady = await sceneAssetsComplete(output);
  const imagesApproved = await approvalsAllApproved(output);
  const packageOutputsReady = await packageOutputsComplete(output);
  const packageReady = packageOutputsReady && sceneAssetsReady && imagesApproved;
  const stages: Stage[] = [
    {
      id: "validate",
      name: "validate",
      complete: true,
      detail: "project.yml, input files, style bible and characters are valid."
    },
    {
      id: "analyze",
      name: "analyze",
      complete: await exists(output, "00_analysis", "content_analysis.md"),
      detail: "hook, pacing and platform-fit analysis.",
      nextCommand: `video-pack analyze --project ${projectArg}`,
      why: "This checks the script for hook strength, pacing, platform fit and obvious creative risks.",
      after: `Run:\nvideo-pack plan --project ${projectArg}`
    },
    {
      id: "plan",
      name: "plan",
      complete: await exists(output, "cost_estimate.json"),
      detail: "scene count and base/cautious cost estimate.",
      nextCommand: `video-pack plan --project ${projectArg}`,
      why: "This estimates duration, scene count, image count and likely generation cost before you make assets.",
      after: `Run:\nvideo-pack proposal --project ${projectArg}`
    },
    {
      id: "proposal",
      name: "proposal",
      complete: (await exists(output, "00_proposal", "proposal.md")) || scenesReady,
      detail: await proposalDetail(output, scenesReady),
      nextCommand: `video-pack proposal --project ${projectArg}`,
      why: "This gives the creator a plain-language route, provider readiness, cost watch and review checkpoints before asset-heavy work.",
      after: `Review output/00_proposal/proposal.md\nThen run:\nvideo-pack prepare --project ${projectArg}`
    },
    {
      id: "prepare",
      name: "prepare",
      complete:
        (await exists(output, "01_transcript", "transcript.txt")) &&
        (await exists(output, "02_scenes", "scenes.json")),
      detail: await sceneDetail(output),
      nextCommand: `video-pack prepare --project ${projectArg}`,
      why: "This creates transcript timings and editable scene files from your script and voiceover.",
      after: `Review output/02_scenes/scenes.md\nThen run:\nvideo-pack visual-events --project ${projectArg}`
    },
    {
      id: "visual-events",
      name: "visual-events",
      complete: await visualEventsCompleteOrBypassed(output),
      detail: await visualEventDetail(output),
      nextCommand: `video-pack visual-events --project ${projectArg}`,
      why: "This chooses scene production layouts, then creates editor-facing visual beats, overlay text rows, stock search queries and an asset manifest before you build prompts.",
      after: `Review output/02_scenes/scene_production.html, output/02_scenes/scene_production.md, output/02_scenes/visual_events.md and output/06_edit_pack/overlay_text.csv\nThen run:\nvideo-pack prompts --project ${projectArg}`
    },
    {
      id: "prompts",
      name: "prompts",
      complete:
        (await exists(output, "03_prompts", "prompts.json")) &&
        (await exists(output, "03_prompts", "thumbnail_prompts.json")),
      detail: await promptDetail(output),
      nextCommand: `video-pack prompts --project ${projectArg}`,
      why: "This turns the reviewed scenes, style bible and character bible into image prompt packs.",
      after: `Review output/03_prompts/prompts.md\nThen run:\nvideo-pack preview --project ${projectArg} --count ${project.config.generation.preview_scenes}`
    },
    {
      id: "preview",
      name: "preview",
      complete: await folderHasFiles(path.join(output, "04_images", "preview")),
      detail: await folderCountDetail(path.join(output, "04_images", "preview")),
      nextCommand: `video-pack preview --project ${projectArg} --count ${project.config.generation.preview_scenes}`,
      why: "This gives you a small visual check before a full prompt pack or paid image generation run.",
      after: `If the style works, run:\nvideo-pack generate-images --project ${projectArg}`
    },
    {
      id: "generate-images",
      name: "generate-images",
      complete: await folderHasFiles(path.join(output, "04_images", "full")),
      detail: await folderCountDetail(path.join(output, "04_images", "full")),
      nextCommand: `video-pack generate-images --project ${projectArg}`,
      why: "This prepares the full image set: prompt packs in manual/external mode, placeholders in mock mode, or real images in OpenAI/Magnific mode.",
      after: `Review output/04_images/full/ and output/04_images/scenes/\nThen run:\nvideo-pack approve-images --project ${projectArg}`
    },
    {
      id: "scene-assets",
      name: "scene-assets",
      complete: sceneAssetsReady,
      detail: await sceneAssetDetail(output),
      nextCommand: `video-pack scene-assets --project ${projectArg}`,
      why: "This creates one logical folder per scene so prompts, images, approved files, upscales, video clips and notes stay together.",
      after: `Optional polish:\nvideo-pack upscale-images --project ${projectArg}\nvideo-pack generate-scene-videos --project ${projectArg}\n\nOr continue:\nvideo-pack approve-images --project ${projectArg}`
    },
    {
      id: "approve-images",
      name: "approve-images",
      complete: imagesApproved,
      detail: await approvalDetail(output),
      nextCommand: `video-pack approve-images --project ${projectArg}`,
      why: "This helps track which generated images are approved, rejected or need regeneration.",
      after: `Review output/04_images/review_board.md\nTo approve all current images, run:\nvideo-pack approve-images --project ${projectArg} --approve-all\nThen run:\nvideo-pack package --project ${projectArg}`
    },
    {
      id: "package",
      name: "package",
      complete: packageReady,
      detail: packageDetail(packageOutputsReady, sceneAssetsReady, imagesApproved),
      nextCommand: `video-pack package --project ${projectArg}`,
      why: "This creates the editor-ready production pack you can assemble manually in CapCut, Premiere, DaVinci, Remotion or another editor.",
      after: "Review output/README_NEXT_STEPS.md, output/06_edit_pack/asset_checklist.md and output/08_remotion/README.md."
    },
    {
      id: "generate-thumbnails",
      name: "generate-thumbnails",
      complete: await thumbnailStageComplete(path.join(output, "07_publish", "thumbnails")),
      detail: await thumbnailStageDetail(path.join(output, "07_publish", "thumbnails")),
      nextCommand: `video-pack generate-thumbnails --project ${projectArg}`,
      why: "This creates thumbnail prompt packs or thumbnail assets when the channel needs separate thumbnail work.",
      after: "Review output/07_publish/thumbnails/.",
      optional: true
    }
  ];
  const next = stages.find((stage) => !stage.complete && !stage.optional) ?? stages.find((stage) => !stage.complete);
  const completed = stages.filter((stage) => stage.complete && !stage.optional);
  const missingCore = stages.filter((stage) => !stage.complete && !stage.optional);
  const optional = stages.filter((stage) => stage.optional);

  return `Project status

Project: ${project.config.project_name}
Pipeline: ${pipeline.title} (${pipeline.name})
Profile: ${project.config.profile}
Image provider: ${project.config.generation.image_provider}
Scene video provider: ${project.config.generation.scene_video_provider}

Completed:
${completed.map(formatSummaryStage).join("\n") || "- none yet"}

Missing:
${missingCore.map(formatSummaryStage).join("\n") || "- none"}

Optional:
${optional.map(formatOptionalStage).join("\n") || "- none"}

Pipeline detail:
${stages.map(formatDetailStage).join("\n\n")}

Recommended next step:
${next?.nextCommand ?? "All core stages are complete. Review output/README_NEXT_STEPS.md."}
${next?.why ? `\nWhy:\n${next.why}` : ""}
${next?.after ? `\nAfter that:\n${next.after}` : ""}

Optional asset lanes:
- Scene folders: video-pack scene-assets --project ${projectArg}
- Production board: video-pack board --project ${projectArg}
- Upscale images: video-pack upscale-images --project ${projectArg} --provider manual
- Scene video clips: video-pack generate-scene-videos --project ${projectArg} --provider manual
- Magnific upscale/video needs MAGNIFIC_API_KEY and --provider magnific
- Higgsfield video handoff: video-pack generate-scene-videos --project ${projectArg} --provider higgsfield`;
}

function formatSummaryStage(stage: Stage): string {
  return `- ${stage.name}: ${stage.detail}`;
}

function formatDetailStage(stage: Stage): string {
  return `${stage.complete ? "[x]" : "[ ]"} ${stage.name}
    ${stage.detail}`;
}

function formatOptionalStage(stage: Stage): string {
  return `- ${stage.name}: ${stage.complete ? "ready" : stage.detail}`;
}

async function exists(root: string, ...parts: string[]): Promise<boolean> {
  return fs.pathExists(path.join(root, ...parts));
}

async function sceneDetail(output: string): Promise<string> {
  const scenesPath = path.join(output, "02_scenes", "scenes.json");
  if (!(await fs.pathExists(scenesPath))) {
    return "not prepared yet.";
  }

  const scenes = (await fs.readJson(scenesPath)) as unknown[];
  return `${scenes.length} scenes prepared.`;
}

async function promptDetail(output: string): Promise<string> {
  const promptsPath = path.join(output, "03_prompts", "prompts.json");
  if (!(await fs.pathExists(promptsPath))) {
    return "not generated yet.";
  }

  const prompts = (await fs.readJson(promptsPath)) as unknown[];
  const thumbnailPromptsPath = path.join(output, "03_prompts", "thumbnail_prompts.json");
  const thumbnailCount = (await fs.pathExists(thumbnailPromptsPath))
    ? ((await fs.readJson(thumbnailPromptsPath)) as unknown[]).length
    : 0;
  return `${prompts.length} scene prompts and ${thumbnailCount} thumbnail prompts generated.`;
}

async function proposalDetail(output: string, scenesReady: boolean): Promise<string> {
  if (await exists(output, "00_proposal", "proposal.md")) {
    return "production route, provider readiness, cost watch and checkpoints written.";
  }

  if (scenesReady) {
    return "checkpoint bypassed by later scene outputs; run proposal any time to document the route.";
  }

  return "not written yet.";
}

async function visualEventsCompleteOrBypassed(output: string): Promise<boolean> {
  if (
    (await exists(output, "02_scenes", "visual_events.json")) &&
    (await exists(output, "06_edit_pack", "overlay_text.csv"))
  ) {
    return true;
  }

  return exists(output, "03_prompts", "prompts.json");
}

async function visualEventDetail(output: string): Promise<string> {
  const visualEventsPath = path.join(output, "02_scenes", "visual_events.json");
  if (await fs.pathExists(visualEventsPath)) {
    const plans = (await fs.readJson(visualEventsPath)) as Array<{ events?: unknown[] }>;
    const eventCount = plans.reduce((sum, plan) => sum + (plan.events?.length ?? 0), 0);
    const layoutSummary = await sceneProductionLayoutDetail(output);
    return `${eventCount} visual events planned across ${plans.length} scenes${layoutSummary ? `; ${layoutSummary}` : ""}.`;
  }

  if (await exists(output, "03_prompts", "prompts.json")) {
    return "explicit planning skipped; package will auto-create visual events if missing.";
  }

  return "not planned yet.";
}

async function sceneProductionLayoutDetail(output: string): Promise<string> {
  const sceneProductionPath = path.join(output, "02_scenes", "scene_production.json");
  if (!(await fs.pathExists(sceneProductionPath))) {
    return "";
  }

  const plans = (await fs.readJson(sceneProductionPath)) as Array<{ layout_mode?: string }>;
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const layout = plan.layout_mode ?? "unspecified";
    counts.set(layout, (counts.get(layout) ?? 0) + 1);
  }

  return `layouts ${[...counts.entries()].map(([layout, count]) => `${layout}: ${count}`).join(", ")}`;
}

async function approvalDetail(output: string): Promise<string> {
  const approvalsPath = path.join(output, "04_images", "approvals.json");
  if (!(await fs.pathExists(approvalsPath))) {
    return "approval sheet not created yet.";
  }

  const approvals = (await fs.readJson(approvalsPath)) as Array<{ status: string }>;
  const approved = approvals.filter((approval) => approval.status === "approved").length;
  return `${approved}/${approvals.length} images approved.`;
}

async function approvalsAllApproved(output: string): Promise<boolean> {
  const approvalsPath = path.join(output, "04_images", "approvals.json");
  if (!(await fs.pathExists(approvalsPath))) {
    return false;
  }

  const approvals = (await fs.readJson(approvalsPath)) as Array<{ status: string }>;
  return approvals.length > 0 && approvals.every((approval) => approval.status === "approved");
}

async function packageOutputsComplete(output: string): Promise<boolean> {
  return (
    (await exists(output, "05_captions", "captions.srt")) &&
    (await exists(output, "06_edit_pack", "edit_manifest.csv")) &&
    (await exists(output, "06_edit_pack", "timelines", "timeline.fcpxml")) &&
    (await exists(output, "07_publish", "copy_pack.md")) &&
    (await exists(output, "08_remotion", "package.json")) &&
    (await exists(output, "README_NEXT_STEPS.md"))
  );
}

function packageDetail(outputsReady: boolean, sceneAssetsReady: boolean, imagesApproved: boolean): string {
  if (!outputsReady) {
    return "captions, manifest, timeline exports, Remotion draft, copy pack, approval sheet and publishing checklists.";
  }

  if (!sceneAssetsReady || !imagesApproved) {
    const blockers = [
      sceneAssetsReady ? "" : "scene folders missing",
      imagesApproved ? "" : "images not approved"
    ].filter(Boolean);
    return `package files exist, but final pack is not ready yet (${blockers.join(", ")}).`;
  }

  return "captions, manifest, timeline exports, Remotion draft, copy pack, approval sheet and publishing checklists.";
}

async function folderHasFiles(folder: string): Promise<boolean> {
  if (!(await fs.pathExists(folder))) {
    return false;
  }

  return (await fs.readdir(folder)).length > 0;
}

async function folderCountDetail(folder: string): Promise<string> {
  if (!(await fs.pathExists(folder))) {
    return "no files yet.";
  }

  const files = await fs.readdir(folder);
  const pngs = files.filter((file) => file.toLowerCase().endsWith(".png")).length;
  const promptPacks = files.filter((file) => file.toLowerCase().includes("prompts")).length;
  return `${files.length} files (${pngs} PNG, ${promptPacks} prompt pack files).`;
}

async function sceneAssetsComplete(output: string): Promise<boolean> {
  const scenesFolder = path.join(output, "04_images", "scenes");
  if (!(await fs.pathExists(scenesFolder))) {
    return false;
  }

  const entries = await fs.readdir(scenesFolder);
  return entries.some((entry) => entry.startsWith("scene_"));
}

async function sceneAssetDetail(output: string): Promise<string> {
  const scenesFolder = path.join(output, "04_images", "scenes");
  if (!(await fs.pathExists(scenesFolder))) {
    return "scene folders not created yet.";
  }

  const sceneFolders = (await fs.readdir(scenesFolder)).filter((entry) => entry.startsWith("scene_"));
  const upscaled = await countNestedFiles(scenesFolder, "upscaled.png");
  const videos = await countNestedFiles(scenesFolder, "clip.mp4");
  return `${sceneFolders.length} scene folders (${upscaled} upscaled image aliases, ${videos} scene video clips).`;
}

async function countNestedFiles(folder: string, filename: string): Promise<number> {
  const sceneFolders = (await fs.readdir(folder)).filter((entry) => entry.startsWith("scene_"));
  let count = 0;

  for (const sceneFolder of sceneFolders) {
    if (await fs.pathExists(path.join(folder, sceneFolder, filename))) {
      count += 1;
      continue;
    }

    if (await fs.pathExists(path.join(folder, sceneFolder, "upscaled", filename))) {
      count += 1;
      continue;
    }

    if (await fs.pathExists(path.join(folder, sceneFolder, "video", filename))) {
      count += 1;
    }
  }

  return count;
}

async function thumbnailStageComplete(folder: string): Promise<boolean> {
  if (!(await fs.pathExists(folder))) {
    return false;
  }

  const files = await fs.readdir(folder);
  return (
    files.some((file) => file.toLowerCase().endsWith(".png")) ||
    files.includes("thumbnail_prompts.json") ||
    files.includes("openai_thumbnail_report.json")
  );
}

async function thumbnailStageDetail(folder: string): Promise<string> {
  if (!(await fs.pathExists(folder))) {
    return "no files yet.";
  }

  const files = await fs.readdir(folder);
  const pngs = files.filter((file) => file.toLowerCase().endsWith(".png")).length;
  const hasPromptPack = files.includes("thumbnail_prompts.json");
  const hasReviewBoard = files.includes("review_board.md") || files.includes("review_board.html");
  const details = [`${pngs} PNG`];

  if (hasPromptPack) {
    details.push("prompt pack ready");
  }

  if (hasReviewBoard) {
    details.push("review board ready");
  }

  return `${files.length} files (${details.join(", ")}).`;
}
