import path from "node:path";
import fs from "fs-extra";
import {
  approvalSheetPath,
  approvalsMarkdown,
  approvalsPath,
  loadOrCreateApprovals,
  saveApprovals,
  updateApproval
} from "../lib/approvals.js";
import { displayPath, listCreated, listSkipped, writeTextFile } from "../lib/files.js";
import { writeImageReviewBoards } from "../lib/review-board.js";
import { syncApprovedSceneAssets, syncSceneAssetPacks } from "../lib/scene-assets.js";
import { hasSceneImage } from "../lib/workflow-assets.js";
import type { ApprovalStatus, Prompt } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { inspectProjectWorkflowFreshness } from "../lib/workflow-freshness.js";

export async function approveImagesCommand(
  projectPath: string,
  options: {
    scene?: string;
    status?: ApprovalStatus;
    notes?: string;
    approveAll?: boolean;
    force?: boolean;
  } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");

  if (!(await fs.pathExists(promptsPath))) {
    throw new Error(`Could not find prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  if (!(await inspectProjectWorkflowFreshness(project)).prompts) {
    throw new Error(`The prompt pack is stale because a scene, bible or project setting changed.

Run:
video-pack next --project ${projectPath}`);
  }

  if (!options.approveAll && !options.scene && options.status) {
    throw new Error("Use --scene <number> with --status, or use --approve-all.");
  }

  const status = options.status ?? (options.approveAll ? "approved" : undefined);
  if (status && !["pending", "approved", "rejected", "needs-regen"].includes(status)) {
    throw new Error(`Unknown approval status: ${status}`);
  }

  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  const scenes = (await fs.pathExists(scenesPath)) ? await fs.readJson(scenesPath) : [];
  const approvals = await loadOrCreateApprovals(project.paths.outputFolder, prompts);
  const approvalsToMark = prompts.filter((prompt) => options.approveAll || prompt.scene_number === Number(options.scene));

  if (status === "approved") {
    const missing = [];
    for (const prompt of approvalsToMark) {
      if (!(await hasSceneImage(project.paths.outputFolder, prompt, promptsPath))) {
        missing.push(prompt.scene_number);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Cannot approve scenes without real image or video assets: ${missing.join(", ")}.

Place each generated asset in output/04_images/full/ using its expected filename, then run:
video-pack scene-assets --project ${projectPath}`);
    }
  }

  const updated = updateApproval(approvals, {
    scene: options.scene ? Number(options.scene) : undefined,
    status,
    notes: options.notes,
    approveAll: options.approveAll
  });

  await saveApprovals(project.paths.outputFolder, updated);
  const scenePackResults = await syncSceneAssetPacks({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    scenes,
    prompts,
    force: options.force
  });
  const approvedAssetResults = await syncApprovedSceneAssets({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    approvals: updated,
    force: options.force
  });
  const sheet = await writeTextFile(approvalSheetPath(project.paths.outputFolder), approvalsMarkdown(updated), {
    force: true
  });
  const reviewBoards = await writeImageReviewBoards({
    outputFolder: project.paths.outputFolder,
    projectName: project.config.project_name,
    projectArg: displayPath(process.cwd(), project.root) || ".",
    scenes,
    prompts,
    approvals: updated
  });
  const summary = summarize(updated);
  const created = listCreated([sheet, ...scenePackResults, ...approvedAssetResults, ...reviewBoards], project.root);
  const skipped = listSkipped([sheet, ...scenePackResults, ...approvedAssetResults, ...reviewBoards], project.root);

  return `Image approvals updated.

Approval data:
- ${displayPath(project.root, approvalsPath(project.paths.outputFolder))}
- ${displayPath(project.root, sheet.filePath)}

Created:
${created.join("\n") || "- none"}

Skipped existing:
${skipped.join("\n") || "- none"}

Review boards:
- output/04_images/review_board.md
- output/04_images/review_board.html

Scene asset folders:
- output/04_images/scenes/

Summary:
- approved: ${summary.approved}
- pending: ${summary.pending}
- rejected: ${summary.rejected}
- needs-regen: ${summary["needs-regen"]}`;
}

function summarize(approvals: Array<{ status: ApprovalStatus }>): Record<ApprovalStatus, number> {
  return approvals.reduce(
    (counts, approval) => {
      counts[approval.status] += 1;
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0, "needs-regen": 0 } as Record<ApprovalStatus, number>
  );
}
