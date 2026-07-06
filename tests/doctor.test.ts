import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { doctorCommand } from "../src/commands/doctor.js";
import { initProject } from "../src/commands/init.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("doctor command", () => {
  it("prints setup readiness without a project", async () => {
    const output = await doctorCommand();

    expect(output).toContain("video-pack doctor");
    expect(output).toContain("Environment:");
    expect(output).toContain("No project checked.");
    expect(output).toContain("video-pack wizard");
  });

  it("warns when the configured image provider is missing its key", async () => {
    const originalOpenAIKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-doctor-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");
      const projectFile = path.join(projectPath, "project.yml");
      const projectYaml = await fs.readFile(projectFile, "utf8");
      await fs.writeFile(projectFile, projectYaml.replace('image_provider: "manual"', 'image_provider: "openai"'));

      const output = await doctorCommand(projectPath);

      expect(output).toContain("Configured provider readiness:");
      expect(output).toContain("openai is configured but OPENAI_API_KEY is missing");
      expect(output).toContain("Ready for current config: needs attention");
    } finally {
      process.chdir(cwd);
      if (originalOpenAIKey) {
        process.env.OPENAI_API_KEY = originalOpenAIKey;
      }
    }
  });
});
