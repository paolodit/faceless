# video-pack

Turn a narrated script into an editable production pack for short-form or long-form video.

`video-pack` is a local CLI for creators who want a repeatable, file-based workflow for AI-assisted video production. It takes a script, style bible and character bible, then prepares the practical assets you need to make a video in CapCut, Premiere Pro, DaVinci Resolve or another editor.

It is intentionally not a one-click publishing machine. The goal is to remove repetitive production friction while keeping creative control in human hands.

## What It Creates

From a script like this:

```text
I thought I was going to relax today.
Then my brain reminded me about the unread emails.
Then the unpaid invoice.
```

`video-pack` creates:

- content analysis for hook, pacing and platform fit
- estimated transcript timings
- editable scene list
- image prompts grounded in your style and characters
- manual or mock preview batches
- captions in SRT and VTT
- edit manifest in CSV and JSON
- storyboard, shot list and asset checklist
- upload checklist and metadata brief
- reusable channel-bible guidance
- thumbnail prompts and thumbnail assets
- image approval sheets
- Premiere, DaVinci and FCPXML timeline exports
- richer title, description and post copy
- run report and next-step instructions

## Who It Is For

`video-pack` is built for solo creators, small creative operators and developer-creators who:

- write scripts in ChatGPT or another writing tool
- record narration in their own voice
- want consistent visual styles and recurring characters
- test multiple channel ideas quickly
- use AI image tools but still edit manually
- prefer transparent files over black-box automation

Good fits:

- TikTok and YouTube Shorts explainers
- LinkedIn thought-leadership videos
- faceless commentary channels
- illustrated essays
- spoken-word or nostalgia videos
- AI TV Studio experiments
- repeatable creative prototypes

## What It Does Not Do

`video-pack` does not:

- publish directly to TikTok, YouTube, Instagram or LinkedIn
- render final edited videos
- replace your editor
- force one image provider
- hide generated files from you
- require paid image generation for the local MVP workflow

Every major output is saved as a readable, editable file.

## Install

Requirements:

- Node.js 20+
- npm

Install dependencies and build:

```bash
npm install
npm run build
```

Optional OpenAI setup:

```powershell
Copy-Item .env.example .env
```

Then add `OPENAI_API_KEY` to `.env` if you want OpenAI image generation or transcription. You do not need an API key for the local mock workflow.

Run locally:

```bash
node dist/index.js --help
```

Optionally link the CLI so `video-pack` is available directly:

```bash
npm link
video-pack --help
```

## Quick Start

Try the ready-made demo without any API key:

```bash
npm run demo:mock
```

Pick it back up later:

```bash
npm run demo:status
```

The demo lives in `examples/dopamine-tax`.

## Start Your Own Project

Create a project:

```bash
node dist/index.js init dopamine-tax
```

Run the full local workflow:

```bash
node dist/index.js validate --project ./dopamine-tax
node dist/index.js analyze --project ./dopamine-tax
node dist/index.js plan --project ./dopamine-tax
node dist/index.js prepare --project ./dopamine-tax
node dist/index.js prompts --project ./dopamine-tax
node dist/index.js preview --project ./dopamine-tax --count 5
node dist/index.js generate-images --project ./dopamine-tax
node dist/index.js approve-images --project ./dopamine-tax --approve-all
node dist/index.js generate-thumbnails --project ./dopamine-tax
node dist/index.js copy --project ./dopamine-tax
node dist/index.js export-timeline --project ./dopamine-tax
node dist/index.js package --project ./dopamine-tax
```

Check where you are at any time:

```bash
node dist/index.js status --project ./dopamine-tax
```

If you linked the package with `npm link`, replace `node dist/index.js` with `video-pack`.

## Is It Ready To Use?

Yes, for the local production-pack workflow:

- `manual` mode is ready for copy/paste image generation in external tools.
- `mock` mode is ready for testing a full edit timeline without spending credits.
- `openai` mode is wired for image generation and transcription when `OPENAI_API_KEY` is set.
- `status` tells you exactly what is done and what to run next.
- `examples/dopamine-tax` gives you a known-good project to test or copy.

