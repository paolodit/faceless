import path from "node:path";
import fs from "fs-extra";
import { writeClaimReview } from "../lib/claims.js";
import { displayPath, listCreated, listSkipped } from "../lib/files.js";
import type { Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function claimsProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);

  if (project.config.pipeline !== "linkedin-vox-pop") {
    return `Claim review is a LinkedIn POV / vox-pop checkpoint.

This project is ${project.config.pipeline}, so no source-review stage is required.`;
  }

  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  if (!(await fs.pathExists(scenesPath))) {
    throw new Error(`Could not find scenes.json.

Run:
video-pack prepare --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const result = await writeClaimReview({
    projectName: project.config.project_name,
    outputFolder: project.paths.outputFolder,
    scenes,
    evidence: project.evidence,
    evidenceFile: project.paths.evidenceFile ? displayPath(project.root, project.paths.evidenceFile) : undefined,
    force: options.force
  });

  return `Claim review generated.

Status: ${result.review.status}
Claims: ${result.review.summary.claims}
Unmapped scene statements: ${result.review.summary.scenes_unmapped}
Claims needing source detail: ${result.review.summary.claims_needing_source}

Created:
${listCreated(result.writes, project.root).join("\n") || "- none"}

Skipped existing:
${listSkipped(result.writes, project.root).join("\n") || "- none"}

Review:
${displayPath(project.root, project.paths.outputFolder)}/00_analysis/claim_review.md`;
}
