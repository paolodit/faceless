import path from "node:path";
import fs from "fs-extra";
import type { ApprovalStatus, ImageApproval, Prompt } from "./schemas.js";

export async function loadOrCreateApprovals(outputFolder: string, prompts: Prompt[]): Promise<ImageApproval[]> {
  const approvalPath = approvalsPath(outputFolder);
  const existing = (await fs.pathExists(approvalPath))
    ? ((await fs.readJson(approvalPath)) as ImageApproval[])
    : [];
  const byScene = new Map(existing.map((approval) => [approval.scene_number, approval]));

  return prompts.map((prompt) => {
    const current = byScene.get(prompt.scene_number);
    return {
      scene_number: prompt.scene_number,
      image_filename: prompt.image_filename,
      status: current?.status ?? "pending",
      notes: current?.notes ?? "",
      updated_at: current?.updated_at ?? new Date().toISOString()
    };
  });
}

export async function saveApprovals(outputFolder: string, approvals: ImageApproval[]): Promise<void> {
  await fs.ensureDir(path.dirname(approvalsPath(outputFolder)));
  await fs.writeJson(approvalsPath(outputFolder), approvals, { spaces: 2 });
}

export function updateApproval(
  approvals: ImageApproval[],
  options: { scene?: number; status?: ApprovalStatus; notes?: string; approveAll?: boolean }
): ImageApproval[] {
  const now = new Date().toISOString();

  return approvals.map((approval) => {
    if (options.approveAll || approval.scene_number === options.scene) {
      return {
        ...approval,
        status: options.status ?? "approved",
        notes: options.notes ?? approval.notes,
        updated_at: now
      };
    }

    return approval;
  });
}

export function approvalsMarkdown(approvals: ImageApproval[]): string {
  const rows = approvals
    .map(
      (approval) =>
        `| ${approval.scene_number} | ${approval.status} | ${approval.image_filename} | ${escapeCell(
          approval.notes
        )} |`
    )
    .join("\n");

  return `# Image Approval Sheet

| Scene | Status | Image | Notes |
| ---: | --- | --- | --- |
${rows}

Statuses:

- pending
- approved
- rejected
- needs-regen
`;
}

export function approvalsPath(outputFolder: string): string {
  return path.join(outputFolder, "04_images", "approvals.json");
}

export function approvalSheetPath(outputFolder: string): string {
  return path.join(outputFolder, "04_images", "approval_sheet.md");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
