import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { initProject } from "../src/commands/init.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("project init", () => {
  it("creates a clean project identity inside a nested private production path", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-init-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      const result = await initProject(path.join("productions", "sample"), { type: "linkedin" });
      const projectPath = path.join(root, "productions", "sample");
      const config = await fs.readFile(path.join(projectPath, "project.yml"), "utf8");
      const projectReadme = await fs.readFile(path.join(projectPath, "README_PROJECT.md"), "utf8");
      const handoff = await fs.readFile(path.join(projectPath, "output", "SESSION_HANDOFF.md"), "utf8");

      expect(config).toContain('project_name: "sample"');
      expect(config).not.toContain('project_name: "productions/sample"');
      expect(projectReadme).toContain("# sample");
      expect(result).toContain("productions/sample/output/NEXT.html");
      expect(handoff).toContain("Creator type: LinkedIn POV / Vox Pop");
      expect(handoff).toContain("video-pack analyze --project productions/sample --force");
      expect(handoff).toContain("Confirm before using a paid provider");
      expect(await fs.pathExists(path.join(root, "productions", "sample", "output", "NEXT.html"))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
