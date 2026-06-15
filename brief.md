# Codex Build Brief: Narrative Video Production CLI MVP

## Objective

Build a local CLI tool called `video-pack` that turns a narrated script into a structured production pack for AI-assisted video creation.

This is not a web app.

This is not a full automated video editor.

The goal is to create a reliable CLI that validates inputs, prepares transcripts/scenes/prompts, estimates image generation costs, supports preview generation, and exports files that can be used in CapCut, Premiere Pro, DaVinci Resolve or any manual editing workflow.

The tool must be generic. Do not hard-code it around one creative project. It should support different project profiles such as TikTok, YouTube Shorts, YouTube long-form and LinkedIn video.

---

# 1. Recommended Stack

Use:

* Node.js
* TypeScript
* Commander.js for CLI commands
* Zod for config validation
* yaml for YAML parsing
* fs-extra for filesystem operations
* dotenv for environment variables
* csv-stringify or equivalent for CSV export
* Vitest or Jest for tests
* Sharp or Canvas only if needed for mock placeholder images

The codebase should be clean, modular and easy to extend.

---

# 2. Package Name

Use:

```text
video-pack
```

CLI command:

```bash
video-pack
```

---

# 3. Commands To Implement

Implement the following commands:

```bash
video-pack init <project-name>
video-pack validate --project <path>
video-pack plan --project <path>
video-pack prepare --project <path>
video-pack prompts --project <path>
video-pack preview --project <path> --count <number>
video-pack generate-images --project <path>
video-pack package --project <path>
```

Optional flags:

```bash
--force
--resume
--from-scene <number>
--provider <manual|mock|openai>
```

For v1, `manual` and `mock` providers are required. `openai` can be scaffolded if time allows.

---

# 4. Project Folder Created By `init`

When the user runs:

```bash
video-pack init dopamine-tax
```

Create:

```text
dopamine-tax/
  project.yml
  input/
    script.txt
    style-bible.yml
    characters.yml
    voice.example.txt
  output/
  README_PROJECT.md
```

Do not require an audio file at init time.

The starter `script.txt` should include a short example.

The starter `style-bible.yml` and `characters.yml` should be valid.

The starter `project.yml` should point to these files.

---

# 5. Example `project.yml`

Create this structure:

```yaml
project_name: "dopamine-tax"
profile: "tiktok"
aspect_ratio: "9:16"

input:
  audio_file: ""
  script_file: "./input/script.txt"
  style_bible: "./input/style-bible.yml"
  character_bible: "./input/characters.yml"

output:
  folder: "./output"

generation:
  image_provider: "manual"
  preview_scenes: 5
  scene_duration_target_seconds: 5
  max_scene_duration_seconds: 8
  min_scene_duration_seconds: 3
  images_per_scene: 1

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
```

---

# 6. Example `style-bible.yml`

Create this file on init:

```yaml
style_name: "Example Visual Style"

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
    - "tiny unreadable text"
    - "different character design between scenes"
```

---

# 7. Example `characters.yml`

Create this file on init:

```yaml
characters:
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
    prompt_anchor: "small goblin-like creature representing guilt and self-criticism"
```

---

# 8. Validation Behaviour

The `validate` command should check:

* project folder exists
* `project.yml` exists
* required project fields exist
* profile is valid
* aspect ratio is valid
* script file exists if provided
* audio file exists if provided
* style bible exists
* character bible exists
* style bible required fields exist
* character bible contains at least one character
* output folder can be created
* image provider is valid
* cost values are numeric

Validation must produce friendly errors.

Example:

```text
Validation failed.

1. Missing required field in style bible:
   visual_style.medium

Suggested fix:

visual_style:
  medium: "simple hand-drawn cartoon"
```

If validation passes:

```text
Validation passed.

Project: dopamine-tax
Profile: tiktok
Image provider: manual
Script: input/script.txt
Style bible: input/style-bible.yml
Characters: input/characters.yml

Next step:
video-pack plan --project ./dopamine-tax
```

---

# 9. Profiles

