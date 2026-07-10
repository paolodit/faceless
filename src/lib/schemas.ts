import { z } from "zod";
import type {
  AspectRatio,
  ConcreteSceneLayoutMode,
  ImageProvider,
  ProductionPipelineName,
  ProfileName,
  SceneLayoutMode,
  SceneVideoProvider
} from "./constants.js";

export const projectConfigSchema = z
  .object({
    project_name: z.string().min(1),
    pipeline: z.string().min(1).default("narrated-explainer"),
    profile: z.string().min(1),
    aspect_ratio: z.string().min(1),
    input: z.object({
      audio_file: z.string().optional().default(""),
      script_file: z.string().min(1),
      style_bible: z.string().min(1),
      character_bible: z.string().min(1),
      channel_bible: z.string().optional().default("./input/channel-bible.yml")
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
        words_per_minute: z.coerce.number().positive().default(150),
        scene_video_provider: z.string().min(1).default("manual"),
        scene_video_duration_seconds: z.coerce.number().int().positive().default(5),
        prefer_upscaled_images_for_video: z.coerce.boolean().default(true)
      })
      .default({}),
    transcription: z
      .object({
        provider: z.enum(["script", "openai"]).default("script"),
        model: z.string().min(1).default("whisper-1"),
        language: z.string().optional(),
        prompt: z.string().optional()
      })
      .default({}),
    providers: z
      .object({
        openai: z
          .object({
            image_model: z.string().min(1).default("gpt-image-1"),
            image_size: z.string().min(1).default("auto"),
            image_quality: z.string().min(1).default("medium"),
            image_output_format: z.enum(["png", "webp", "jpeg"]).default("png"),
            transcription_model: z.string().min(1).default("whisper-1")
          })
          .default({}),
        magnific: z
          .object({
            base_url: z.string().url().default("https://api.magnific.com"),
            image_model: z.string().min(1).default("flexible"),
            image_resolution: z.enum(["1k", "2k", "4k"]).default("2k"),
            image_engine: z.string().min(1).default("automatic"),
            filter_nsfw: z.coerce.boolean().default(true),
            poll_interval_seconds: z.coerce.number().positive().default(5),
            poll_timeout_seconds: z.coerce.number().positive().default(900),
            upscale_scale_factor: z.coerce.number().min(2).max(16).default(2),
            upscale_sharpen: z.coerce.number().min(0).max(100).default(7),
            upscale_smart_grain: z.coerce.number().min(0).max(100).default(7),
            upscale_ultra_detail: z.coerce.number().min(0).max(100).default(30),
            upscale_flavor: z.enum(["sublime", "photo", "photo_denoiser"]).default("photo"),
            video_model: z.string().min(1).default("kling-v2-6-pro"),
            video_duration_seconds: z.coerce.number().int().refine((value) => value === 5 || value === 10, {
              message: "Magnific scene videos currently support 5 or 10 seconds."
            }).default(5),
            video_generate_audio: z.coerce.boolean().default(false)
          })
          .default({}),
        higgsfield: z
          .object({
            mcp_url: z.string().url().default("https://higgsfield.ai/mcp"),
            cli_command: z.string().min(1).default("higgsfield")
          })
          .default({})
      })
      .default({}),
    copy: z
      .object({
        provider: z.enum(["heuristic"]).default("heuristic"),
        title_options: z.coerce.number().int().positive().default(8)
      })
      .default({}),
    visual_events: z
      .object({
        enabled: z.coerce.boolean().default(true),
        mode: z.enum(["auto", "manual", "off"]).default("auto"),
        default_pacing: z.enum(["profile", "steady", "additive", "burst"]).default("profile"),
        max_events_per_scene: z.coerce.number().int().positive().default(6),
        create_overlay_plan: z.coerce.boolean().default(true),
        create_stock_queries: z.coerce.boolean().default(true)
      })
      .default({}),
    scene_production: z
      .object({
        default_layout: z
          .enum(["auto", "single-image", "fast-cut", "additive-slide", "voxpop", "montage"])
          .default("auto"),
        continuity: z.enum(["auto", "scene", "segment", "none"]).default("auto"),
        additive_layers: z.coerce.number().int().min(1).max(6).default(3),
        voxpop_background: z.string().min(1).default("consistent interview-style background"),
        voxpop_middle_ground: z.string().min(1).default("recurring presenter or interview subject"),
        voxpop_foreground: z.string().min(1).default("microphone, caption card, phone, or reaction prop")
      })
      .default({}),
    stock_assets: z
      .object({
        enabled: z.coerce.boolean().default(false),
        provider: z.enum(["mock", "pexels", "pixabay"]).default("mock"),
        media_type: z.enum(["photo", "video"]).default("photo"),
        max_assets: z.coerce.number().int().positive().default(10),
        orientation: z.enum(["profile", "landscape", "portrait", "square"]).default("profile"),
        safe_search: z.coerce.boolean().default(true)
      })
      .default({}),
    costs: z
      .object({
        currency: z.string().min(1).default("GBP"),
        image_cost_per_generation: z.coerce.number().nonnegative().default(0.04),
        cost_multiplier: z.coerce.number().positive().default(2)
      })
      .default({})
  })
  .passthrough();