The main remaining caveat is that OpenAI calls require a real API key and network access. Final video editing and platform upload are still intentionally manual.

## Typical Workflow

1. Write or paste your narration into `input/script.txt`.
2. Describe the visual world in `input/style-bible.yml`.
3. Define recurring characters in `input/characters.yml`.
4. Run `analyze` to check hook timing, pacing and platform fit.
5. Run `plan` to estimate duration, scenes, image count and cost.
6. Run `prepare` to create transcript timings and scenes.
7. Review and edit `output/02_scenes/scenes.md`.
8. Run `prompts` to create image prompts.
9. Run `preview` before spending time or credits on the full set.
10. Run `generate-images` in `manual`, `mock` or `openai` mode.
11. Run `approve-images` to create or update the image approval sheet.
12. Run `generate-thumbnails` if you want thumbnail prompt packs or thumbnail assets.
13. Run `copy` to create title, description and platform post options.
14. Run `export-timeline` for Premiere, DaVinci and FCPXML helper files.
15. Run `package` to create the complete edit and publishing pack.
16. Assemble the final video manually in your editor.

## Project Structure

`video-pack init my-project` creates:

```text
my-project/
  project.yml
  input/
    script.txt
    style-bible.yml
    characters.yml
    channel-bible.yml
    voice.example.txt
  output/
  README_PROJECT.md
```

The generated production pack uses:

```text
output/
  00_analysis/
    content_analysis.md
    content_analysis.json
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
    approvals.json
    approval_sheet.md
  05_captions/
    captions.srt
    captions.vtt
  06_edit_pack/
    edit_manifest.csv
    edit_manifest.json
    storyboard.md
    shot_list.md
    asset_checklist.md
    timelines/
  07_publish/
    upload_checklist.md
    metadata_brief.md
    copy_pack.md
    thumbnails/
  cost_estimate.json
  run_report.md
  README_NEXT_STEPS.md
```

## Project Configuration

Each project has a `project.yml`:

```yaml
project_name: "dopamine-tax"
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

copy:
  provider: "heuristic"
  title_options: 8

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
```

## Commands

### `init`

Create a new project with starter inputs.

```bash
video-pack init my-video
```

### `validate`

Check project config, required files, style bible, characters, profile and provider settings.

```bash
video-pack validate --project ./my-video
```

### `analyze`

Create a content analysis pack for hook timing, platform fit, scene density and recommendations.

```bash
video-pack analyze --project ./my-video
```

Outputs:

```text
output/00_analysis/content_analysis.md
output/00_analysis/content_analysis.json
```

### `plan`

Estimate duration, scene count, preview images, full image count and cost.

```bash
video-pack plan --project ./my-video
```

Outputs:

```text
output/cost_estimate.json
```

### `prepare`

Use the script as a transcript, estimate timestamps and split it into editable scenes.

```bash
video-pack prepare --project ./my-video
```

### `prompts`

Generate image prompts from scenes, style rules and character anchors.

```bash
video-pack prompts --project ./my-video
```

Also creates thumbnail prompt packs:

```text
output/03_prompts/thumbnail_prompts.md
output/03_prompts/thumbnail_prompts.json
```

### `preview`

Prepare the first few prompts or mock images before committing to the full set.

```bash
video-pack preview --project ./my-video --count 5
video-pack preview --project ./my-video --count 5 --provider mock
```

### `generate-images`

Prepare the full image set in manual mode or generate placeholder PNGs in mock mode.

```bash
video-pack generate-images --project ./my-video
video-pack generate-images --project ./my-video --provider mock
video-pack generate-images --project ./my-video --provider openai
```

Useful flags:

```bash
--force
--resume
--from-scene <number>
--provider <manual|mock|openai>
```

### `package`

Create captions, edit manifests, shot lists, checklists and publishing support files.

```bash
video-pack package --project ./my-video
```

### `audio-info`

Detect local audio duration and write audio metadata.

```bash
video-pack audio-info --project ./my-video
```

### `transcribe`

Transcribe the configured audio file with OpenAI.

```bash
video-pack transcribe --project ./my-video --provider openai
```

Requires `OPENAI_API_KEY`.

### `generate-thumbnails`

