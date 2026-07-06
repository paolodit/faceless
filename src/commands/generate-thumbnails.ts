import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { generateImageWithMagnific } from "../lib/magnific.js";
import { writeMockPng } from "../lib/mock-png.js";
import { generateImageWithOpenAI } from "../lib/openai.js";
import { normalizeImageProvider } from "../lib/providers.js";
import { writeThumbnailReviewBoards } from "../lib/review-board.js";
import type { ThumbnailPrompt } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { thumbnailPromptsMarkdown } from "./prompts.js";

export async function generateThumbnailsCommand(
  projectPath: string,
  options: { force?: boolean; provider?: string } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const promptPath = path.join(project.paths.outputFolder, "03_prompts", "thumbnail_prompts.json");

  if (!(await fs.pathExists(promptPath))) {
    throw new Error(`Could not find thumbnail_prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  const prompts = (await fs.readJson(promptPath)) as ThumbnailPrompt[];
  const provider = normalizeImageProvider(options.provider ?? project.config.generation.image_provider);
  const thumbnailFolder = path.join(project.paths.outputFolder, "07_publish", "thumbnails");

  if (provider === "manual" || provider === "external") {
    const results = await Promise.all([
      writeJsonFile(path.join(thumbnailFolder, "thumbnail_prompts.json"), prompts, options),
      writeTextFile(path.join(thumbnailFolder, "thumbnail_prompts.md"), thumbnailPromptsMarkdown(prompts), options)
    ]);
    const reviewResults = await writeThumbnailReviewBoards({
      outputFolder: project.paths.outputFolder,
      projectName: project.config.project_name,
      prompts
    });
    const allResults = [...results, ...reviewResults];
    return message(project.root, thumbnailFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  if (provider === "mock") {
    const results = await Promise.all(
      prompts.map(async (prompt) => {
        const filePath = path.join(thumbnailFolder, prompt.image_filename);
        const written = await writeMockPng({
          filePath,
          aspectRatio: project.config.aspect_ratio,
          sceneNumber: prompt.thumbnail_number,
          start: "00:00",
          end: "THUMB",
          force: options.force
        });
        return { filePath, written };
      })
    );
    const reviewResults = await writeThumbnailReviewBoards({
      outputFolder: project.paths.outputFolder,
      projectName: project.config.project_name,
      prompts
    });
    const allResults = [...results, ...reviewResults];
    return message(project.root, thumbnailFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  if (provider === "openai") {
    const results = [];
    for (const prompt of prompts) {
      const result = await generateImageWithOpenAI({
        prompt: prompt.prompt,
        outputPath: path.join(thumbnailFolder, prompt.image_filename),
        config: project.config,
        force: options.force
      });
      results.push({ filePath: result.filePath, written: result.written });
    }
    await writeJsonFile(
      path.join(thumbnailFolder, "openai_thumbnail_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        count: prompts.length,
        model: project.config.providers.openai.image_model,
        files: results.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        }))
      },
      { force: true }
    );
    const reviewResults = await writeThumbnailReviewBoards({
      outputFolder: project.paths.outputFolder,
      projectName: project.config.project_name,
      prompts
    });
    const allResults = [...results, ...reviewResults];
    return message(project.root, thumbnailFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  if (provider === "magnific") {
    const results = [];
    for (const prompt of prompts) {
      const result = await generateImageWithMagnific({
        prompt: prompt.prompt,
        outputPath: path.join(thumbnailFolder, prompt.image_filename),
        config: project.config,
        force: options.force
      });
      results.push({ filePath: result.filePath, written: result.written });
    }
    await writeJsonFile(
      path.join(thumbnailFolder, "magnific_thumbnail_report.json"),
      {
        provider,
        generated_at: new Date().toISOString(),
        count: prompts.length,
        model: project.config.providers.magnific.image_model,
        resolution: project.config.providers.magnific.image_resolution,
        files: results.map((result) => ({
          file: displayPath(project.root, result.filePath),
          written: result.written
        }))
      },
      { force: true }
    );
    const reviewResults = await writeThumbnailReviewBoards({
      outputFolder: project.paths.outputFolder,
      projectName: project.config.project_name,
      prompts
    });
    const allResults = [...results, ...reviewResults];
    return message(project.root, thumbnailFolder, listCreated(allResults, project.root), listSkipped(allResults, project.root));
  }

  throw new Error(`Provider "${provider}" cannot generate thumbnails yet.`);
}

function message(projectRoot: string, folder: string, created: string[], skipped: string[]): string {
  return `Thumbnail generation complete.

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Review:
${displayPath(projectRoot, folder)}/

Review boards:
- ${displayPath(projectRoot, path.join(folder, "review_board.md"))}
- ${displayPath(projectRoot, path.join(folder, "review_board.html"))}`;
}
