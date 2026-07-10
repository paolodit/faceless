import fs from "fs-extra";
import { displayPath } from "../lib/files.js";
import { getProductionPipeline } from "../lib/pipelines.js";
import type { ProjectConfig } from "../lib/schemas.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";

interface Check {
  label: string;
  status: "ok" | "warn" | "info";
  detail: string;
}

export async function doctorCommand(projectPath?: string): Promise<string> {
  const checks: Check[] = [
    {
      label: "Node.js",
      status: "ok",
      detail: `${process.version} is running the CLI.`
    },
    {
      label: ".env safety",
      status: await gitignoreContainsEnv() ? "ok" : "warn",
      detail: await gitignoreContainsEnv()
        ? ".env is ignored by git."
        : ".env is not ignored by git. Add .env to .gitignore before storing API keys."
    },
    keyCheck("OPENAI_API_KEY", "OpenAI images and OpenAI transcription", true),
    keyCheck("MAGNIFIC_API_KEY", "Magnific images, upscales and scene videos", true),
    keyCheck("MAGNIFIC_WEBHOOK_KEY", "future Magnific webhook verification", true),
    keyCheck("PEXELS_API_KEY", "Pexels stock downloads", true),
    keyCheck("PIXABAY_API_KEY", "Pixabay stock downloads", true)
  ];

  if (!projectPath) {
    return `video-pack doctor

Environment:
${formatChecks(checks)}

No project checked.

Project check:
video-pack doctor --project ./my-video

Main workflow:
video-pack wizard --project ./my-video
video-pack next --project ./my-video`;
  }

  const validation = await validateProject(projectPath);
  if (!validation.valid || !validation.project) {
    return `video-pack doctor

Environment:
${formatChecks(checks)}

Project:
- warn: validation failed

${formatValidationFailure(validation.issues)}`;
  }

  const project = validation.project;
  const pipeline = getProductionPipeline(project.config.pipeline);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const projectChecks = providerReadinessChecks(project.config);
  const ready = projectChecks.every((check) => check.status !== "warn");

  return `video-pack doctor

Environment:
${formatChecks(checks)}

Project:
- ok: ${project.config.project_name}
- ok: creator type ${pipeline.title} (${pipeline.name})
- ok: profile ${project.config.profile}, aspect ratio ${project.config.aspect_ratio}
- ok: script ${displayPath(project.root, project.paths.scriptFile)}
- ok: output ${displayPath(project.root, project.paths.outputFolder)}

Configured provider readiness:
${formatChecks(projectChecks)}

Capability menu:
${capabilityMenu(project.config, projectArg)}

Ready for current config: ${ready ? "yes" : "needs attention"}

Next:
${ready ? `video-pack wizard --project ${projectArg}` : "Fix the warning above, then rerun doctor."}`;
}

function capabilityMenu(config: ProjectConfig, projectArg: string): string {
  return [
    `- Route proposal: video-pack proposal --project ${projectArg}`,
    `- Production board: video-pack board --project ${projectArg}`,
    `- Image generation: ${config.generation.image_provider}`,
    `- Image upscaling: manual or magnific`,
    `- Scene video clips: ${config.generation.scene_video_provider}`,
    `- Stock downloads: ${config.stock_assets.enabled ? config.stock_assets.provider : "off"}`
  ].join("\n");
}

function providerReadinessChecks(config: ProjectConfig): Check[] {
  const checks: Check[] = [];

  checks.push(providerCheck("Image provider", config.generation.image_provider, {
    openai: "OPENAI_API_KEY",
    magnific: "MAGNIFIC_API_KEY"
  }));

  checks.push(providerCheck("Scene video provider", config.generation.scene_video_provider, {
    magnific: "MAGNIFIC_API_KEY"
  }));

  checks.push(providerCheck("Transcription provider", config.transcription.provider, {
    openai: "OPENAI_API_KEY"
  }));

  if (!config.stock_assets.enabled) {
    checks.push({
      label: "Stock assets",
      status: "info",
      detail: "automatic stock downloads are off."
    });
  } else {
    checks.push(providerCheck("Stock provider", config.stock_assets.provider, {
      pexels: "PEXELS_API_KEY",
      pixabay: "PIXABAY_API_KEY"
    }));
  }

  return checks;
}

function providerCheck(label: string, provider: string, requiredKeys: Record<string, string>): Check {
  const requiredKey = requiredKeys[provider];
  if (!requiredKey) {
    return {
      label,
      status: "ok",
      detail: `${provider} does not need an API key.`
    };
  }

  return {
    label,
    status: process.env[requiredKey] ? "ok" : "warn",
    detail: process.env[requiredKey]
      ? `${provider} is configured and ${requiredKey} is present.`
      : `${provider} is configured but ${requiredKey} is missing.`
  };
}

function keyCheck(name: string, use: string, optional = false): Check {
  return {
    label: name,
    status: process.env[name] ? "ok" : optional ? "info" : "warn",
    detail: process.env[name] ? `present for ${use}.` : `missing${optional ? " (optional)" : ""}; used for ${use}.`
  };
}

function formatChecks(checks: Check[]): string {
  return checks.map((check) => `- ${check.status}: ${check.label} - ${check.detail}`).join("\n");
}

async function gitignoreContainsEnv(): Promise<boolean> {
  if (!(await fs.pathExists(".gitignore"))) {
    return false;
  }

  const raw = await fs.readFile(".gitignore", "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".env" || line === ".env.local" || line === ".env.*");
}