Create built-in profiles:

## `tiktok`

```ts
{
  name: "tiktok",
  aspectRatio: "9:16",
  targetSceneSeconds: 3,
  minSceneSeconds: 2,
  maxSceneSeconds: 5,
  captionStyle: "large, mobile-first, highly readable",
  guidance: "Hook must land within first 2 seconds. Keep scenes visually simple and fast."
}
```

## `youtube-shorts`

```ts
{
  name: "youtube-shorts",
  aspectRatio: "9:16",
  targetSceneSeconds: 4,
  minSceneSeconds: 3,
  maxSceneSeconds: 6,
  captionStyle: "large and clear",
  guidance: "Prioritise completion compulsion and a strong final payoff."
}
```

## `youtube-long`

```ts
{
  name: "youtube-long",
  aspectRatio: "16:9",
  targetSceneSeconds: 8,
  minSceneSeconds: 5,
  maxSceneSeconds: 12,
  captionStyle: "optional or section-based",
  guidance: "Use chapter-like sections, slower pacing and stronger narrative progression."
}
```

## `linkedin-video`

```ts
{
  name: "linkedin-video",
  aspectRatio: "4:5",
  targetSceneSeconds: 5,
  minSceneSeconds: 4,
  maxSceneSeconds: 8,
  captionStyle: "clean, professional and readable",
  guidance: "Lead with a useful business insight. Avoid overly chaotic visual pacing."
}
```

---

# 10. `plan` Command

The `plan` command should:

* validate first
* read script text
* estimate word count
* estimate duration if no audio duration is available
* estimate scene count based on profile and scene duration settings
* estimate image count
* estimate preview cost
* estimate full image generation cost
* list expected output files
* warn if the script is too short or too long for the selected profile

Example output:

```text
Production plan

Project: dopamine-tax
Profile: tiktok
Aspect ratio: 9:16

Script words: 132
Estimated duration: 52 seconds
Estimated scenes: 12
Images per scene: 1
Preview scenes: 5

Cost estimate:
Preview: 5 images x £0.04 = £0.20
Full run: 12 images x £0.04 = £0.48

No generation has happened yet.

Next step:
video-pack prepare --project ./dopamine-tax
```

Also write:

```text
output/cost_estimate.json
```

---

# 11. `prepare` Command

The `prepare` command should create:

```text
output/01_transcript/transcript.txt
output/01_transcript/timestamps.json
output/02_scenes/scenes.json
output/02_scenes/scenes.md
```

## MVP Transcript Logic

For v1, support script-based timing even if real audio transcription is not implemented yet.

Use the script as transcript.

Estimate duration using a configurable words-per-minute value, default around 150 wpm.

Split text into sentence or beat chunks.

Assign approximate timestamps.

This is acceptable for MVP because the user can later manually adjust the edit manifest.

If audio handling is implemented, detect audio duration where possible and distribute timestamps proportionally.

Do not block the MVP on perfect transcription.

## Scene Object

Generate scenes in this format:

```json
{
  "scene_number": 1,
  "start": "00:00.000",
  "end": "00:04.500",
  "duration_seconds": 4.5,
  "transcript": "I thought I was going to relax today.",
  "visual_goal": "A clear visual representation of the transcript line.",
  "characters": ["Main Character"],
  "mood": "observational",
  "notes": ""
}
```

For `visual_goal`, create a simple first-pass visual description.

This can be rule-based for v1.

Example:

```text
Main Character reacting to: "I thought I was going to relax today."
```

A future version can use an LLM here.

---

# 12. `prompts` Command

The `prompts` command should read:

* `scenes.json`
* `style-bible.yml`
* `characters.yml`

Then create:

```text
output/03_prompts/prompts.json
output/03_prompts/prompts.md
output/06_edit_pack/storyboard.md
```

Each prompt should include:

* visual style
* relevant character anchors
* scene visual goal
* composition rules
* prompt rules
* avoid/negative prompt terms

Example prompt:

