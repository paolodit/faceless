import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { initProject } from "../src/commands/init.js";
import { nextProjectCommand } from "../src/commands/next.js";
import { planProjectCommand } from "../src/commands/plan.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { previewProjectCommand } from "../src/commands/preview.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("next command", () => {
  it("runs the first safe workflow step", async () => {
    const { projectPath, restoreCwd } = await makeProject("next-first");

    try {
      const output = await nextProjectCommand(projectPath);

      expect(output).toContain("Ran next step: Analyze script");
      expect(await fs.pathExists(path.join(projectPath, "output", "00_analysis", "content_analysis.md"))).toBe(true);
    } finally {
      restoreCwd();
    }
  });

  it("does not run paid image generation without explicit permission", async () => {
    const { projectPath, restoreCwd } = await makeProject("next-paid");

    try {
      const projectFile = path.join(projectPath, "project.yml");
      const projectYaml = await fs.readFile(projectFile, "utf8");
      await fs.writeFile(projectFile, projectYaml.replace('image_provider: "manual"', 'image_provider: "openai"'));

      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await previewProjectCommand(projectPath, { force: true, provider: "mock" });

      const output = await nextProjectCommand(projectPath);

      expect(output).toContain("may incur API costs");
      expect(output).toContain("--allow-paid");
      expect(await fs.pathExists(path.join(projectPath, "output", "04_images", "full"))).toBe(false);
    } finally {
      restoreCwd();
    }
  });

  it("runs the proposal checkpoint after planning", async () => {
    const { projectPath, restoreCwd } = await makeProject("next-proposal");

    try {
      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });

      const output = await nextProjectCommand(projectPath);

      expect(output).toContain("Ran next step: Review production route");
      expect(await fs.pathExists(path.join(projectPath, "output", "00_proposal", "proposal.md"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "BOARD.html"))).toBe(true);
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