export type RawProjectConfig = z.infer<typeof projectConfigSchema>;

export type ProjectConfig = RawProjectConfig & {
  pipeline: ProductionPipelineName;
  profile: ProfileName;
  aspect_ratio: AspectRatio;
  generation: RawProjectConfig["generation"] & {
    image_provider: ImageProvider;
    scene_video_provider: SceneVideoProvider;
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

export const channelBibleSchema = z
  .object({
    channel_name: z.string().min(1),
    audience: z.string().min(1),
    platform_priorities: z.array(z.string()).default([]),
    voice: z
      .object({
        tone: z.string().min(1),
        point_of_view: z.string().optional(),
        pacing: z.string().optional()
      })
      .passthrough(),
    content_pillars: z.array(z.string()).default([]),
    recurring_formats: z.array(z.string()).default([]),
    publishing: z
      .object({
        default_cta: z.string().optional(),
        description_boilerplate: z.string().optional(),
        hashtags: z.array(z.string()).default([])
      })
      .default({}),
    prompt_rules: z
      .object({
        always_include: z.array(z.string()).default([]),
        avoid: z.array(z.string()).default([]),
        thumbnail_rules: z.array(z.string()).default([]),
        title_rules: z.array(z.string()).default([])
      })
      .default({})
  })
  .passthrough();

export type ChannelBible = z.infer<typeof channelBibleSchema>;

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
  scene_production?: SceneProductionPlan;
}

export interface ThumbnailPrompt {
  thumbnail_number: number;
  title: string;
  image_filename: string;
  prompt: string;
  negative_prompt: string;
  rationale: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs-regen";

export interface ImageApproval {
  scene_number: number;
  image_filename: string;
  status: ApprovalStatus;
  notes: string;
  updated_at: string;
}

export type VisualEventMode = "auto" | "manual" | "off";
export type PacingMode = "burst" | "additive" | "steady" | "landing";
export type VisualEventDefaultPacing = "profile" | Exclude<PacingMode, "landing">;
export type SceneProductionContinuity = "auto" | "scene" | "segment" | "none";
export type VisualEventType = "image" | "text" | "overlay" | "transition";
export type VisualEventSourceType = "generated" | "stock" | "local" | "placeholder";
export type StockAssetProvider = "mock" | "pexels" | "pixabay";
export type StockAssetMediaType = "photo" | "video";

export interface SceneProductionLayer {
  layer_id: string;
  role: "base" | "background" | "middle_ground" | "foreground" | "overlay" | "cutaway" | "reference";
  description: string;
  timing: string;
  asset_hint: string;
}

export interface SceneProductionPlan {
  scene_number: number;
  layout_mode: ConcreteSceneLayoutMode;
  requested_layout: SceneLayoutMode;
  continuity_group: string;
  continuity: Exclude<SceneProductionContinuity, "auto">;
  pacing_mode: PacingMode;
  base_frame: string;
  background: string;
  middle_ground: string;
  foreground: string;
  camera: string;
  motion: string;
  layering: string;
  expected_assets: string[];
  layers: SceneProductionLayer[];
  editor_notes: string[];
}

export interface VisualEvent {
  event_id: string;
  scene_number: number;
  offset_seconds: number;
  absolute_start_seconds: number;
  start_time: string;
  duration_seconds: number;
  type: VisualEventType;
  source_type?: VisualEventSourceType;
  asset_filename?: string;
  search_query?: string;
  provider_suggestions?: string[];
  image_prompt?: string;
  text?: string;
  label?: string;
  style?: string;
  animation?: string;
  motion?: string;
  overlay_kind?: string;
  safe_area?: string;
  transition_kind?: string;
  notes?: string;
}

export interface VisualEventScenePlan {
  scene_number: number;
  scene_start: string;
  scene_end: string;
  scene_role: string;
  pacing_mode: PacingMode;
  transcript: string;
  visual_goal: string;
  production: SceneProductionPlan;
  events: VisualEvent[];
}
