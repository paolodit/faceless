import { displayPath, listCreated } from "../lib/files.js";
import { writeProjectBoard } from "../lib/project-board.js";
import type { ApprovalStatus } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import {
  getVisualEventAssetState,
  saveVisualEventApprovals,
  writeVisualEventReviewBoards,
  type VisualEventAssetApproval
} from "../lib/visual-event-assets.js";

export async function approveVisualAssetsCommand(
  projectPath: string,
  options: {
    event?: string;
    status?: ApprovalStatus;
    notes?: string;
    approveAll?: boolean;
  } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const state = await getVisualEventAssetState({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder
  });

  if (state.expected === 0) {
    throw new Error("No supplemental raster events are planned for this production.");
  }
  if (!options.approveAll && !options.event) {
    throw new Error("Use --event <event-id> with --status, or use --approve-all after human review.");
  }

  const status = options.status ?? (options.approveAll ? "approved" : undefined);
  if (!status) {
    throw new Error("Choose --status pending|approved|rejected|needs-regen.");
  }

  const targets = state.items.filter((item) => options.approveAll || item.event.event_id === options.event);
  if (targets.length === 0) {
    throw new Error(`Could not find supplemental visual event "${options.event}".`);
  }
  if (status === "approved") {
    const unavailable = targets
      .filter((item) => !item.assetExists || item.mockPlaceholder)
      .map((item) => item.event.event_id);
    if (unavailable.length > 0) {
      throw new Error(`Cannot approve missing or mock supplemental assets: ${unavailable.join(", ")}.

Generate or source real assets shown in:
output/04_images/events/review_board.html`);
    }
  }

  const targetIds = new Set(targets.map((item) => item.event.event_id));
  const updatedAt = new Date().toISOString();
  const approvals: VisualEventAssetApproval[] = state.items.map((item) =>
    targetIds.has(item.event.event_id)
      ? { ...item.approval, status, notes: options.notes ?? item.approval.notes, updated_at: updatedAt }
      : item.approval
  );
  const approvalWrite = await saveVisualEventApprovals(project.paths.outputFolder, approvals);
  const refreshed = await getVisualEventAssetState({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder
  });
  const reviewWrites = await writeVisualEventReviewBoards({
    projectName: project.config.project_name,
    projectArg,
    outputFolder: project.paths.outputFolder,
    state: refreshed
  });
  const boardWrites = await writeProjectBoard(project, { force: true });
  const created = listCreated([approvalWrite, ...reviewWrites, ...boardWrites], project.root);
  const next =
    refreshed.approved === refreshed.expected
      ? `All supplemental raster beats are approved. The agent can now build the editor pack.\n\nBehind the scenes:\nvideo-pack package --project ${projectArg} --force`
      : `Review the remaining ${refreshed.pending} raster beat${refreshed.pending === 1 ? "" : "s"} in output/04_images/events/review_board.html.`;

  return `Supplemental visual approvals updated.

Coverage:
- ${refreshed.realAvailable}/${refreshed.expected} real assets present
- ${refreshed.mockPlaceholders} mock placeholders
- ${refreshed.approved}/${refreshed.expected} approved

${next}

Refreshed artifacts:
- output/04_images/events/review_board.html
- output/PROGRESS.html
- output/NEXT.html

Created:
${created.join("\n") || "- none"}`;
}
