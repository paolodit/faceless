# Product Spec: Narrative Video Production CLI

## Working Name

**Narrative Packager CLI**

Alternative names:

* `video-pack-cli`
* `narrative-packager`
* `story-to-video-pack`
* `scene-packager`

## Product Summary

Narrative Packager CLI is a local command-line tool for turning a narrated script into a structured production pack for short-form and long-form video.

It is designed for creators who want to produce consistent narrated visual videos using their own voice, repeatable visual styles, reusable characters, and AI-generated assets.

The tool should not be tied to one project such as The Overwhelmies. It should support multiple creative prototypes, channels, and output formats, including:

* TikTok
* YouTube Shorts
* YouTube long-form
* LinkedIn video
* Instagram Reels
* Manual editing workflows in CapCut, Premiere Pro, DaVinci Resolve or similar

The CLI should focus on production preparation, not full automation. Its job is to take structured creative inputs and produce clean, validated, editable outputs.

---

# 1. Core Purpose

The tool should help the user move from:

```text
Idea / script / recorded narration
```

to:

```text
A structured video production pack
```

including:

* transcript
* timestamps
* scene list
* image prompts
* image generation preview
* captions
* edit manifest
* cost estimate
* next-step guidance

The main goal is to remove repetitive production friction while keeping human creative control.

---

# 2. Primary User

The primary user is a solo creator or small creative operator who:

* writes or shapes scripts in ChatGPT
* records narration in their own voice
* wants consistent characters and art styles
* wants to test several channel ideas quickly
* may use AI image or video generation tools
* edits manually in CapCut, Premiere Pro or similar
* wants a transparent, file-based workflow rather than a black-box app

---

# 3. Design Principles

## 3.1 CLI First

The first version should be a local CLI, not a web app.

Reasons:

* faster to build
* easier for Codex to implement
* easier to inspect
* easier to version-control
* avoids UI complexity
* fits a creator/developer workflow

## 3.2 Generic, Not Project-Specific

The tool must not be hard-coded around The Overwhelmies.

The user should be able to define different project profiles, for example:

* Overwhelmies-style cartoon channel
* AI commentary on LinkedIn
* social psychology YouTube Shorts
* pop economics explainers
* nostalgia spoken-word videos
* puppet comedy
* AI TV Studio experiments

## 3.3 Human Override at Every Stage

Every key output should be saved as an editable file.

The user should be able to manually edit:

* transcript
* scenes
* prompts
* style bible
* character bible
* captions
* image selection
* edit manifest

The tool should support structured automation, not blind automation.

## 3.4 Friendly Touchpoints

The CLI should guide the user clearly.

It should explain:

* what inputs are required
* what each config file does
* what went wrong if validation fails
* what outputs were created
* what the next human step is
* what costs are likely before generation begins

Errors should be human-readable.

Bad:

```text
undefined property visual_style
```

Good:

```text
Your style bible is missing the required field: visual_style.medium

Add something like:

visual_style:
  medium: "simple hand-drawn cartoon"
```

---

# 4. MVP Scope

## Version 1 Must Include

* project initialisation
* project configuration file
* style bible
* character bible
* platform/output profiles
* validation
* audio/script input handling
* transcript generation or import
* timestamp generation
* scene segmentation
* prompt generation
* cost estimation
* dry run mode
* preview batch support
* manual image-generation mode
* optional provider-based image generation
* captions export
* edit manifest export
* run report
* next-step README

## Version 1 Should Not Include

* direct YouTube/TikTok/LinkedIn publishing
* analytics dashboards
* automated channel scraping
* full SaaS accounts
* complex GUI
* final video rendering as a required feature
* automatic thumbnail A/B testing
* automatic comments/replies
* scheduling
* team permissions

---

# 5. Example Workflow

## Step 1: Create a project

```bash
video-pack init my-first-video
```

This creates:

```text
my-first-video/
  project.yml
  input/
    script.txt
    voice.mp3
    style-bible.yml
    characters.yml
  output/
```

## Step 2: Validate inputs

```bash
video-pack validate --project ./my-first-video
```

The CLI checks:

* required files exist
* config values are valid
* target platform is known
* audio file path is valid
* style bible has required fields
* character bible has valid structure
* image provider settings are usable

## Step 3: Plan the run

```bash
video-pack plan --project ./my-first-video
```

The CLI outputs:

* estimated duration
* estimated number of scenes
* estimated number of images
* target format
* likely caption style
* estimated image generation cost
* output files that will be created
* warnings or recommendations

## Step 4: Prepare transcript, timestamps and scenes

```bash
video-pack prepare --project ./my-first-video
```

The CLI generates:

* `transcript.txt`
* `timestamps.json`
* `scenes.json`

## Step 5: Generate prompts

```bash
video-pack prompts --project ./my-first-video
```

The CLI generates:

* `prompts.json`
* `prompts.md`
* `storyboard.md`

## Step 6: Preview first few images

