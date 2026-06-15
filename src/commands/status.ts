import path from "node:path";
import fs from "fs-extra";
import { displayPath } from "../lib/files.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";

interface Stage {
  name: string;
  complete: boolean;
  detail: string;
  nextCommand?: string;
}

export async function statusProjectCommand(projectPath: string): Promise<string> {
  const validation = await validateProject(projectPath);

  if (!validation.valid || !validation.project) {
    return `${formatValidationFailure(validation.issues)}

Project status could not be computed until validation passes.`;
  }

  const project = validation.project;
  const output = project.paths.outputFolder;
  const stages: Stage[] = [
    {
      name: "Validate inputs",
      complete: true,
      detail: "project.yml, input files, style bible and characters are valid."
    },
    {
      name: "Analyze script",
      complete: await exists(output, "00_analysis", "content_analysis.md"),
      detail: "hook, pacing and platform-fit analysis.",
      nextCommand: `video-pack analyze --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Plan run",
      complete: await exists(output, "cost_estimate.json"),
      detail: "scene count and cost estimate.",
      nextCommand: `video-pack plan --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Prepare scenes",
      complete:
        (await exists(output, "01_transcript", "transcript.txt")) &&
        (await exists(output, "02_scenes", "scenes.json")),
      detail: await sceneDetail(output),
      nextCommand: `video-pack prepare --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Generate prompts",
      complete:
        (await exists(output, "03_prompts", "prompts.json")) &&
        (await exists(output, "03_prompts", "thumbnail_prompts.json")),
      detail: await promptDetail(output),
      nextCommand: `video-pack prompts --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Preview visuals",
      complete: await folderHasFiles(path.join(output, "04_images", "preview")),
      detail: await folderCountDetail(path.join(output, "04_images", "preview")),
      nextCommand: `video-pack preview --project ${displayPath(process.cwd(), project.root) || "."} --count ${project.config.generation.preview_scenes}`
    },
    {
      name: "Full visual set",
      complete: await folderHasFiles(path.join(output, "04_images", "full")),
      detail: await folderCountDetail(path.join(output, "04_images", "full")),
      nextCommand: `video-pack generate-images --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Review image approvals",
      complete: await approvalsAllApproved(output),
      detail: await approvalDetail(output),
      nextCommand: `video-pack approve-images --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Generate thumbnails",
      complete: await folderHasFiles(path.join(output, "07_publish", "thumbnails")),
      detail: await folderCountDetail(path.join(output, "07_publish", "thumbnails")),
      nextCommand: `video-pack generate-thumbnails --project ${displayPath(process.cwd(), project.root) || "."}`
    },
    {
      name: "Package edit pack",
      complete:
        (await exists(output, "05_captions", "captions.srt")) &&
        (await exists(output, "06_edit_pack", "edit_manifest.csv")) &&
        (await exists(output, "06_edit_pack", "timelines", "timeline.fcpxml")) &&
        (await exists(output, "07_publish", "copy_pack.md")) &&
        (await exists(output, "README_NEXT_STEPS.md")),
      detail: "captions, manifest, reports and publishing checklists.",
      nextCommand: `video-pack package --project ${displayPath(process.cwd(), project.root) || "."}`
    }
  ];
  const next = stages.find((stage) => !stage.complete);

  return `Project status

Project: ${project.config.project_name}
Profile: ${project.config.profile}
Provider: ${project.config.generation.image_provider}

${stages.map(formatStage).join("\n")}

Next step:
${next?.nextCommand ?? "All pipeline stages are complete. Review output/README_NEXT_STEPS.md."}`;
}

function formatStage(stage: Stage): string {
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
