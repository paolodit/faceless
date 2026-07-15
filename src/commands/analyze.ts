import path from "node:path";
import fs from "fs-extra";
import { analyzeContent, analysisToMarkdown } from "../lib/analyze.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { writeRouteQualityReview } from "../lib/route-quality.js";
import { loadValidProject } from "../lib/validation.js";

export async function analyzeProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const script = await fs.readFile(project.paths.scriptFile, "utf8");
  const analysis = analyzeContent(project.config, project.profile, script);
  const analysisFolder = path.join(project.paths.outputFolder, "00_analysis");
  const [analysisResults, routeResult] = await Promise.all([
    Promise.all([
      writeJsonFile(path.join(analysisFolder, "content_analysis.json"), analysis, options),
      writeTextFile(path.join(analysisFolder, "content_analysis.md"), analysisToMarkdown(analysis), options)
    ]),
    writeRouteQualityReview({
      projectName: project.config.project_name,
      outputFolder: project.paths.outputFolder,
      pipeline: project.config.pipeline,
      profile: project.config.profile,
      scriptText: script,
      characterNames: project.characterBible.characters.map((character) => character.name),
      force: options.force
    })
  ]);
  const results = [...analysisResults, ...routeResult.writes];
  const created = listCreated(results, project.root);
  const skipped = listSkipped(results, project.root);
  const urgent = analysis.checks.filter((check) => check.status === "needs-work");
  const watch = analysis.checks.filter((check) => check.status === "watch");

  return `Content analysis complete.

Platform fit: ${analysis.platform_fit.status}
Hook: ${analysis.hook.status} (${analysis.hook.estimated_seconds}s, target ${analysis.hook.target_seconds}s)
Estimated duration: ${analysis.estimated_duration_seconds}s
Estimated scenes: ${analysis.estimated_scenes}
Route review: ${routeResult.review.status} (${routeResult.review.score}/100)

Needs work:
${urgent.length > 0 ? urgent.map((check) => `- ${check.label}: ${check.detail}`).join("\n") : "- none"}

Watch:
${watch.length > 0 ? watch.map((check) => `- ${check.label}: ${check.detail}`).join("\n") : "- none"}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next step:
Review:
- output/00_analysis/route_review.html
- output/00_analysis/content_analysis.md

Then run:

video-pack plan --project ${displayPath(process.cwd(), project.root) || "."} --force`;
}
