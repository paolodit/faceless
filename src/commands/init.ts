import path from "node:path";
import fs from "fs-extra";
import { writeTextFile } from "../lib/files.js";

export async function initProject(projectName: string): Promise<string> {
  const projectRoot = path.resolve(process.cwd(), projectName);

  if ((await fs.pathExists(projectRoot)) && (await fs.readdir(projectRoot)).length > 0) {
    throw new Error(`Project folder already exists and is not empty:\n${projectRoot}`);
  }

  const inputFolder = path.join(projectRoot, "input");
  const assetsFolder = path.join(inputFolder, "assets");
  const outputFolder = path.join(projectRoot, "output");
  await fs.ensureDir(inputFolder);
  await fs.ensureDir(assetsFolder);
  await fs.ensureDir(outputFolder);

  await Promise.all([
    writeTextFile(path.join(projectRoot, "project.yml"), projectYaml(projectName)),
    writeTextFile(path.join(inputFolder, "script.txt"), starterScript()),
    writeTextFile(path.join(inputFolder, "style-bible.yml"), starterStyleBible()),
    writeTextFile(path.join(inputFolder, "characters.yml"), starterCharacters()),
    writeTextFile(path.join(inputFolder, "channel-bible.yml"), starterChannelBible(projectName)),
    writeTextFile(path.join(inputFolder, "voice.example.txt"), voiceExample()),
    writeTextFile(path.join(assetsFolder, ".gitkeep"), ""),
    writeTextFile(path.join(projectRoot, "README_PROJECT.md"), projectReadme(projectName))
  ]);

  return `Created video-pack project: ${projectName}

Next step:
video-pack validate --project ./${projectName}`;
}

function projectYaml(projectName: string): string {
  return `project_name: ${JSON.stringify(projectName)}
pipeline: "faceless-explainer"
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
  image_provider: "manual"
  preview_scenes: 5
  scene_duration_target_seconds: 5
  max_scene_duration_seconds: 8
  min_scene_duration_seconds: 3
  images_per_scene: 1
  words_per_minute: 150
  scene_video_provider: "manual"
  scene_video_duration_seconds: 5
  prefer_upscaled_images_for_video: true

transcription:
  provider: "script"
  model: "whisper-1"

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
    upscale_sharpen: 7
    upscale_smart_grain: 7
    upscale_ultra_detail: 30
    upscale_flavor: "photo"
    video_model: "kling-v2-6-pro"
    video_duration_seconds: 5
    video_generate_audio: false
  higgsfield:
    mcp_url: "https://higgsfield.ai/mcp"
    cli_command: "higgsfield"

copy:
  provider: "heuristic"
  title_options: 8

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
`;
}

function starterChannelBible(projectName: string): string {
  return `channel_name: ${JSON.stringify(projectName)}
audience: "curious viewers who like useful, relatable short videos"
platform_priorities:
  - "tiktok"
  - "youtube-shorts"

voice:
  tone: "observant, warm, concise"
  point_of_view: "first person narrator"
  pacing: "quick setup, clear turn, useful or funny payoff"

content_pillars:
  - "everyday overwhelm"
  - "work and creative friction"
  - "small emotional truths"

recurring_formats:
  - "I thought X, then my brain did Y"
  - "tiny problem becomes existential production"
  - "one useful observation told as a scene"

publishing:
  default_cta: "Follow for more small, useful creative observations."
  description_boilerplate: "Made from a script-first production pack."
  hashtags:
    - "#creativeprocess"
    - "#shorts"

prompt_rules:
  always_include:
    - "visual idea should be instantly readable"
    - "single clear focal point"
  avoid:
    - "busy composition"
    - "tiny captions or dense factual text that needs perfect readability"
  thumbnail_rules:
    - "one expressive subject"
    - "strong simple silhouette"
    - "no more than three words if text is implied"
  title_rules:
    - "specific emotional tension"
    - "avoid generic productivity language"
`;
}

function starterStyleBible(): string {
  return `style_name: "Example Visual Style"

visual_style:
  medium: "simple hand-drawn cartoon"
  line_quality: "clean but slightly imperfect"
  colour_palette: "limited flat colours"
  background_style: "minimal, often white or sparse"
  visual_complexity: "low"
  emotional_tone: "comic, warm and observant"

composition_rules:
  aspect_ratio: "9:16"
  framing: "single clear idea per scene"
  readability: "must be readable on mobile"
  subject_size: "large central character or object"

prompt_rules:
  always_include:
    - "consistent recurring character style"
    - "simple flat illustration"
    - "clear readable composition"
    - "minimal background clutter"
  avoid:
    - "photorealism"
    - "cinematic lighting"
    - "3D render"
    - "overly detailed background"
    - "tiny captions or dense factual text that needs perfect readability"
    - "different character design between scenes"
`;
}

