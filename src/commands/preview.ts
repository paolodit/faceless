import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { writeMockPng } from "../lib/mock-png.js";
import { generateImageWithOpenAI } from "../lib/openai.js";
import { normalizeImageProvider } from "../lib/providers.js";
import { promptsMarkdown } from "./prompts.js";
import type { Prompt } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function previewProjectCommand(
  projectPath: string,
  options: { count?: string | number; force?: boolean; provider?: string } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");

  if (!(await fs.pathExists(promptsPath))) {
    throw new Error(`Could not find prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const count = Math.max(1, Number(options.count ?? project.config.generation.preview_scenes));
  const selected = prompts.slice(0, count);
  const provider = normalizeImageProvider(options.provider ?? project.config.generation.image_provider);
  const previewFolder = path.join(project.paths.outputFolder, "04_images", "preview");

  if (provider === "manual" || provider === "external") {
    const results = await Promise.all([
      writeJsonFile(path.join(previewFolder, "preview_prompts.json"), selected, options),
      writeTextFile(path.join(previewFolder, "preview_prompts.md"), promptsMarkdown(selected), options)
    ]);

    return previewMessage(project.root, previewFolder, listCreated(results, project.root), listSkipped(results, project.root));
  }

  if (provider === "mock") {
    const writeResults = await Promise.all(
      selected.map(async (prompt) => {
        const written = await writeMockPng({
          filePath: path.join(previewFolder, prompt.image_filename),
          aspectRatio: project.config.aspect_ratio,
          sceneNumber: prompt.scene_number,
          start: prompt.image_filename.match(/_(\d{2}-\d{2})_to_/)?.[1]?.replace("-", ":") ?? "00:00",
          end: prompt.image_filename.match(/_to_(\d{2}-\d{2})\.png$/)?.[1]?.replace("-", ":") ?? "00:00",
          force: options.force
        });
        return { filePath: path.join(previewFolder, prompt.image_filename), written };
      })
    );

    return previewMessage(project.root, previewFolder, listCreated(writeResults, project.root), listSkipped(writeResults, project.root));
  }

  if (provider === "openai") {
    const writeResults = [];
    for (const prompt of selected) {
      const result = await generateImageWithOpenAI({
        prompt: prompt.prompt,
        outputPath: path.join(previewFolder, prompt.image_filename),
        config: project.config,
        force: options.force
      });
      writeResults.push({ filePath: result.filePath, written: result.written });
    }
    await writeJsonFile(
      path.join(previewFolder, "openai_generation_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        count: selected.length,
        files: writeResults.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        })),
        model: project.config.providers.openai.image_model,
        size: project.config.providers.openai.image_size,
        quality: project.config.providers.openai.image_quality,
        output_format: project.config.providers.openai.image_output_format
      },
      { force: true }
    );

    return previewMessage(project.root, previewFolder, listCreated(writeResults, project.root), listSkipped(writeResults, project.root));
  }

  throw new Error(`Provider "${provider}" is scaffolded but not implemented yet.

Use:
video-pack preview --project ${projectPath} --provider manual
video-pack preview --project ${projectPath} --provider external
video-pack preview --project ${projectPath} --provider mock
video-pack preview --project ${projectPath} --provider openai`);
}

function previewMessage(
  projectRoot: string,
  previewFolder: string,
  created: string[],
  skipped: string[]
): string {
  return `Preview ready.

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Review:
${displayPath(projectRoot, previewFolder)}/

If the visual style is right, run:
video-pack generate-images --project ${displayPath(process.cwd(), projectRoot) || "."}

If it is wrong, edit:
input/style-bible.yml
output/03_prompts/prompts.json

Then rerun:
video-pack preview --project ${displayPath(process.cwd(), projectRoot) || "."} --count 5`;
}
