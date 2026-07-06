import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { generateImagesCommand } from "../src/commands/generate-images.js";
import { generateSceneVideosCommand } from "../src/commands/generate-scene-videos.js";
import { initProject } from "../src/commands/init.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";
import { sceneAssetsCommand } from "../src/commands/scene-assets.js";
import { upscaleImagesCommand } from "../src/commands/upscale-images.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("scene asset packs", () => {
  it("creates per-scene folders from generated images", async () => {
    const { projectPath, restoreCwd } = await makeProject("scene-assets");

    try {
      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await generateImagesCommand(projectPath, { provider: "mock", force: true });

      const sceneFolder = path.join(projectPath, "output", "04_images", "scenes", "scene_001");
      expect(await fs.pathExists(path.join(sceneFolder, "prompt.md"))).toBe(true);
      expect(await fs.pathExists(path.join(sceneFolder, "scene_production.md"))).toBe(true);
      expect(await fs.readFile(path.join(sceneFolder, "prompt.md"), "utf8")).toContain("Layout:");
      expect(await fs.pathExists(path.join(sceneFolder, "image.png"))).toBe(true);
      expect(await fs.pathExists(path.join(sceneFolder, "upscaled"))).toBe(true);
      expect(await fs.pathExists(path.join(sceneFolder, "video"))).toBe(true);
    } finally {
      restoreCwd();
    }
  });

  it("writes manual upscale and Higgsfield video handoff requests", async () => {
    const { projectPath, restoreCwd } = await makeProject("scene-handoff");

    try {
      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await generateImagesCommand(projectPath, { provider: "mock", force: true });
      await sceneAssetsCommand(projectPath, { force: true });

      const upscaleOutput = await upscaleImagesCommand(projectPath, {
        provider: "manual",
        scene: "1",
        force: true
      });
      const videoOutput = await generateSceneVideosCommand(projectPath, {
        provider: "higgsfield",
        scene: "1",
        force: true
      });
      const sceneFolder = path.join(projectPath, "output", "04_images", "scenes", "scene_001");

      expect(upscaleOutput).toContain("Image upscale step complete");
      expect(videoOutput).toContain("Scene video step complete");
      expect(await fs.pathExists(path.join(sceneFolder, "upscaled", "request.md"))).toBe(true);
      expect(await fs.pathExists(path.join(sceneFolder, "video", "request.md"))).toBe(true);
      expect(await fs.readFile(path.join(sceneFolder, "video", "request.md"), "utf8")).toContain("Higgsfield");
    } finally {
      restoreCwd();
    }
  });
});

async function makeProject(name: string): Promise<{ projectPath: string; restoreCwd: () => void }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `video-pack-${name}-`));
  cleanupPaths.push(root);
  const cwd = process.cwd();
  process.chdir(root);
  await initProject("sample");

  return {
    projectPath: path.join(root, "sample"),
    restoreCwd: () => process.chdir(cwd)
  };
}
