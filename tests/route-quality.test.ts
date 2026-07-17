import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { initProject } from "../src/commands/init.js";
import { nextProjectCommand } from "../src/commands/next.js";
import { createRouteQualityReview, isRouteQualityReviewCurrent } from "../src/lib/route-quality.js";
import { loadValidProject } from "../src/lib/validation.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("route-specific script review", () => {
  it("checks the Short Explainer question-answer-example-takeaway promise", () => {
    const review = createRouteQualityReview({
      pipeline: "narrated-explainer",
      profile: "youtube-shorts",
      scriptText: `Why do unfinished tasks stay in your head?

The simple answer is attention. Incomplete work stays easier to recall because your brain has not closed the loop.

Imagine answering nine emails but leaving one awkward reply open.

So write down the next action. Give your brain somewhere else to keep it.`
    });

    expect(review.pipeline_title).toBe("Short Explainer");
    expect(review.status).toBe("ready");
    expect(review.checks.map((check) => check.id)).toEqual([
      "premise",
      "explanation",
      "example",
      "progression",
      "landing"
    ]);
  });

  it("checks LinkedIn POV and Story against different promises", () => {
    const linkedin = createRouteQualityReview({
      pipeline: "linkedin-vox-pop",
      profile: "linkedin-video",
      scriptText: "Everyone says buy more AI tools. I disagree because teams need a clear decision first. Start with the repetitive work, then ask what would make it less fragile. What are you seeing in practice?"
    });
    const story = createRouteQualityReview({
      pipeline: "narrated-visual-story",
      profile: "tiktok",
      characterNames: ["Mara"],
      scriptText: "Mara lived beside the old pier. Then the water rose and she had to save the lighthouse key. By the time the storm cleared, Mara had become the keeper."
    });

    expect(linkedin.checks.map((check) => check.id)).toContain("stance");
    expect(linkedin.checks.map((check) => check.id)).not.toContain("payoff");
    expect(story.checks.map((check) => check.id)).toContain("payoff");
    expect(story.checks.map((check) => check.id)).not.toContain("support");
  });

  it("recognizes a direct correction, historical mechanism and loop ending", () => {
    const review = createRouteQualityReview({
      pipeline: "narrated-explainer",
      profile: "tiktok",
      scriptText: `Were bees unemployed before flowers?

Obviously not. Pollination came before bees.

Long before flowers, seed plants threw pollen into the wind. Then insects carried pollen between plants.

Bees evolved from predatory wasps and moved from hunting insects to collecting pollen.

Were bees unemployed before flowers?`
    });

    expect(review.status).toBe("ready");
    expect(review.rewrite_priorities).toEqual([]);
  });

  it("marks analysis stale after the script changes and guides the creator back", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-route-review-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample", { type: "explainer" });
      const projectPath = path.join(root, "sample");
      await analyzeProjectCommand(projectPath, { force: true });
      const project = await loadValidProject(projectPath);
      const originalScript = await fs.readFile(project.paths.scriptFile, "utf8");

      expect(
        await isRouteQualityReviewCurrent({
          outputFolder: project.paths.outputFolder,
          config: project.config,
          scriptText: originalScript,
          characterNames: project.characterBible.characters.map((character) => character.name)
        })
      ).toBe(true);

      await fs.writeFile(project.paths.scriptFile, `${originalScript}\nOne more unreviewed thought.`);
      const next = await nextProjectCommand(projectPath, { force: true });

      expect(next).toContain("Ran next step: Analyze script");
      expect(await fs.pathExists(path.join(project.paths.outputFolder, "00_analysis", "route_review.html"))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
