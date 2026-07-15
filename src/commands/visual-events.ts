import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped } from "../lib/files.js";
import type { Scene } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { listLocalAssetReferences, writeVisualEventOutputs } from "../lib/visual-events.js";

export async function visualEventsProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");

  if (!(await fs.pathExists(scenesPath))) {
    throw new Error(`Could not find scenes.json.

Run:
video-pack prepare --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const localAssets = await listLocalAssetReferences(project.paths.assetsFolder, project.root);
  const result = await writeVisualEventOutputs({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    config: project.config,
    scenes,
    localAssets,
    force: options.force
  });
  const created = listCreated(result.results, project.root);
  const skipped = listSkipped(result.results, project.root);
  const eventCount = result.events.length;
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const disabled =
    !project.config.visual_events.enabled || project.config.visual_events.mode === "off"
      ? "\nVisual events are disabled in project.yml, so empty planning files were written."
      : "";

  return `Generated visual event plan.

Scenes planned: ${result.plans.length}
Visual events: ${eventCount}
Scene layouts: ${layoutSummary(result.plans)}
Local assets found: ${localAssets.length}${disabled}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Review:
- output/02_scenes/scene_production.html
- output/02_scenes/scene_production.md
- output/02_scenes/visual_events.md
- output/06_edit_pack/overlay_text.csv
- output/06_edit_pack/stock_asset_queries.csv
- output/06_edit_pack/asset_manifest.json

Next step:
video-pack prompts --project ${projectArg} --force`;
}

function layoutSummary(plans: Array<{ production?: { layout_mode: string } }>): string {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const layout = plan.production?.layout_mode ?? "unspecified";
    counts.set(layout, (counts.get(layout) ?? 0) + 1);
  }

  return [...counts.entries()].map(([layout, count]) => `${layout}: ${count}`).join(", ") || "none";
}
