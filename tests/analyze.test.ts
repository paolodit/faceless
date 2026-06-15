import { describe, expect, it } from "vitest";
import { analyzeContent, analysisToMarkdown } from "../src/lib/analyze.js";
import { getProfile } from "../src/lib/profiles.js";
import type { ProjectConfig } from "../src/lib/schemas.js";

const config: ProjectConfig = {
  project_name: "test",
  profile: "tiktok",
  aspect_ratio: "9:16",
  input: {
    audio_file: "",
    script_file: "./input/script.txt",
    style_bible: "./input/style-bible.yml",
    character_bible: "./input/characters.yml"
  },
  output: { folder: "./output" },
  generation: {
    image_provider: "manual",
    preview_scenes: 5,
    scene_duration_target_seconds: 5,
    max_scene_duration_seconds: 8,
    min_scene_duration_seconds: 3,
    images_per_scene: 1,
    words_per_minute: 150
  },
  costs: {
    currency: "GBP",
    image_cost_per_generation: 0.04
  }
};

describe("content analysis", () => {
  it("flags long short-form hooks", () => {
    const analysis = analyzeContent(
      config,
      getProfile("tiktok")!,
      "This is a very long opening sentence that waits much too long before the viewer gets the point."
    );

    expect(analysis.hook.status).not.toBe("pass");
    expect(analysis.recommendations.some((item) => item.includes("first 2 seconds"))).toBe(true);
  });

  it("renders markdown", () => {
    const analysis = analyzeContent(config, getProfile("tiktok")!, "Relaxing today. Then everything changed.");
    expect(analysisToMarkdown(analysis)).toContain("# Content Analysis");
  });
});
