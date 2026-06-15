import { describe, expect, it } from "vitest";
import { createPrompts, createThumbnailPrompts } from "../src/lib/prompting.js";
import type { ChannelBible, CharacterBible, Scene, StyleBible } from "../src/lib/schemas.js";

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

  it("creates thumbnail prompts", () => {
    const prompts = createThumbnailPrompts([scene], style, characters, channel);
    expect(prompts[0].prompt).toContain("Thumbnail composition");
  });
});
