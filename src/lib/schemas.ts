import { z } from "zod";
import type { AspectRatio, ImageProvider, ProfileName } from "./constants.js";

export const projectConfigSchema = z
  .object({
    project_name: z.string().min(1),
    profile: z.string().min(1),
    aspect_ratio: z.string().min(1),
    input: z.object({
      audio_file: z.string().optional().default(""),
      script_file: z.string().min(1),
      style_bible: z.string().min(1),
      character_bible: z.string().min(1)
    }),
    output: z.object({
      folder: z.string().min(1)
    }),
    generation: z
      .object({
        image_provider: z.string().min(1).default("manual"),
        preview_scenes: z.coerce.number().int().positive().default(5),
        scene_duration_target_seconds: z.coerce.number().positive().optional(),
        max_scene_duration_seconds: z.coerce.number().positive().optional(),
        min_scene_duration_seconds: z.coerce.number().positive().optional(),
        images_per_scene: z.coerce.number().int().positive().default(1),
        words_per_minute: z.coerce.number().positive().default(150)
      })
      .default({}),
    costs: z
      .object({
        currency: z.string().min(1).default("GBP"),
        image_cost_per_generation: z.coerce.number().nonnegative().default(0.04)
      })
      .default({})
  })
  .passthrough();

export type RawProjectConfig = z.infer<typeof projectConfigSchema>;

export type ProjectConfig = RawProjectConfig & {
  profile: ProfileName;
  aspect_ratio: AspectRatio;
  generation: RawProjectConfig["generation"] & {
    image_provider: ImageProvider;
  };
};

export const styleBibleSchema = z
  .object({
    style_name: z.string().min(1),
    visual_style: z
      .object({
        medium: z.string().min(1),
        line_quality: z.string().min(1),
        colour_palette: z.string().min(1),
        background_style: z.string().min(1),
        visual_complexity: z.string().min(1),
        emotional_tone: z.string().min(1)
      })
      .passthrough(),
    composition_rules: z
      .object({
        aspect_ratio: z.string().min(1),
        framing: z.string().min(1),
        readability: z.string().min(1),
        subject_size: z.string().min(1)
      })
      .passthrough(),
    prompt_rules: z
      .object({
        always_include: z.array(z.string()).default([]),
        avoid: z.array(z.string()).default([])
      })
      .passthrough()
  })
  .passthrough();

export type StyleBible = z.infer<typeof styleBibleSchema>;

export const characterSchema = z
  .object({
    name: z.string().min(1),
    role: z.string().optional(),
    appearance: z.record(z.unknown()).optional(),
    personality: z.record(z.unknown()).optional(),
    prompt_anchor: z.string().min(1)
  })
  .passthrough();

export const characterBibleSchema = z
  .object({
    characters: z.array(characterSchema).min(1)
  })
  .passthrough();

export type Character = z.infer<typeof characterSchema>;
export type CharacterBible = z.infer<typeof characterBibleSchema>;

export interface Scene {
  scene_number: number;
  start: string;
  end: string;
  duration_seconds: number;
  transcript: string;
  visual_goal: string;
  characters: string[];
  mood: string;
  notes: string;
}

export interface Prompt {
  scene_number: number;
  image_filename: string;
  prompt: string;
  negative_prompt: string;
  provider: ImageProvider;
}
