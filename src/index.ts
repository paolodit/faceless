#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { analyzeProjectCommand } from "./commands/analyze.js";
import { generateImagesCommand } from "./commands/generate-images.js";
import { initProject } from "./commands/init.js";
import { packageProjectCommand } from "./commands/pack.js";
import { planProjectCommand } from "./commands/plan.js";
import { prepareProjectCommand } from "./commands/prepare.js";
import { previewProjectCommand } from "./commands/preview.js";
import { profilesCommand } from "./commands/profiles.js";
import { promptsProjectCommand } from "./commands/prompts.js";
import { statusProjectCommand } from "./commands/status.js";
import { validateProjectCommand } from "./commands/validate.js";

const program = new Command();

program
  .name("video-pack")
  .description("Create editable production packs from narrated video scripts.")
  .version("0.1.0");

program
  .command("init")
  .argument("<project-name>")
  .description("Create a new video-pack project.")
  .action((projectName: string) => run(() => initProject(projectName)));

program
  .command("validate")
  .requiredOption("--project <path>", "Project folder")
  .description("Validate project inputs and config.")
  .action((options: { project: string }) => run(() => validateProjectCommand(options.project)));

program
  .command("profiles")
  .option("--json", "Print profile data as JSON")
  .description("List built-in output profiles.")
  .action((options: { json?: boolean }) => runSync(() => profilesCommand(options)));

program
  .command("status")
  .requiredOption("--project <path>", "Project folder")
  .description("Show pipeline progress and the next useful command.")
  .action((options: { project: string }) => run(() => statusProjectCommand(options.project)));

program
  .command("analyze")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated analysis")
  .description("Analyze hook strength, pacing and platform fit before production.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => analyzeProjectCommand(options.project, options))
  );

program
  .command("plan")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated cost estimate")
  .description("Estimate scenes, costs and output files.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => planProjectCommand(options.project, options))
  );

program
  .command("prepare")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated transcript and scenes")
  .description("Create transcript, timestamps and scenes from script text.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => prepareProjectCommand(options.project, options))
  );

program
  .command("prompts")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated prompts")
  .option("--provider <manual|mock|openai>", "Provider to stamp on prompt records")
  .description("Create image prompts from scenes, style and characters.")
  .action((options: { project: string; force?: boolean; provider?: string }) =>
    run(() => promptsProjectCommand(options.project, options))
  );

program
  .command("preview")
  .requiredOption("--project <path>", "Project folder")
  .option("--count <number>", "Number of prompt/images to prepare")
  .option("--force", "Overwrite generated preview files")
  .option("--provider <manual|mock|openai>", "Provider for preview")
  .description("Prepare a preview batch.")
  .action((options: { project: string; count?: string; force?: boolean; provider?: string }) =>
    run(() => previewProjectCommand(options.project, options))
  );

program
  .command("generate-images")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated image files")
  .option("--resume", "Continue missing images")
  .option("--from-scene <number>", "Start from this scene number")
  .option("--provider <manual|mock|openai>", "Provider for generation")
  .description("Prepare or generate full image set.")
  .action(
    (options: {
      project: string;
      force?: boolean;
      resume?: boolean;
      fromScene?: string;
      provider?: string;
    }) => run(() => generateImagesCommand(options.project, options))
  );

program
  .command("package")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated package files")
  .description("Create captions, edit manifest, run report and next-step guide.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => packageProjectCommand(options.project, options))
  );

await program.parseAsync(process.argv);

async function run(action: () => Promise<string>): Promise<void> {
  try {
    console.log(await action());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function runSync(action: () => string): void {
  try {
    console.log(action());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