```text
Simple hand-drawn cartoon. Clean but slightly imperfect linework. Limited flat colours. Minimal sparse background. Main Character, same simple hand-drawn recurring character, casual jumper, slightly messy hair. Scene: Main Character sitting on sofa with a cup of tea, looking cautiously hopeful. Clear readable mobile composition. Avoid photorealism, cinematic lighting, 3D render, overly detailed background, tiny unreadable text, inconsistent character design.
```

Prompt object:

```json
{
  "scene_number": 1,
  "image_filename": "scene_001_00-00_to_00-04.png",
  "prompt": "...",
  "negative_prompt": "...",
  "provider": "manual"
}
```

---

# 13. `preview` Command

The `preview` command should run for the first N scenes.

Required behaviour:

* read prompts
* select first N prompts
* if provider is `manual`, write a preview prompt pack only
* if provider is `mock`, generate placeholder images
* if provider is `openai` and implemented, generate images

Manual preview output:

```text
output/04_images/preview/preview_prompts.md
output/04_images/preview/preview_prompts.json
```

Mock preview output:

```text
output/04_images/preview/scene_001_00-00_to_00-04.png
output/04_images/preview/scene_002_00-04_to_00-08.png
```

After preview, print:

```text
Preview ready.

Review:
output/04_images/preview/

If the visual style is right, run:
video-pack generate-images --project ./dopamine-tax

If it is wrong, edit:
input/style-bible.yml
output/03_prompts/prompts.json

Then rerun:
video-pack preview --project ./dopamine-tax --count 5
```

---

# 14. `generate-images` Command

For v1, implement:

* `manual` mode
* `mock` mode
* optional `openai` mode if straightforward

Manual mode:

* writes all prompts to `output/04_images/full/full_prompts.md`
* does not call any API

Mock mode:

* creates placeholder images for every scene
* image should contain scene number and timestamp if possible

Support:

```bash
--resume
--from-scene 6
--force
```

Behaviour:

* skip existing images unless `--force`
* continue missing images with `--resume`
* start from selected scene with `--from-scene`

---

# 15. `package` Command

The `package` command should create:

```text
output/05_captions/captions.srt
output/05_captions/captions.vtt
output/06_edit_pack/edit_manifest.csv
output/06_edit_pack/edit_manifest.json
output/run_report.md
output/README_NEXT_STEPS.md
```

## SRT Format

Create captions from scenes.

Example:

```text
1
00:00:00,000 --> 00:00:04,500
I thought I was going to relax today.
```

## Edit Manifest CSV

Columns:

```csv
scene_number,start,end,duration_seconds,image_filename,transcript,visual_goal
```

## README_NEXT_STEPS.md

Generate tailored guidance based on profile.

For TikTok / Shorts:

```text
Next steps:

1. Review your images in output/04_images/full/
2. Open CapCut, Premiere Pro or DaVinci Resolve.
3. Import your voiceover.
4. Import images in scene order.
5. Use output/06_edit_pack/edit_manifest.csv to align each image to its timestamp.
6. Import output/05_captions/captions.srt.
7. Export at 1080x1920 for TikTok or YouTube Shorts.
8. Watch the first 2 seconds carefully. The hook must be clear immediately.
9. Upload manually and check thumbnail/first-frame appearance.
```

For LinkedIn:

```text
Next steps:

1. Keep captions clean and readable.
2. Consider exporting as 4:5 or square depending on your post style.
3. Add a strong first-line written post above the video.
4. Make sure the video is useful without sound.
5. Upload manually to LinkedIn.
```

---

# 16. Documentation Files

Create repository documentation:

```text
README.md
docs/INPUTS.md
docs/OUTPUTS.md
docs/WORKFLOW.md
docs/PROFILES.md
docs/PROVIDERS.md
```

## README.md Should Explain

* what the tool does
* who it is for
* what it does not do
* quick start
* example commands
* project folder structure
* provider modes

## INPUTS.md Should Explain

* `project.yml`
* `style-bible.yml`
* `characters.yml`
* `script.txt`
* optional audio file

