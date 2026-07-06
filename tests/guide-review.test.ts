import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { generateImagesCommand } from "../src/commands/generate-images.js";
import { guideCommand } from "../src/commands/guide.js";
import { initProject } from "../src/commands/init.js";
import { planProjectCommand } from "../src/commands/plan.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { previewProjectCommand } from "../src/commands/preview.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";
import {
  imageReviewBoardMarkdown,
  thumbnailReviewBoardMarkdown,
  type ImageReviewItem,
  type ThumbnailReviewItem
} from "../src/lib/review-board.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("creator guide", () => {
  it("prints pre-project creator steps without a project", async () => {
    const guide = await guideCommand();
    expect(guide).toContain("before the project folder stage");
    expect(guide).toContain("video-pack init my-video");
    expect(guide).toContain("docs/CHATGPT_SETUP.md");
  });

  it("recommends image approval after full images are generated", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-guide-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");

      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await previewProjectCommand(projectPath, { provider: "mock", force: true });
      await generateImagesCommand(projectPath, { provider: "mock", force: true });

      const guide = await guideCommand(projectPath);
      expect(guide).toContain("Do this next:");
      expect(guide).toContain("video-pack approve-images");
      expect(guide).toContain("output/04_images/review_board.md");
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("review boards", () => {
  it("renders image rows for present and missing images", () => {
    const items: ImageReviewItem[] = [
      imageItem({ sceneNumber: 1, imageExists: true }),
      imageItem({ sceneNumber: 2, imageExists: false })
    ];

    const markdown = imageReviewBoardMarkdown({ projectName: "sample", items });
    expect(markdown).toContain("![Scene 1](full/scene_001.png)");
    expect(markdown).toContain("Missing image. Expected path: `full/scene_002.png`");
    expect(markdown).toContain("video-pack approve-images");
  });

  it("renders thumbnail rows for prompt-only and image-present states", () => {
    const items: ThumbnailReviewItem[] = [
      thumbnailItem({ thumbnailNumber: 1, imageExists: true }),
      thumbnailItem({ thumbnailNumber: 2, imageExists: false })
    ];

    const markdown = thumbnailReviewBoardMarkdown({ projectName: "sample", items });
    expect(markdown).toContain("![Thumbnail 1](thumbnail_01.png)");
    expect(markdown).toContain("Missing image. Expected path: `thumbnail_02.png`");
    expect(markdown).toContain("Selection notes");
  });
});

function imageItem(overrides: Partial<ImageReviewItem>): ImageReviewItem {
  const sceneNumber = overrides.sceneNumber ?? 1;

  return {
    sceneNumber,
    status: "pending",
    notes: "",
    transcript: "A line of narration.",
    visualGoal: "A clear visual goal.",
    prompt: "A generated prompt.",
    imageFilename: `scene_${String(sceneNumber).padStart(3, "0")}.png`,
    imageRelativePath: `full/scene_${String(sceneNumber).padStart(3, "0")}.png`,
    imageExists: false,
    approveCommand: `video-pack approve-images --project sample --scene ${sceneNumber} --status approved`,
    regenCommand: `video-pack approve-images --project sample --scene ${sceneNumber} --status needs-regen`,
    ...overrides
  };
}

function thumbnailItem(overrides: Partial<ThumbnailReviewItem>): ThumbnailReviewItem {
  const thumbnailNumber = overrides.thumbnailNumber ?? 1;

  return {
    thumbnailNumber,
    title: "Opening tension",
    rationale: "Good opening frame.",
    prompt: "A thumbnail prompt.",
    imageFilename: `thumbnail_${String(thumbnailNumber).padStart(2, "0")}.png`,
    imageRelativePath: `thumbnail_${String(thumbnailNumber).padStart(2, "0")}.png`,
    imageExists: false,
    selectionNotes: "Pick this if it is clearest.",
    ...overrides
  };
}
