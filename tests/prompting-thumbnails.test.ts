import { describe, expect, it } from "vitest";
import { createPrompts, createThumbnailPrompts } from "../src/lib/prompting.js";
import type { ChannelBible, CharacterBible, ContinuityFile, Scene, SceneProductionPlan, StyleBible } from "../src/lib/schemas.js";

const scene: Scene = {
  scene_number: 1,
  start: "00:00.000",
  end: "00:03.000",
  duration_seconds: 3,
  transcript: "I thought I was going to relax today.",
  visual_goal: "Main Character on sofa.",
  characters: ["Main Character"],
  mood: "observational",
  notes: ""
};

const style: StyleBible = {
  style_name: "Test",
  visual_style: {
    medium: "simple cartoon",
    line_quality: "clean",
    colour_palette: "limited",
    background_style: "minimal",
    visual_complexity: "low",
    emotional_tone: "warm"
  },
  composition_rules: {
    aspect_ratio: "9:16",
    framing: "single idea",
    readability: "mobile readable",
    subject_size: "large subject"
  },
  prompt_rules: { always_include: ["consistent"], avoid: ["clutter"] }
};

const characters: CharacterBible = {
  characters: [{ name: "Main Character", prompt_anchor: "same character" }]
};

const channel: ChannelBible = {
  channel_name: "Test Channel",
  audience: "creative people",
  platform_priorities: ["tiktok"],
  voice: { tone: "warm" },
  content_pillars: [],
  recurring_formats: [],
  publishing: { hashtags: [] },
  prompt_rules: {
    always_include: ["single focal point"],
    avoid: ["tiny text"],
    thumbnail_rules: ["strong silhouette"],
    title_rules: []
  }
};

describe("prompting with channel bible", () => {
  it("adds channel guidance to scene prompts", () => {
    const prompts = createPrompts([scene], style, characters, "manual", channel);
    expect(prompts[0].prompt).toContain("Channel audience");
    expect(prompts[0].negative_prompt).toContain("tiny text");
  });

  it("adds scene production layout guidance to prompts", () => {
    const prompts = createPrompts([scene], style, characters, "manual", channel, [productionPlan()]);

    expect(prompts[0].prompt).toContain("Scene production layout: additive-slide");
    expect(prompts[0].prompt).toContain("Base frame:");
    expect(prompts[0].scene_production?.layout_mode).toBe("additive-slide");
  });

  it("creates thumbnail prompts", () => {
    const prompts = createThumbnailPrompts([scene], style, characters, channel);
    expect(prompts[0].prompt).toContain("Thumbnail composition");
  });

  it("carries story-world anchors into scene and thumbnail prompts", () => {
    const continuity: ContinuityFile = {
      world: {
        name: "Rainy story world",
        setting_anchor: "same rain-soaked promenade",
        visual_constants: ["consistent ink linework"]
      },
      characters: [{ name: "Main Character", visual_anchor: "red raincoat", scene_numbers: [1] }],
      locations: [{ id: "promenade", name: "Promenade", visual_anchor: "wet reflective pavement", scene_numbers: [1] }]
    };

    const scenePrompts = createPrompts([scene], style, characters, "manual", channel, [], continuity);
    const thumbnailPrompts = createThumbnailPrompts([scene], style, characters, channel, continuity);

    expect(scenePrompts[0].prompt).toContain("Story world: Rainy story world");
    expect(scenePrompts[0].prompt).toContain("wet reflective pavement");
    expect(thumbnailPrompts[0].prompt).toContain("consistent ink linework");
  });
});

function productionPlan(): SceneProductionPlan {
  return {
    scene_number: 1,
    layout_mode: "additive-slide",
    requested_layout: "auto",
    continuity_group: "scene_001",
    continuity: "scene",
    pacing_mode: "additive",
    base_frame: "Use the first frame as the stable visual anchor.",
    background: "quiet background",
    middle_ground: "main character on sofa",
    foreground: "large overlay",
    camera: "locked frame",
    motion: "slow push",
    layering: "base plus three layers",
    expected_assets: ["image.png", "overlay_text.csv"],
    layers: [],
    editor_notes: ["build over the same base frame"]
  };
}
