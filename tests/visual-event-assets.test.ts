import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { approveImagesCommand } from "../src/commands/approve-images.js";
import { approveVisualAssetsCommand } from "../src/commands/approve-visual-assets.js";
import { exportProjectCommand } from "../src/commands/export-project.js";
import { generateImagesCommand } from "../src/commands/generate-images.js";
import { initProject } from "../src/commands/init.js";
import { packageProjectCommand } from "../src/commands/pack.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";
import { visualAssetsCommand } from "../src/commands/visual-assets.js";
import { visualEventsProjectCommand } from "../src/commands/visual-events.js";
import { configureTestAudio, simulateExternalAssets } from "./test-assets.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("supplemental visual assets", () => {
  it("requires reviewed raster cutaways, embeds previews and carries approved assets into Remotion", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-events-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");
      await configureTestAudio(projectPath);
      await prepareProjectCommand(projectPath, { force: true });
      await visualEventsProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await generateImagesCommand(projectPath, { provider: "mock", force: true });
      await expect(approveImagesCommand(projectPath, { approveAll: true, force: true })).rejects.toThrow(
        "Mock PNGs are layout placeholders"
      );
      await simulateExternalAssets(path.join(projectPath, "output", "04_images", "full"));
      await approveImagesCommand(projectPath, { approveAll: true, force: true });
      await visualAssetsCommand(projectPath, { provider: "mock", force: true });

      const reviewPath = path.join(projectPath, "output", "04_images", "events", "review_board.html");
      const reviewHtml = await fs.readFile(reviewPath, "utf8");
      expect(reviewHtml).toContain("data:image/png;base64,");
      await expect(packageProjectCommand(projectPath, { force: true })).rejects.toThrow(
        "every planned raster cutaway is present and approved"
      );

      await expect(approveVisualAssetsCommand(projectPath, { approveAll: true })).rejects.toThrow(
        "missing or mock supplemental assets"
      );
      await simulateExternalAssets(path.join(projectPath, "output", "04_images", "events"));
      await approveVisualAssetsCommand(projectPath, { approveAll: true });
      await packageProjectCommand(projectPath, { force: true });

      const data = await fs.readJson(
        path.join(projectPath, "output", "08_remotion", "src", "data", "project-data.json")
      );
      const eventAssets = data.scenes.flatMap((scene: { events: Array<{ asset: unknown }> }) => scene.events)
        .filter((event: { asset: unknown }) => event.asset);
      const progress = await fs.readFile(path.join(projectPath, "output", "PROGRESS.html"), "utf8");
      expect(eventAssets.length).toBeGreaterThan(0);
      expect(progress).toContain("Editor-ready pack");
      expect(progress).toContain("rendered MP4");

      const exportResult = await exportProjectCommand(projectPath, { force: true });
      const exportFolder = path.join(projectPath, "output", "exports");
      const exports = await fs.readdir(exportFolder);
      expect(exportResult).toContain("Portable production archive created");
      expect(exports.some((filename) => filename.endsWith("-handoff.zip"))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
