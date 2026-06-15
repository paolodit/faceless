import { describe, expect, it } from "vitest";
import { getProfile } from "../src/lib/profiles.js";
import { estimateProductionPlan } from "../src/lib/plan.js";
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
    image_cost_per_generation: 0.04,
    cost_multiplier: 2
  }
};

describe("planning", () => {
  it("estimates scenes and costs", () => {
    const plan = estimateProductionPlan(config, getProfile("tiktok")!, "one ".repeat(150));
    expect(plan.estimatedDurationSeconds).toBe(60);
    expect(plan.estimatedScenes).toBe(8);
    expect(plan.fullCost).toBeCloseTo(0.32);
    expect(plan.cautiousCost).toBeCloseTo(0.64);
  });
});
