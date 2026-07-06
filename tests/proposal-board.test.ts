import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProjectCommand } from "../src/commands/analyze.js";
import { boardProjectCommand } from "../src/commands/board.js";
import { initProject } from "../src/commands/init.js";
import { planProjectCommand } from "../src/commands/plan.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { proposalProjectCommand } from "../src/commands/proposal.js";
import { visualEventsProjectCommand } from "../src/commands/visual-events.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("proposal and board", () => {
  it("writes the route proposal, decision log and project board", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-proposal-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");

      await analyzeProjectCommand(projectPath, { force: true });
      await planProjectCommand(projectPath, { force: true });
      const proposal = await proposalProjectCommand(projectPath, { force: true });
      await prepareProjectCommand(projectPath, { force: true });
      await visualEventsProjectCommand(projectPath, { force: true });
      const board = await boardProjectCommand(projectPath, { force: true });

      expect(proposal).toContain("Production proposal");
      expect(proposal).toContain("output/BOARD.html");
      expect(board).toContain("Project board");
      expect(await fs.pathExists(path.join(projectPath, "output", "00_proposal", "proposal.md"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "decision_log.md"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "BOARD.html"))).toBe(true);
      const boardHtml = await fs.readFile(path.join(projectPath, "output", "BOARD.html"), "utf8");
      expect(boardHtml).toContain("Next Command");
      expect(boardHtml).toContain("Review Files");
      expect(boardHtml).toContain("scene_production.html");
    } finally {
      process.chdir(cwd);
    }
  });
});
