import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile } from "../lib/files.js";
import { formatMoney } from "../lib/format.js";
import { estimateProductionPlan } from "../lib/plan.js";
import { loadValidProject } from "../lib/validation.js";

export async function planProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const script = await fs.readFile(project.paths.scriptFile, "utf8");
  const plan = estimateProductionPlan(project.config, project.profile, script);
  const costEstimatePath = path.join(project.paths.outputFolder, "cost_estimate.json");
  const writeResult = await writeJsonFile(costEstimatePath, plan, options);
  const created = listCreated([writeResult], project.root);
  const skipped = listSkipped([writeResult], project.root);
  const warnings = plan.warnings.length > 0 ? `\nWarnings:\n${plan.warnings.map((warning) => `- ${warning}`).join("\n")}\n` : "";

  return `Production plan

Project: ${plan.projectName}
Pipeline: ${plan.pipelineTitle} (${plan.pipeline})
Profile: ${plan.profile}
Aspect ratio: ${plan.aspectRatio}

Script words: ${plan.scriptWords}
Estimated duration: ${plan.estimatedDurationSeconds} seconds
Estimated scenes: ${plan.estimatedScenes}
Images per scene: ${plan.imagesPerScene}
Preview scenes: ${plan.previewScenes}

Cost estimate:
Preview: ${plan.previewImages} images x ${formatMoney(
    plan.currency,
    plan.imageCostPerGeneration
  )} = ${formatMoney(plan.currency, plan.previewBaseCost)} base / ${formatMoney(
    plan.currency,
    plan.previewCautiousCost
  )} cautious
Full run: ${plan.fullImages} images x ${formatMoney(
    plan.currency,
    plan.imageCostPerGeneration
  )} = ${formatMoney(plan.currency, plan.fullBaseCost)} base / ${formatMoney(
    plan.currency,
    plan.fullCautiousCost
  )} cautious
Base estimate: ${formatMoney(plan.currency, plan.baseCost)}
Cautious estimate: ${formatMoney(plan.currency, plan.cautiousCost)}
Cost multiplier: ${plan.costMultiplier}x

Actual costs can vary by provider, model, quality, image size, retries and provider billing behaviour.
${warnings}
Expected outputs:
${plan.expectedFiles.map((file) => `- ${file}`).join("\n")}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

No generation has happened yet.

Next step:
video-pack proposal --project ${displayPath(process.cwd(), project.root) || "."}`;
}
