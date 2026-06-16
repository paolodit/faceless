import path from "node:path";
import fs from "fs-extra";
import { displayPath } from "../lib/files.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";

interface Stage {
  id: string;
  name: string;
  complete: boolean;
  detail: string;
  nextCommand?: string;
  why?: string;
  after?: string;
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
      after: `Run:\nvideo-pack prepare --project ${projectArg}`
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
      after: `Review output/02_scenes/scenes.md\nThen run:\nvideo-pack prompts --project ${projectArg}`
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
      why: "This prepares the full image set: prompt packs in manual/external mode, placeholders in mock mode, or real images in OpenAI mode.",
      after: `Review output/04_images/full/\nThen run:\nvideo-pack approve-images --project ${projectArg}`
    },
    {
      id: "approve-images",
      name: "approve-images",
      complete: await approvalsAllApproved(output),
      detail: await approvalDetail(output),
      nextCommand: `video-pack approve-images --project ${projectArg}`,
      why: "This helps track which generated images are approved, rejected or need regeneration.",
      after: `Review output/04_images/review_board.md\nTo approve all current images, run:\nvideo-pack approve-images --project ${projectArg} --approve-all\nThen run:\nvideo-pack package --project ${projectArg}`
    },
    {
      id: "package",
      name: "package",
      complete:
        (await exists(output, "05_captions", "captions.srt")) &&
        (await exists(output, "06_edit_pack", "edit_manifest.csv")) &&
        (await exists(output, "06_edit_pack", "timelines", "timeline.fcpxml")) &&
        (await exists(output, "07_publish", "copy_pack.md")) &&
        (await exists(output, "README_NEXT_STEPS.md")),
      detail: "captions, manifest, timeline exports, copy pack, approval sheet and publishing checklists.",
      nextCommand: `video-pack package --project ${projectArg}`,
      why: "This creates the editor-ready production pack you can assemble manually in CapCut, Premiere, DaVinci or another editor.",
      after: "Review output/README_NEXT_STEPS.md and output/06_edit_pack/asset_checklist.md."
    },
    {
      id: "generate-thumbnails",
      name: "generate-thumbnails",
      complete: await folderHasFiles(path.join(output, "07_publish", "thumbnails")),
      detail: await folderCountDetail(path.join(output, "07_publish", "thumbnails")),
      nextCommand: `video-pack generate-thumbnails --project ${projectArg}`,
      why: "This creates thumbnail prompt packs or thumbnail assets when the channel needs separate thumbnail work.",
      after: "Review output/07_publish/thumbnails/."
    }
  ];
  const next = stages.find((stage) => !stage.complete);
  const completed = stages.filter((stage) => stage.complete);
  const missing = stages.filter((stage) => !stage.complete);

  return `Project status

Project: ${project.config.project_name}
Profile: ${project.config.profile}
Provider: ${project.config.generation.image_provider}

Completed:
${completed.map(formatSummaryStage).join("\n") || "- none yet"}

Missing:
${missing.map(formatSummaryStage).join("\n") || "- none"}

Pipeline detail:
${stages.map(formatDetailStage).join("\n\n")}

Recommended next step:
${next?.nextCommand ?? "All core stages are complete. Review output/README_NEXT_STEPS.md."}
${next?.why ? `\nWhy:\n${next.why}` : ""}
${next?.after ? `\nAfter that:\n${next.after}` : ""}`;
}

function formatSummaryStage(stage: Stage): string {
  return `- ${stage.name}: ${stage.detail}`;
}

function formatDetailStage(stage: Stage): string {
  return `${stage.complete ? "[x]" : "[ ]"} ${stage.name}
    ${stage.detail}`;
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
