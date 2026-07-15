import path from "node:path";
import fs from "fs-extra";
import { appendDecisionLogEntry } from "../lib/decision-log.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { formatMoney } from "../lib/format.js";
import { estimateProductionPlan, type ProductionPlan } from "../lib/plan.js";
import { getProductionPipeline, type ProductionPipeline } from "../lib/pipelines.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { loadValidProject } from "../lib/validation.js";

interface ProviderReadiness {
  label: string;
  provider: string;
  status: "ready" | "manual" | "missing-key";
  detail: string;
}

interface ProductionProposal {
  projectName: string;
  pipeline: string;
  pipelineTitle: string;
  profile: string;
  aspectRatio: string;
  estimatedDurationSeconds: number;
  estimatedScenes: number;
  imageProvider: string;
  sceneVideoProvider: string;
  providerReadiness: ProviderReadiness[];
  route: string[];
  humanCheckpoints: string[];
  cost: {
    currency: string;
    previewBaseCost: number;
    previewCautiousCost: number;
    fullBaseCost: number;
    fullCautiousCost: number;
  };
  risks: string[];
  recommendedNextCommands: string[];
}

export async function proposalProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const script = await fs.readFile(project.paths.scriptFile, "utf8");
  const plan = estimateProductionPlan(project.config, project.profile, script);
  const pipeline = getProductionPipeline(project.config.pipeline);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const proposal = createProposal(plan, pipeline, {
    imageProvider: project.config.generation.image_provider,
    sceneVideoProvider: project.config.generation.scene_video_provider,
    profile: project.config.profile,
    projectArg
  });
  const proposalFolder = path.join(project.paths.outputFolder, "00_proposal");
  const results = await Promise.all([
    writeJsonFile(path.join(proposalFolder, "proposal.json"), proposal, options),
    writeTextFile(path.join(proposalFolder, "proposal.md"), proposalMarkdown(proposal), options)
  ]);

  const decisionResults = await appendDecisionLogEntry(project.paths.outputFolder, {
    command: "proposal",
    decision: `Use ${pipeline.title} route`,
    reason: `Project config selects pipeline "${pipeline.name}" with image provider "${project.config.generation.image_provider}".`,
    context: {
      profile: project.config.profile,
      aspect_ratio: project.config.aspect_ratio,
      estimated_scenes: plan.estimatedScenes,
      image_provider: project.config.generation.image_provider,
      scene_video_provider: project.config.generation.scene_video_provider
    }
  });
  const boardResults = await writeProjectBoard(project, { force: true });

  const allResults = [...results, ...decisionResults, ...boardResults];
  const created = listCreated(allResults, project.root);
  const skipped = listSkipped(results, project.root);

  return `Production proposal

Project: ${proposal.projectName}
Pipeline: ${proposal.pipelineTitle} (${proposal.pipeline})
Profile: ${proposal.profile}
Estimated scenes: ${proposal.estimatedScenes}

Review:
- output/00_proposal/proposal.md
- output/decision_log.md
- output/BOARD.html

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Next step:
video-pack prepare --project ${projectArg} --force`;
}

function createProposal(
  plan: ProductionPlan,
  pipeline: ProductionPipeline,
  options: {
    imageProvider: string;
    sceneVideoProvider: string;
    profile: string;
    projectArg: string;
  }
): ProductionProposal {
  return {
    projectName: plan.projectName,
    pipeline: pipeline.name,
    pipelineTitle: pipeline.title,
    profile: plan.profile,
    aspectRatio: plan.aspectRatio,
    estimatedDurationSeconds: plan.estimatedDurationSeconds,
    estimatedScenes: plan.estimatedScenes,
    imageProvider: options.imageProvider,
    sceneVideoProvider: options.sceneVideoProvider,
    providerReadiness: providerReadiness(options.imageProvider, options.sceneVideoProvider),
    route: pipeline.defaultRoute,
    humanCheckpoints: pipeline.humanCheckpoints,
    cost: {
      currency: plan.currency,
      previewBaseCost: plan.previewBaseCost,
      previewCautiousCost: plan.previewCautiousCost,
      fullBaseCost: plan.fullBaseCost,
      fullCautiousCost: plan.fullCautiousCost
    },
    risks: [
      ...plan.warnings,
      ...routeRisks(pipeline, options.imageProvider, options.sceneVideoProvider)
    ],
    recommendedNextCommands: [
      `video-pack prepare --project ${options.projectArg} --force`,
      ...routeCheckpointCommands(pipeline, options.projectArg),
      `video-pack visual-events --project ${options.projectArg} --force`,
      `video-pack prompts --project ${options.projectArg} --force`,
      `video-pack preview --project ${options.projectArg} --count ${plan.previewScenes} --force`
    ]
  };
}

