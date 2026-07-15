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
import { proposalProjectCommand } from "../src/commands/proposal.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";
import { visualEventsProjectCommand } from "../src/commands/visual-events.js";

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

  it("cascades a script edit through every dependent planning stage", async () => {
    const { projectPath, restoreCwd } = await makeProject("next-freshness");

    try {
      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      await proposalProjectCommand(projectPath, { force: true });
      await prepareProjectCommand(projectPath, { force: true });
      await visualEventsProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });

      const scriptPath = path.join(projectPath, "input", "script.txt");
      const script = await fs.readFile(scriptPath, "utf8");
      await fs.writeFile(scriptPath, `${script}\nA new final point changes the current production plan.\n`);

      expect(await nextProjectCommand(projectPath)).toContain("Ran next step: Analyze script");
      expect(await nextProjectCommand(projectPath)).toContain("Ran next step: Estimate scenes and cost");
      expect(await nextProjectCommand(projectPath)).toContain("Ran next step: Review production route");
      expect(await nextProjectCommand(projectPath)).toContain("Ran next step: Prepare scene timings");
      expect(await nextProjectCommand(projectPath)).toContain("Ran next step: Plan scene production and edit beats");
      expect(await nextProjectCommand(projectPath)).toContain("Ran next step: Create image prompts");
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
