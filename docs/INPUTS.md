# Inputs

## project.yml

`project.yml` is the main configuration file. It declares the project name, creator type, output profile, aspect ratio, input files, output folder, generation settings, provider settings and cost assumptions.

```yaml
project_name: "my-video"
pipeline: "narrated-explainer"
profile: "tiktok"
aspect_ratio: "9:16"

input:
  audio_file: ""
  script_file: "./input/script.txt"
  style_bible: "./input/style-bible.yml"
  character_bible: "./input/characters.yml"
  channel_bible: "./input/channel-bible.yml"

output:
  folder: "./output"

generation:
  image_provider: "external"
  preview_scenes: 5
  scene_duration_target_seconds: 5
  max_scene_duration_seconds: 8
  min_scene_duration_seconds: 3
  images_per_scene: 1
  words_per_minute: 150
  scene_video_provider: "manual"
  scene_video_duration_seconds: 5
  prefer_upscaled_images_for_video: true

providers:
  openai:
    image_model: "gpt-image-1"
    image_size: "auto"
    image_quality: "medium"
    image_output_format: "png"
    transcription_model: "whisper-1"
  magnific:
    base_url: "https://api.magnific.com"
    image_model: "flexible"
    image_resolution: "2k"
    image_engine: "automatic"
    filter_nsfw: true
    poll_interval_seconds: 5
    poll_timeout_seconds: 900
    upscale_scale_factor: 2
    upscale_flavor: "photo"
    video_model: "kling-v2-6-pro"
    video_duration_seconds: 5
    video_generate_audio: false
  higgsfield:
    mcp_url: "https://higgsfield.ai/mcp"
    cli_command: "higgsfield"

visual_events:
  enabled: true
  mode: "auto"
  default_pacing: "profile"
  max_events_per_scene: 6
  create_overlay_plan: true
  create_stock_queries: true

scene_production:
  default_layout: "auto"
  continuity: "auto"
  additive_layers: 3
  voxpop_background: "consistent interview-style background"
  voxpop_middle_ground: "recurring presenter or interview subject"
  voxpop_foreground: "microphone, caption card, phone, or reaction prop"
  screen_demo_surface: "screen recording or screenshot from input/assets/"

stock_assets:
  enabled: false
  provider: "mock"
  media_type: "photo"
  max_assets: 10
  orientation: "profile"
  safe_search: true

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
  cost_multiplier: 2
```

`pipeline` describes the creator type. `profile` describes output format.

Valid creator types:

- `narrated-explainer`
- `linkedin-vox-pop`
- `narrated-visual-story`

List them with:

```bash
video-pack pipelines
```

## script.txt

Plain text narration. The script is used as the transcript when `transcription.provider` is `script`.

## style-bible.yml

Defines the visual style, composition rules and prompt rules used when generating image prompts.

Required areas:

- `style_name`
- `visual_style`
- `composition_rules`
- `prompt_rules`

Use ChatGPT to generate this from the demo file and your idea. See [CHATGPT_SETUP.md](CHATGPT_SETUP.md).

## characters.yml

Defines reusable characters and prompt anchors. At least one character is required.

The `prompt_anchor` field is important because it gives image tools a short reusable description for visual consistency.

## channel-bible.yml

Defines reusable channel-level defaults such as audience, voice, content pillars, recurring formats, publishing CTA, hashtags, thumbnail rules and title rules.

Create a reusable channel bible:

```bash
video-pack channel-bible ./bibles/my-channel.yml --name "My Channel"
```

Point multiple projects to it:

```yaml
input:
  channel_bible: "../bibles/my-channel.yml"
```

## input/assets/

Optional folder for local reference assets, logos, screenshots, downloaded stock files or brand material you want to keep with the project.

`video-pack init` creates:

```text
input/assets/
```

`video-pack visual-events` and `video-pack package` list any files found there in:

```text
output/06_edit_pack/asset_manifest.json
output/06_edit_pack/asset_checklist.md
```

## visual_events

The visual events config is optional. If it is missing, defaults are used.

```yaml
visual_events:
  enabled: true
  mode: "auto"
  default_pacing: "profile"
  max_events_per_scene: 6
  create_overlay_plan: true
  create_stock_queries: true
```

`default_pacing: "profile"` chooses sensible pacing from the output profile. For manual control, use `steady`, `additive` or `burst`. Package will still create visual event files if they are missing.

Pacing modes:

- `burst` - hook, cold open, fast joke or pattern interrupt
- `steady` - explanation, context or slower story section
- `additive` - term reveal, list item or step-by-step build
- `landing` - final recap, payoff or call to action

## scene_production

Scene production controls the layout grammar that `video-pack visual-events` writes to:

```text
output/02_scenes/scene_production.md
output/02_scenes/scene_production.json
```

```yaml
scene_production:
  default_layout: "auto"
  continuity: "auto"
  additive_layers: 3
  voxpop_background: "consistent interview-style background"
  voxpop_middle_ground: "recurring presenter or interview subject"
  voxpop_foreground: "microphone, caption card, phone, or reaction prop"
  screen_demo_surface: "screen recording or screenshot from input/assets/"
```

Valid `default_layout` values:

- `auto`
- `single-image`
- `fast-cut`
- `additive-slide`
- `voxpop`
- `montage`

Use `auto` for most projects. Force `voxpop` for consistent interview-style scenes or `additive-slide` for base-frame builds. Screen-demo layout remains available only for legacy projects; it is not a first-run creator type.

## stock_assets

Automatic stock downloads are optional and off by default.

```yaml
stock_assets:
  enabled: false
  provider: "mock"
  media_type: "photo"
  max_assets: 10
  orientation: "profile"
  safe_search: true
```

Run manually:

```bash
video-pack stock-assets --project ./my-project --provider mock
video-pack stock-assets --project ./my-project --provider pexels
video-pack stock-assets --project ./my-project --provider pixabay
```

Real providers require keys in `.env`:

```env
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Set `stock_assets.enabled: true` only if you want `video-pack package` to try downloading stock automatically.

## scene video and polish settings

Scene video is optional and separate from image generation.

```yaml
generation:
  scene_video_provider: "manual"
  scene_video_duration_seconds: 5
  prefer_upscaled_images_for_video: true
```

Valid scene video providers:

- `manual`
- `magnific`
- `higgsfield`

Magnific requires `MAGNIFIC_API_KEY`. Higgsfield currently writes handoff request packs for MCP/CLI usage instead of calling a REST API.

## Audio File

Audio is optional. If you have a voiceover, set `input.audio_file` to a `.mp3`, `.wav` or `.m4a` path.

Detect duration metadata:

```bash
video-pack audio-info --project ./my-project
```

Use OpenAI transcription:

```yaml
transcription:
  provider: "openai"
```

OpenAI transcription requires `OPENAI_API_KEY`.