```bash
video-pack preview --project ./my-first-video --count 5
```

The CLI generates or prepares only the first 5 image prompts/images.

This allows the user to test style consistency before spending credits on the full production.

## Step 7: Generate or manually produce full image set

```bash
video-pack generate-images --project ./my-first-video
```

Provider modes:

* `manual`: save prompts only
* `mock`: generate placeholders for testing
* `openai`: generate images using OpenAI image API if configured
* `hicksfield`: future adapter placeholder

## Step 8: Package for editing

```bash
video-pack package --project ./my-first-video
```

The CLI creates:

* captions file
* edit manifest
* storyboard
* final run report
* next-step instructions

---

# 6. Input Files

## 6.1 `project.yml`

Example:

```yaml
project_name: "dopamine-tax"
profile: "tiktok"
aspect_ratio: "9:16"

input:
  audio_file: "./input/voice.mp3"
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

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
  images_per_scene: 1
```

## 6.2 `style-bible.yml`

Example:

```yaml
style_name: "The Overwhelmies"

visual_style:
  medium: "simple hand-drawn cartoon"
  line_quality: "clean but slightly imperfect"
  colour_palette: "limited flat colours"
  background_style: "minimal, often white or sparse"
  visual_complexity: "low"
  emotional_tone: "comic, anxious, warm and observant"

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

## 6.3 `characters.yml`

Example:

```yaml
characters:
  - name: "Main Character"
    role: "protagonist"
    appearance:
      body_type: "ordinary adult"
      clothing: "casual jumper and trousers"
      hair: "slightly messy dark hair"
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
      clothing: "none"
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

## 6.4 `script.txt`

Plain text.

Example:

```text
I thought I was going to relax today.

Then my brain reminded me about the unread emails.

Then the unpaid invoice.

Then the half-built app.

Then the thing I said weirdly in 2017.
```

## 6.5 `voice.mp3`

The user records their narration in their own voice.

Supported formats for MVP:

* `.mp3`
* `.wav`
* `.m4a`

---

# 7. Output Files

The tool should create:

```text
output/
  01_transcript/
    transcript.txt
    timestamps.json

  02_scenes/
    scenes.json
    scenes.md

  03_prompts/
    prompts.json
    prompts.md

  04_images/
    preview/
    full/

  05_captions/
    captions.srt
    captions.vtt

  06_edit_pack/
    edit_manifest.csv
    edit_manifest.json
    storyboard.md

  run_report.md
  cost_estimate.json
  README_NEXT_STEPS.md
```

---

# 8. Scene Object Structure

Example `scenes.json`:

```json
[
  {
    "scene_number": 1,
    "start": "00:00.000",
    "end": "00:04.500",
    "duration_seconds": 4.5,
    "transcript": "I thought I was going to relax today.",
    "visual_goal": "Main Character sitting on sofa with a cup of tea, looking cautiously hopeful.",
    "characters": ["Main Character"],
    "mood": "calm before the storm",
    "notes": ""
  }
]
```

---

# 9. Prompt Object Structure

Example `prompts.json`:

```json
[
  {
    "scene_number": 1,
    "image_filename": "scene_001_00-00_to_00-04.png",
    "prompt": "Simple hand-drawn cartoon in The Overwhelmies style. Main Character sitting on a sofa with a cup of tea, looking cautiously hopeful. Minimal white background, flat colours, clean but slightly imperfect linework, readable mobile composition. Avoid photorealism, 3D render, cinematic lighting, cluttered background.",
    "negative_prompt": "photorealism, 3D render, cinematic lighting, overly detailed background, inconsistent character design, tiny unreadable text"
  }
]
```

---

# 10. Platform Profiles

The CLI should support output profiles.

## `tiktok`

Defaults:

* aspect ratio: `9:16`
* scene duration: 2 to 5 seconds
* captions: large and readable
* pacing: fast
* recommended length: 20 to 60 seconds
* opening hook must land within first 2 seconds

## `youtube-shorts`

Defaults:

* aspect ratio: `9:16`
* scene duration: 3 to 6 seconds
* recommended length: 30 to 60 seconds
* completion loop encouraged
* first frame should work as thumbnail if needed

## `youtube-long`

Defaults:

* aspect ratio: `16:9`
* scene duration: 5 to 12 seconds
* recommended sections
* chapter-style structure
* stronger narrative arc

## `linkedin-video`

Defaults:

* aspect ratio: `1:1`, `4:5` or `16:9`
* scene duration: 4 to 8 seconds
* captions: clean and professional
* tone: useful, thoughtful, credible
* avoid excessive absurdity unless profile permits it

Profiles should influence:

* scene density
* caption guidance
* visual pacing
* next-step advice
* aspect-ratio recommendations
* run report notes

---

# 11. Cost Estimation

Before image generation, the CLI should estimate costs.

Example:

