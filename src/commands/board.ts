import { listCreated, listSkipped } from "../lib/files.js";
import { createProjectBoardData, writeProjectBoard } from "../lib/project-board.js";
import { loadValidProject } from "../lib/validation.js";

export async function boardProjectCommand(
  projectPath: string,
  options: { force?: boolean } = { force: true }
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const results = await writeProjectBoard(project, { force: options.force ?? true });
  const data = await createProjectBoardData(project);
  const created = listCreated(results, project.root);
  const skipped = listSkipped(results, project.root);
  return `Project board

Review:
- output/NEXT.html
- output/DECISION.html
- output/PROGRESS.html
- output/BOARD.html
- output/BOARD.md
- output/SESSION_HANDOFF.md

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

What happens next:
${data.nextAction}

Behind the scenes:
${data.nextCommand}`;
}