function routeCheckpointCommands(pipeline: ProductionPipeline, projectArg: string): string[] {
  if (pipeline.name === "linkedin-vox-pop") {
    return [`video-pack claims --project ${projectArg} --force`];
  }
  if (pipeline.name === "narrated-visual-story") {
    return [`video-pack continuity --project ${projectArg} --force`];
  }
  return [];
}

function providerReadiness(imageProvider: string, sceneVideoProvider: string): ProviderReadiness[] {
  return [
    readiness("Image provider", imageProvider, {
      openai: "OPENAI_API_KEY",
      magnific: "MAGNIFIC_API_KEY"
    }),
    readiness("Scene video provider", sceneVideoProvider, {
      magnific: "MAGNIFIC_API_KEY"
    })
  ];
}

function readiness(label: string, provider: string, requiredKeys: Record<string, string>): ProviderReadiness {
  const requiredKey = requiredKeys[provider];
  if (!requiredKey) {
    return {
      label,
      provider,
      status: "manual",
      detail: `${provider} can run without an API key.`
    };
  }

  return {
    label,
    provider,
    status: process.env[requiredKey] ? "ready" : "missing-key",
    detail: process.env[requiredKey]
      ? `${requiredKey} is present.`
      : `${requiredKey} is missing; use a manual/mock provider or add the key before API generation.`
  };
}

function routeRisks(
  pipeline: ProductionPipeline,
  imageProvider: string,
  sceneVideoProvider: string
): string[] {
  const risks: string[] = [];

  if (imageProvider === "openai" || imageProvider === "magnific") {
    risks.push("Image generation may incur provider costs; use preview and approval checkpoints before full runs.");
  }

  if (sceneVideoProvider === "magnific" || sceneVideoProvider === "higgsfield") {
    risks.push("Scene video generation can multiply cost and review time; use it selectively for scenes that need motion.");
  }

  if (pipeline.name === "linkedin-vox-pop") {
    risks.push("LinkedIn POV videos need a defensible claim, readable overlays and manual source/license review for any stock cutaways.");
  }

  if (pipeline.name === "narrated-visual-story") {
    risks.push("Visual stories need continuity review before motion work; regenerate or replace inconsistent character or place images early.");
  }

  return risks;
}

function proposalMarkdown(proposal: ProductionProposal): string {
  return `# Production Proposal

Project: ${proposal.projectName}
Pipeline: ${proposal.pipelineTitle} (${proposal.pipeline})
Profile: ${proposal.profile}
Aspect ratio: ${proposal.aspectRatio}

## Production Intent

This project is set up as a ${proposal.pipelineTitle}. Expect ${proposal.estimatedScenes} scenes across about ${proposal.estimatedDurationSeconds} seconds.

## Route

${proposal.route.map((step) => `- ${step}`).join("\n")}

## Provider Readiness

${proposal.providerReadiness
  .map((item) => `- ${item.label}: ${item.provider} (${item.status}) - ${item.detail}`)
  .join("\n")}

## Cost Watch

- Preview estimate: ${formatMoney(proposal.cost.currency, proposal.cost.previewBaseCost)} base / ${formatMoney(
    proposal.cost.currency,
    proposal.cost.previewCautiousCost
  )} cautious
- Full image estimate: ${formatMoney(proposal.cost.currency, proposal.cost.fullBaseCost)} base / ${formatMoney(
    proposal.cost.currency,
    proposal.cost.fullCautiousCost
  )} cautious

## Human Checkpoints

${proposal.humanCheckpoints.map((checkpoint) => `- ${checkpoint}`).join("\n")}

## Risks / Decisions

${proposal.risks.length > 0 ? proposal.risks.map((risk) => `- ${risk}`).join("\n") : "- No major route risks detected."}

## Recommended Next Commands

\`\`\`bash
${proposal.recommendedNextCommands.join("\n")}
\`\`\`

Decision: continue with this route, or edit \`project.yml\` before asset production if the pipeline/provider choice is wrong.
`;
}
