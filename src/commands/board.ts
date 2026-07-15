import { displayPath, listCreated, listSkipped } from "../lib/files.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { loadValidProject } from "../lib/validation.js";

export async function boardProjectCommand(
  projectPath: string,
  options: { force?: boolean } = { force: true }
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const results = await writeProjectBoard(project, { force: options.force ?? true });
  const created = listCreated(results, project.root);
  const skipped = listSkipped(results, project.root);
  const projectArg = displayPath(process.cwd(), project.root) || ".";

  return `Project board

Review:
- output/BOARD.html
- output/BOARD.md
- output/SESSION_HANDOFF.md

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next:
video-pack wizard --project ${projectArg}`;
}
