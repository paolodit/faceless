import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { continuityProjectCommand } from "../src/commands/continuity.js";
import { initProject } from "../src/commands/init.js";
import { nextProjectCommand } from "../src/commands/next.js";
import { planProjectCommand } from "../src/commands/plan.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { createContinuityReview, isContinuityReviewCurrent, writeContinuityReview } from "../src/lib/continuity.js";
import type { ContinuityFile, Prompt, Scene } from "../src/lib/schemas.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

const scenes: Scene[] = [
  {
    scene_number: 1,
    start: "00:00.000",
    end: "00:03.000",
    duration_seconds: 3,
    transcript: "Mara runs along the rain-soaked promenade.",
    visual_goal: "Mara reaches the same stormy promenade.",
    characters: ["Mara"],
    mood: "urgent",
    notes: ""
  }
];

const continuity: ContinuityFile = {
  world: {
    name: "Storm Harbour",
    setting_anchor: "same rain-soaked promenade",
    visual_constants: ["consistent ink linework"]
  },
  characters: [{ name: "Mara", visual_anchor: "red raincoat", scene_numbers: [1] }],
  locations: [{ id: "promenade", name: "Promenade", visual_anchor: "wet reflective pavement", scene_numbers: [1] }]
};

const prompts: Prompt[] = [
  {
    scene_number: 1,
    image_filename: "scene_001.png",
    prompt: "Story world: Storm Harbour; setting: same rain-soaked promenade. World visual constants: consistent ink linework. Character continuity: Mara: red raincoat. Location continuity: Promenade: wet reflective pavement.",
    negative_prompt: "",
    provider: "manual"
  }
];

describe("story continuity review", () => {
  it("checks explicit world, character, location and prompt anchors", () => {
    const review = createContinuityReview({ scenes, continuity, prompts, continuityFile: "input/continuity.yml" });

    expect(review.status).toBe("ready");
    expect(review.summary.average_score).toBe(100);
    expect(review.scene_checks[0].prompt_coverage).toBe("covered");
  });

  it("asks for a new review when a prompt changes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-continuity-freshness-"));
    cleanupPaths.push(root);
    const outputFolder = path.join(root, "output");
    await fs.ensureDir(path.join(outputFolder, "02_scenes"));
    await fs.ensureDir(path.join(outputFolder, "03_prompts"));
    await fs.writeJson(path.join(outputFolder, "02_scenes", "scenes.json"), scenes);
    await fs.writeJson(path.join(outputFolder, "03_prompts", "prompts.json"), prompts);
    await writeContinuityReview({ projectName: "sample", outputFolder, scenes, continuity, prompts, force: true });

    expect(await isContinuityReviewCurrent({ outputFolder, continuity })).toBe(true);

    await fs.writeJson(path.join(outputFolder, "03_prompts", "prompts.json"), [
      { ...prompts[0], prompt: "A different image prompt without continuity anchors." }
    ]);
    expect(await isContinuityReviewCurrent({ outputFolder, continuity })).toBe(false);
  });

  it("makes continuity the next guided story step after scenes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-continuity-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample", { type: "story" });
      const projectPath = path.join(root, "sample");
      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      await prepareProjectCommand(projectPath, { force: true });

      const output = await nextProjectCommand(projectPath, { force: true });

      expect(output).toContain("Ran next step: Review story-world continuity");
      expect(await fs.pathExists(path.join(projectPath, "output", "02_scenes", "continuity_review.html"))).toBe(true);
      expect(await continuityProjectCommand(projectPath, { force: true })).toContain("Continuity review generated.");
    } finally {
      process.chdir(cwd);
    }
  });
});
