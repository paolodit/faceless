import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { claimsProjectCommand } from "../src/commands/claims.js";
import { initProject } from "../src/commands/init.js";
import { nextProjectCommand } from "../src/commands/next.js";
import { planProjectCommand } from "../src/commands/plan.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { claimReviewToMarkdown, createClaimReview, isClaimReviewCurrent, writeClaimReview } from "../src/lib/claims.js";
import type { EvidenceFile, Scene } from "../src/lib/schemas.js";

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
    transcript: "A prompt is the instruction you give an AI.",
    visual_goal: "A clear prompt card.",
    characters: [],
    mood: "clear",
    notes: ""
  },
  {
    scene_number: 2,
    start: "00:03.000",
    end: "00:06.000",
    duration_seconds: 3,
    transcript: "Constraints beat hope when you need a dependable workflow.",
    visual_goal: "A contrast card.",
    characters: [],
    mood: "direct",
    notes: ""
  }
];

describe("claim review", () => {
  it("maps source-backed and declared opinion cards to scenes", () => {
    const evidence: EvidenceFile = {
      claims: [
        {
          id: "prompt-definition",
          claim: "A prompt is the instruction you give an AI.",
          support_type: "source",
          source_title: "Prompt engineering guide",
          source_url: "https://example.org/prompt-guide",
          scene_numbers: [1]
        },
        {
          id: "constraints-opinion",
          claim: "Constraints beat hope when you need a dependable workflow.",
          support_type: "editorial-opinion",
          notes: "A declared point of view.",
          scene_numbers: [2]
        }
      ]
    };

    const review = createClaimReview({ scenes, evidence, evidenceFile: "input/evidence.yml" });

    expect(review.status).toBe("ready");
    expect(review.summary.supported_claims).toBe(1);
    expect(review.summary.declared_claims).toBe(1);
    expect(review.summary.scenes_unmapped).toBe(0);
    expect(claimReviewToMarkdown("sample", review)).toContain("automatic fact check");
  });

  it("asks for a fresh review when scenes change", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-claims-freshness-"));
    cleanupPaths.push(root);
    const outputFolder = path.join(root, "output");
    const evidence: EvidenceFile = {
      claims: [
        {
          id: "prompt-definition",
          claim: "A prompt is the instruction you give an AI.",
          support_type: "source",
          source_title: "Prompt engineering guide",
          source_url: "https://example.org/prompt-guide",
          scene_numbers: [1]
        }
      ]
    };
    await fs.ensureDir(path.join(outputFolder, "02_scenes"));
    await fs.writeJson(path.join(outputFolder, "02_scenes", "scenes.json"), scenes);
    await writeClaimReview({ projectName: "sample", outputFolder, scenes, evidence, force: true });

    expect(await isClaimReviewCurrent({ outputFolder, evidence })).toBe(true);

    await fs.writeJson(path.join(outputFolder, "02_scenes", "scenes.json"), [
      { ...scenes[0], transcript: "A prompt is a detailed instruction you give an AI." },
      scenes[1]
    ]);
    expect(await isClaimReviewCurrent({ outputFolder, evidence })).toBe(false);
  });

  it("makes claim review the next guided LinkedIn step after scenes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-claims-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample", { type: "linkedin" });
      const projectPath = path.join(root, "sample");
      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      await prepareProjectCommand(projectPath, { force: true });

      const output = await nextProjectCommand(projectPath, { force: true });

      expect(output).toContain("Ran next step: Review LinkedIn claims and support");
      expect(await fs.pathExists(path.join(projectPath, "output", "00_analysis", "claim_review.md"))).toBe(true);
      expect(await claimsProjectCommand(projectPath, { force: true })).toContain("Claim review generated.");
    } finally {
      process.chdir(cwd);
    }
  });
});
