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
import type { ApprovalStatus, Prompt } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

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

  if (!options.approveAll && !options.scene && options.status) {
    throw new Error("Use --scene <number> with --status, or use --approve-all.");
  }

  const status = options.status ?? (options.approveAll ? "approved" : undefined);
  if (status && !["pending", "approved", "rejected", "needs-regen"].includes(status)) {
    throw new Error(`Unknown approval status: ${status}`);
  }

  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const approvals = await loadOrCreateApprovals(project.paths.outputFolder, prompts);
  const updated = updateApproval(approvals, {
    scene: options.scene ? Number(options.scene) : undefined,
    status,
    notes: options.notes,
    approveAll: options.approveAll
  });

  await saveApprovals(project.paths.outputFolder, updated);
  const sheet = await writeTextFile(approvalSheetPath(project.paths.outputFolder), approvalsMarkdown(updated), {
    force: true
  });
  const summary = summarize(updated);

  return `Image approvals updated.

Approval data:
- ${displayPath(project.root, approvalsPath(project.paths.outputFolder))}
- ${displayPath(project.root, sheet.filePath)}

Created:
${listCreated([sheet], project.root).join("\n") || "- none"}

Skipped existing:
${listSkipped([sheet], project.root).join("\n") || "- none"}

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