```text
Estimated run:

Scenes: 24
Images per scene: 1
Preview images: 5
Full image generations: 24
Provider: OpenAI
Estimated cost per image: £0.04

Preview estimate: £0.20
Full estimate: £0.96
Total likely cost: £0.96 to £1.20
```

Cost estimation should be configurable in `project.yml` or `providers.yml`.

The system does not need to fetch live pricing in v1.

---

# 12. Provider Modes

## Manual Mode

No image generation happens.

The CLI outputs prompts and filenames only.

This is useful when using:

* Hicksfield manually
* Midjourney
* DALL-E manually
* Canva
* another visual tool

## Mock Mode

The CLI creates placeholder images with scene numbers.

Useful for testing editing workflow without spending money.

## OpenAI Mode

If an API key is configured, generate images automatically.

Should support:

* preview generation
* full generation
* resume
* regenerate failed scenes

## Hicksfield Mode

Future adapter.

For v1, it is acceptable to include a placeholder interface or documentation note.

---

# 13. Required CLI Commands

## `init`

```bash
video-pack init my-project
```

Creates starter project files and example bibles.

## `validate`

```bash
video-pack validate --project ./my-project
```

Validates inputs and explains any issues.

## `plan`

```bash
video-pack plan --project ./my-project
```

Shows projected scene count, costs and output files.

## `prepare`

```bash
video-pack prepare --project ./my-project
```

Creates transcript, timestamps and scenes.

## `prompts`

```bash
video-pack prompts --project ./my-project
```

Creates image prompts from scenes, style bible and character bible.

## `preview`

```bash
video-pack preview --project ./my-project --count 5
```

Generates or prepares the first few images/prompts.

## `generate-images`

```bash
video-pack generate-images --project ./my-project
```

Generates all images using selected provider.

## `package`

```bash
video-pack package --project ./my-project
```

Creates final edit pack and next-step documentation.

---

# 14. Resumable Runs

The CLI should not redo expensive work unnecessarily.

It should:

* skip existing transcript unless forced
* skip existing scene file unless forced
* skip existing prompts unless forced
* skip generated images unless `--force` is passed
* support `--resume`
* support `--from-scene`

Example:

```bash
video-pack generate-images --project ./my-project --resume
```

```bash
video-pack generate-images --project ./my-project --from-scene 6
```

---

# 15. Documentation Requirements

The repository must include:

* `README.md`
* `docs/INPUTS.md`
* `docs/OUTPUTS.md`
* `docs/WORKFLOW.md`
* `docs/PROFILES.md`
* `docs/PROVIDERS.md`
* example project folder

Each generated project should include:

* `README_PROJECT.md`
* `README_NEXT_STEPS.md`

---

# 16. Next-Step Guidance

After each successful command, the CLI should tell the user what to do next.

Example after `prepare`:

```text
Prepared transcript and scenes.

Created:
- output/01_transcript/transcript.txt
- output/01_transcript/timestamps.json
- output/02_scenes/scenes.json
- output/02_scenes/scenes.md

Next step:
Review output/02_scenes/scenes.md.
Edit any visual goals you want to change.
Then run:

video-pack prompts --project ./my-project
```

Example after `preview`:

```text
Preview complete.

Review:
output/04_images/preview/

If the style works, run:

video-pack generate-images --project ./my-project

If the style is wrong, edit:
input/style-bible.yml
output/03_prompts/prompts.json

Then rerun preview.
```

---

# 17. Acceptance Criteria

The MVP is complete when:

1. A user can initialise a new project.
2. The tool creates valid starter config files.
3. The tool validates config and gives useful error messages.
4. The tool can accept a script and/or audio file.
5. The tool can produce a transcript and estimated timestamps.
6. The tool can split transcript into scenes.
7. The tool can generate prompts using the style bible and character bible.
8. The tool can estimate image generation costs before generation.
9. The tool can run a preview batch.
10. The tool can generate or mock images.
11. The tool can produce captions.
12. The tool can produce an edit manifest.
13. The tool can produce next-step documentation.
14. The tool works for at least three profiles: TikTok, YouTube Shorts and LinkedIn video.
15. The code is documented enough for future extension.

---

# 18. Future Features

Later versions may include:

* web UI
* direct CapCut project export
* Premiere XML export
* DaVinci Resolve timeline export
* automatic thumbnail generation
* automatic title and description generation
* YouTube upload helper
* TikTok/LinkedIn posting checklist
* analytics import
* viral structure analyser
* transcript-based research ingestion
* AI TV Studio integration
* reusable channel bibles
* multi-project library
* character consistency memory
* image comparison and approval UI
* automatic retry with prompt improvements

---

# 19. Strategic Positioning

This tool is not just for generating faceless videos.

It is a production layer for experimenting with repeatable content formats.

It can support:

* personal creative channels
* business thought-leadership videos
* educational explainers
* AI TV Studio experiments
* short-form storytelling
* brand character content
* low-cost video prototyping

The tool should make it faster to test whether an idea works without forcing the user into a full manual production process every time.
