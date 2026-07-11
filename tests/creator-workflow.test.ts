import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { approveImagesCommand } from "../src/commands/approve-images.js";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { generateImagesCommand } from "../src/commands/generate-images.js";
import { initProject } from "../src/commands/init.js";
import { nextProjectCommand } from "../src/commands/next.js";
import { packageProjectCommand } from "../src/commands/pack.js";
import { planProjectCommand } from "../src/commands/plan.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { previewProjectCommand } from "../src/commands/preview.js";
import { proposalProjectCommand } from "../src/commands/proposal.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";
import { statusProjectCommand } from "../src/commands/status.js";
import { SCENE_LAYOUT_MODES } from "../src/lib/constants.js";
import { normalizeProductionPipelineName } from "../src/lib/pipelines.js";
import { validateProject } from "../src/lib/validation.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("creator types", () => {
  it.each([
    ["explainer", "narrated-explainer", "tiktok"],
    ["linkedin", "linkedin-vox-pop", "linkedin-video"],
    ["story", "narrated-visual-story", "tiktok"]
  ])("creates the %s route", async (type, pipeline, profile) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-type-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample", { type });
      const projectYaml = await fs.readFile(path.join(root, "sample", "project.yml"), "utf8");

      expect(projectYaml).toContain(`pipeline: "${pipeline}"`);
      expect(projectYaml).toContain(`profile: "${profile}"`);
    } finally {
      process.chdir(cwd);
    }
  });

  it("normalizes legacy pipeline names when loading existing projects", async () => {
    const { projectPath, restoreCwd } = await makeProject("legacy");

    try {
      const projectFile = path.join(projectPath, "project.yml");
      const yaml = await fs.readFile(projectFile, "utf8");
      await fs.writeFile(projectFile, yaml.replace('pipeline: "narrated-explainer"', 'pipeline: "faceless-explainer"'));

      const result = await validateProject(projectPath);
      expect(result.valid).toBe(true);
      expect(result.project?.config.pipeline).toBe("narrated-explainer");
    } finally {
      restoreCwd();
    }
  });

  it("does not expose the removed screen-demo route", () => {
    expect(normalizeProductionPipelineName("screen-demo")).toBeUndefined();
    expect(SCENE_LAYOUT_MODES).not.toContain("screen-demo");
  });
});

describe("asset-backed workflow gates", () => {
  it("does not treat an external prompt pack as real scene assets", async () => {
    const { projectPath, restoreCwd } = await makeProject("external-gate");

    try {
      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await previewProjectCommand(projectPath, { provider: "mock", force: true });
      await generateImagesCommand(projectPath, { provider: "external", force: true });
      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      await proposalProjectCommand(projectPath, { force: true });

      await expect(approveImagesCommand(projectPath, { approveAll: true })).rejects.toThrow(
        "Cannot approve scenes without real image or video assets"
      );
      await expect(packageProjectCommand(projectPath, { force: true })).rejects.toThrow(
        "Package is blocked until every scene has a real asset and is approved"
      );

      const next = await nextProjectCommand(projectPath);
      const status = await statusProjectCommand(projectPath);
      expect(next).toContain("Your prompt pack is ready");
      expect(status).toContain("real-scene-assets");
      expect(status).toContain("external/manual prompt pack is ready");
    } finally {
      restoreCwd();
    }
  });

  it("packages normally only after real assets are approved", async () => {
    const { projectPath, restoreCwd } = await makeProject("approved-package", "linkedin");

    try {
      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await generateImagesCommand(projectPath, { provider: "mock", force: true });
      await approveImagesCommand(projectPath, { approveAll: true, force: true });

      const output = await packageProjectCommand(projectPath, { force: true });
      const copyPack = await fs.readJson(path.join(projectPath, "output", "07_publish", "copy_pack.json"));

      expect(output).toContain("ready for editor assembly");
      expect(copyPack.creator_type).toBe("linkedin-vox-pop");
      expect(copyPack.publishing_angle).toContain("credible point of view");
      expect(copyPack.source_review.status).toBe("needs-review");
      expect(copyPack.source_review.warnings.length).toBeGreaterThan(0);
      expect(await fs.pathExists(path.join(projectPath, "output", "00_analysis", "claim_review.md"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "README_NEXT_STEPS.md"))).toBe(true);
    } finally {
      restoreCwd();
    }
  });
});

async function makeProject(
  name: string,
  type: "explainer" | "linkedin" | "story" = "explainer"
): Promise<{ projectPath: string; restoreCwd: () => void }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `video-pack-${name}-`));
  cleanupPaths.push(root);
  const cwd = process.cwd();
  process.chdir(root);
  await initProject("sample", { type });

  return {
    projectPath: path.join(root, "sample"),
    restoreCwd: () => process.chdir(cwd)
  };
}