Generate thumbnail prompt packs, mock thumbnails or OpenAI thumbnails.

```bash
video-pack generate-thumbnails --project ./my-video
video-pack generate-thumbnails --project ./my-video --provider mock
video-pack generate-thumbnails --project ./my-video --provider openai
```

### `approve-images`

Create or update the image approval workflow.

```bash
video-pack approve-images --project ./my-video
video-pack approve-images --project ./my-video --scene 3 --status needs-regen --notes "Face changed"
video-pack approve-images --project ./my-video --approve-all
```

### `copy`

Generate richer titles, descriptions and platform post copy.

```bash
video-pack copy --project ./my-video
```

### `export-timeline`

Export timeline helper files for Premiere, DaVinci Resolve and FCPXML-compatible workflows.

```bash
video-pack export-timeline --project ./my-video
video-pack export-timeline --project ./my-video --format premiere
video-pack export-timeline --project ./my-video --format davinci
video-pack export-timeline --project ./my-video --format fcpxml
```

### `status`

Show which pipeline stages are complete and what to run next.

```bash
video-pack status --project ./my-video
```

### `profiles`

List built-in output profiles.

```bash
video-pack profiles
video-pack profiles --json
```

### `channel-bible`

Create a reusable channel bible that multiple projects can reference.

```bash
video-pack channel-bible ./bibles/my-channel.yml --name "My Channel"
```

## Profiles

Built-in profiles:

| Profile | Aspect ratio | Best for |
| --- | --- | --- |
| `tiktok` | `9:16` | Fast short-form videos with an immediate hook |
| `youtube-shorts` | `9:16` | Short-form loops, payoffs and completion-focused edits |
| `youtube-long` | `16:9` | Slower essays, explainers and chaptered videos |
| `linkedin-video` | `4:5` | Professional, useful, caption-first posts |

Profiles influence:

- scene pacing
- caption guidance
- platform length warnings
- analysis recommendations
- next-step publishing advice

## Provider Modes

### `manual`

Writes prompt packs only. Use this when you want to generate images manually in tools like Midjourney, ChatGPT, DALL-E, Canva, Hicksfield or another visual tool.

### `mock`

Creates real placeholder PNGs with scene numbers and timestamps. Use this to test the editing workflow without spending credits.

### `openai`

Generates real images with the OpenAI Image API and transcribes audio with the OpenAI Audio Transcriptions API. It uses `OPENAI_API_KEY` and the model/settings in `project.yml`.

PowerShell:

```powershell
$env:OPENAI_API_KEY="sk-..."
video-pack preview --project ./my-video --provider openai --count 2
```

## Example: Manual Image Workflow

```bash
video-pack init dopamine-tax
video-pack analyze --project ./dopamine-tax
video-pack prepare --project ./dopamine-tax
video-pack prompts --project ./dopamine-tax
video-pack preview --project ./dopamine-tax --count 5
```

Review:

```text
dopamine-tax/output/04_images/preview/preview_prompts.md
```

If the style is working:

```bash
video-pack generate-images --project ./dopamine-tax
video-pack approve-images --project ./dopamine-tax --approve-all
video-pack package --project ./dopamine-tax
```

Then use `output/06_edit_pack/edit_manifest.csv` and `output/05_captions/captions.srt` in your editor.

## Example: Mock Edit Test

```bash
npm run demo:mock
```

This creates placeholder PNGs in:

```text
examples/dopamine-tax/output/04_images/full/
```

Use them to test timing, captions and timeline assembly before generating real visuals.

## Development

Install:

```bash
npm install
```

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Run the CLI from source build:

```bash
node dist/index.js --help
```

## Design Principles

- CLI first
- generic across creative projects
- human override at every stage
- editable files over hidden state
- friendly validation errors
- preview before full generation
- manual publishing by design

## Documentation

- [Inputs](docs/INPUTS.md)
- [Outputs](docs/OUTPUTS.md)
- [Workflow](docs/WORKFLOW.md)
- [Profiles](docs/PROFILES.md)
- [Providers](docs/PROVIDERS.md)

## Roadmap

Possible next steps:

- image approval UI
- richer native editor exports