## OUTPUTS.md Should Explain

* transcript
* timestamps
* scenes
* prompts
* captions
* edit manifest
* run report
* next-step README

## WORKFLOW.md Should Explain

A full example from:

```text
record voice
```

to:

```text
upload video manually
```

## PROFILES.md Should Explain

* TikTok
* YouTube Shorts
* YouTube long-form
* LinkedIn video

## PROVIDERS.md Should Explain

* manual mode
* mock mode
* future OpenAI mode
* future Hicksfield mode

---

# 17. Error Handling Requirements

Make errors useful.

Examples:

## Missing script

```text
Could not find script file:
input/script.txt

Add a script file or update project.yml:

input:
  script_file: "./path/to/script.txt"
```

## Unknown profile

```text
Unknown profile: "youtube-short"

Did you mean:
youtube-shorts

Valid profiles:
- tiktok
- youtube-shorts
- youtube-long
- linkedin-video
```

## Missing style field

```text
Your style bible is missing:

visual_style.medium

Example:

visual_style:
  medium: "simple hand-drawn cartoon"
```

---

# 18. Tests

Add basic tests for:

* project config validation
* style bible validation
* character bible validation
* script splitting
* timestamp formatting
* SRT generation
* CSV manifest generation
* profile lookup
* cost estimation

---

# 19. Implementation Order

Build in this order:

## Phase 1

* project scaffold
* TypeScript setup
* CLI command structure
* `init`

## Phase 2

* config loading
* YAML parsing
* Zod validation
* `validate`

## Phase 3

* profiles
* cost estimation
* `plan`

## Phase 4

* script reading
* transcript generation from script
* approximate timestamp generation
* scene splitting
* `prepare`

## Phase 5

* prompt generation from style and character bibles
* `prompts`

## Phase 6

* preview command
* manual preview prompt pack
* mock image placeholders if simple

## Phase 7

* package command
* SRT
* VTT
* edit manifest CSV/JSON
* run report
* next-step README

## Phase 8

* README and docs
* tests
* clean up

Do not start with image API integration. Get the local manual/mock workflow solid first.

---

# 20. Acceptance Test Scenario

After build, this should work:

```bash
npm install
npm run build
node dist/index.js init test-video
node dist/index.js validate --project ./test-video
node dist/index.js plan --project ./test-video
node dist/index.js prepare --project ./test-video
node dist/index.js prompts --project ./test-video
node dist/index.js preview --project ./test-video --count 5
node dist/index.js generate-images --project ./test-video
node dist/index.js package --project ./test-video
```

Expected final files:

```text
test-video/output/01_transcript/transcript.txt
test-video/output/01_transcript/timestamps.json
test-video/output/02_scenes/scenes.json
test-video/output/02_scenes/scenes.md
test-video/output/03_prompts/prompts.json
test-video/output/03_prompts/prompts.md
test-video/output/04_images/preview/preview_prompts.md
test-video/output/04_images/full/full_prompts.md
test-video/output/05_captions/captions.srt
test-video/output/05_captions/captions.vtt
test-video/output/06_edit_pack/edit_manifest.csv
test-video/output/06_edit_pack/edit_manifest.json
test-video/output/06_edit_pack/storyboard.md
test-video/output/run_report.md
test-video/output/README_NEXT_STEPS.md
```

---

# 21. Coding Style

* Keep files small and modular.
* Avoid hard-coded absolute paths.
* Use clear names.
* Prefer readable code over clever code.
* Comment where behaviour is not obvious.
* Make all generated files deterministic where possible.
* Do not silently overwrite user-edited files unless `--force` is passed.
* Always explain what the command did and what the user should do next.

---

# 22. Important Product Constraint

This CLI is a production assistant, not a creative replacement.

It should assume the human may want to edit every stage.

Therefore:

* never bury important outputs
* never make generation irreversible
* never require one-click full automation
* keep outputs simple, readable and editable
* make the next step obvious after every command

The first useful version is a structured production packager. Build that before trying to build a full AI video studio.