function starterCharacters(): string {
  return `characters:
  - name: "Main Character"
    role: "protagonist"
    appearance:
      body_type: "ordinary adult"
      clothing: "casual jumper and trousers"
      hair: "slightly messy hair"
      expression_range:
        - "hopeful"
        - "frazzled"
        - "confused"
        - "resigned"
    personality:
      traits:
        - "overthinks"
        - "tries to be productive"
        - "gets overwhelmed easily"
    prompt_anchor: "same simple hand-drawn recurring character, casual jumper, slightly messy hair"

  - name: "Inner Critic"
    role: "comic antagonist"
    appearance:
      body_type: "small symbolic creature"
      expression_range:
        - "smug"
        - "accusing"
        - "dramatic"
    personality:
      traits:
        - "interrupts"
        - "turns small tasks into moral crises"
    prompt_anchor: "small symbolic creature representing guilt and self-criticism"
`;
}

function starterScript(): string {
  return `I thought I was going to relax today.

Then my brain reminded me about the unread emails.

Then the unpaid invoice.

Then the half-built app.

Then the thing I said weirdly in 2017.
`;
}

function voiceExample(): string {
  return `Optional narration file.

Record your own voiceover as .mp3, .wav or .m4a, then update project.yml:

input:
  audio_file: "./input/voice.mp3"

The MVP can still prepare timings from script.txt without audio.
`;
}

function projectReadme(projectName: string): string {
  return `# ${projectName}

This is a faceless video-pack project.

## Start Here

Before running the full workflow, fill these files:

- \`input/script.txt\` - your final spoken script
- \`input/style-bible.yml\` - visual style rules
- \`input/characters.yml\` - recurring characters or visual anchors
- \`input/channel-bible.yml\` - optional reusable channel voice and publishing rules
- \`input/assets/\` - optional logos, reference images, stock clips, screenshots or brand files

If you are not sure what to write, use the prompts in:

\`\`\`text
docs/CHATGPT_SETUP.md
\`\`\`

Optional voiceover:

\`\`\`text
input/voice.mp3
\`\`\`

If you add a voiceover, update \`project.yml\`:

\`\`\`yaml
input:
  audio_file: "./input/voice.mp3"
\`\`\`

## Pick Back Up Here

At any point, run:

\`\`\`bash
video-pack doctor --project .
video-pack wizard --project .
\`\`\`

\`doctor\` checks setup and provider readiness. \`wizard\` shows the next command, why it matters, what to review, and the short route to a finished edit pack.
\`proposal\` documents the production route before asset-heavy work. \`board\` refreshes the local dashboard.

To run the next safe step instead of copying it:

\`\`\`bash
video-pack next --project .
\`\`\`

## Command Path

\`\`\`bash
video-pack validate --project .
video-pack analyze --project .
video-pack plan --project .
video-pack proposal --project .
video-pack prepare --project .
video-pack visual-events --project .
video-pack prompts --project .
video-pack preview --project . --count 5
video-pack generate-images --project .
video-pack scene-assets --project .
video-pack upscale-images --project . --provider manual
video-pack generate-scene-videos --project . --provider manual
video-pack approve-images --project .
video-pack package --project .
video-pack remotion --project .
video-pack board --project .
video-pack doctor --project .
video-pack wizard --project .
video-pack next --project .
video-pack status --project .
\`\`\`

Review these files as they appear:

- \`output/00_proposal/proposal.md\`
- \`output/BOARD.html\`
- \`output/02_scenes/scenes.md\`
- \`output/02_scenes/scene_production.md\`
- \`output/02_scenes/visual_events.md\`
- \`output/03_prompts/prompts.md\`
- \`output/04_images/review_board.md\`
- \`output/04_images/review_board.html\`
- \`output/04_images/scenes/\`
- \`output/06_edit_pack/overlay_text.csv\`
- \`output/06_edit_pack/stock_asset_queries.csv\`
- \`output/06_edit_pack/stock_assets/\`
- \`output/08_remotion/README.md\`
- \`output/README_NEXT_STEPS.md\`

## Optional Free Stock Assets

After \`visual-events\`, you can download mock stock placeholders:

\`\`\`bash
video-pack stock-assets --project . --provider mock
\`\`\`

For real free stock providers, add a provider API key to \`.env\`, then run:

\`\`\`bash
video-pack stock-assets --project . --provider pexels
video-pack stock-assets --project . --provider pixabay
\`\`\`

## Optional AI Polish

Scene folders are the easiest place to manage per-scene assets:

\`\`\`bash
video-pack scene-assets --project .
\`\`\`

To prepare human handoff prompts for upscaling or scene clips:

\`\`\`bash
video-pack upscale-images --project . --provider manual
video-pack generate-scene-videos --project . --provider higgsfield
\`\`\`

To run Magnific directly, set \`MAGNIFIC_API_KEY\`, then use:

\`\`\`bash
video-pack generate-images --project . --provider magnific
video-pack upscale-images --project . --provider magnific
video-pack generate-scene-videos --project . --provider magnific --duration 5
\`\`\`
`;
}
