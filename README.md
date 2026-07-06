# faceless video-pack

`faceless video-pack` is a local CLI workflow for turning a script, voiceover and visual style bible into an editable production pack for faceless video.

Use the CLI with:

```bash
video-pack
```

It is intentionally not a one-click publishing machine. It prepares the files, prompts, captions, timelines, copy and checklists you need, then you assemble and publish manually in your editor.

## How to Use This in Real Life

You do not start inside the CLI.

Start in ChatGPT, Claude, your notes app, or your own writing process. The CLI becomes useful after you have a script direction, a voiceover plan and a rough visual style.

The happy path is:

```text
idea
-> script
-> voiceover
-> style bible
-> character bible
-> validate
-> analyze
-> plan
-> proposal
-> prepare
-> visual events
-> prompts
-> preview
-> generate
-> organize scene assets
-> optional upscale or scene video clips
-> review and approve images
-> package
-> board
-> optional Remotion preview/render
-> edit manually
-> publish manually
```

### Start With the Idea and Script

Ask for a script for your target format:

- 30 second TikTok
- 60 second YouTube Short
- 2 to 5 minute YouTube explainer
- LinkedIn video
- faceless story pitch
- narrated illustrated essay

Copy this into ChatGPT or another writing tool:

```text
I want to create a faceless narrated video.

Please help me turn this idea into a spoken script.

Target platform:
[ TikTok / YouTube Shorts / YouTube long-form / LinkedIn ]

Target length:
[ 30 seconds / 60 seconds / 3 minutes ]

Tone:
[ funny / thoughtful / educational / sharp / warm / weird / professional ]

Audience:
[ describe audience ]

Idea:
[ paste idea ]

Please ask me up to 5 useful questions first. Then write a script that sounds natural when spoken aloud.
```

### Create the Voiceover

You can:

1. Record your own voice.
2. Hire a voiceover artist.
3. Use an AI voice tool such as ElevenLabs or another voice generator.

Your own voice is usually best when the channel depends on humour, accent, personality, local references or personal authority.

Save the final voiceover as:

```text
input/voice.mp3
```

Supported local audio formats include:

```text
.mp3
.wav
.m4a
```

Some AI voice tools offer free credits or starter plans, but check their current pricing and usage rules.

For example, as of June 2026, the [ElevenLabs pricing page](https://elevenlabs.io/pricing) lists 10k credits per month on its Free plan, described as about 10 minutes of Text to Speech UI. That is usually enough to test or produce a short voiceover, but always check the current pricing page before relying on it.

### Add the Script

Paste the final spoken script into:

```text
input/script.txt
```

The script and voiceover should match reasonably closely. If you ad-libbed heavily when recording, update the script before running the workflow.

### Generate the Visual Style Bible With ChatGPT

You do not need to write the style bible from scratch.

The easiest approach is to use ChatGPT as a setup assistant.

Open:

```text
input/style-bible.yml
```

Copy the demo contents into ChatGPT, paste your script or idea, then ask ChatGPT to interview you and generate a finished `style-bible.yml`.

```text
I am creating a faceless video using a local CLI tool called faceless video-pack.

I need help creating a style-bible.yml file.

First, ask me up to 10 useful questions about the visual style, audience, tone, platform and visual references.

After I answer, generate a complete style-bible.yml file that matches this structure:

style_name:
visual_style:
  medium:
  line_quality:
  colour_palette:
  background_style:
  visual_complexity:
  emotional_tone:
composition_rules:
  aspect_ratio:
  framing:
  readability:
  subject_size:
prompt_rules:
  always_include:
  avoid:

Make the output valid YAML.

Do not include explanation inside the YAML.

Important:
Text in images is allowed when it is naturally part of the scene, such as a handwritten notebook title, sign, poster, prop label or comic object. Avoid tiny captions, dense paragraphs or important factual text that must be perfectly readable.

Here is the demo style-bible.yml:

[PASTE DEMO STYLE BIBLE HERE]

Here is my script or idea:

[PASTE SCRIPT OR IDEA HERE]
```

Replace the contents of `input/style-bible.yml` with ChatGPT's generated YAML.

Then run:

```bash
video-pack validate --project ./my-video
```

### Generate the Character Bible With ChatGPT

The character bible defines recurring people, creatures, mascots, symbolic figures, presenters or background groups.

You do not need to create this manually.

```text
I am creating a faceless video using a local CLI tool called faceless video-pack.

I need help creating a characters.yml file.

First, read my script or idea and identify the recurring characters, presenters, mascots, symbolic figures, crowds or creatures that should appear visually.

Then ask me any useful questions needed to make those characters visually consistent.

After I answer, generate a complete characters.yml file that matches this structure:

characters:
  - name:
    role:
    appearance:
      body_type:
      clothing:
      hair:
      expression_range:
    personality:
      traits:
    prompt_anchor:

Make the output valid YAML.

The prompt_anchor field is especially important. It should be a short reusable description that helps image generators keep the character visually consistent.

Do not include explanation inside the YAML.

Here is the demo characters.yml:

[PASTE DEMO CHARACTERS FILE HERE]

Here is my script or idea:

[PASTE SCRIPT OR IDEA HERE]
```

Replace the contents of `input/characters.yml` with ChatGPT's generated YAML.

Then run:

```bash
video-pack validate --project ./my-video
```

Tip: keep the first version simple. A first project might only need one main character, one sidekick or symbolic character, and one background crowd or setting group.

### Optional: Generate a Channel Bible With ChatGPT

A channel bible is useful if you want multiple videos to share the same audience, voice, recurring formats, CTAs, hashtags and visual rules.

```text
I am creating a faceless video channel using a local CLI tool called faceless video-pack.

I need help creating a channel-bible.yml file.

First, ask me up to 8 questions about the channel audience, tone, content pillars, recurring formats, publishing style and calls to action.

After I answer, generate a complete channel-bible.yml file with this structure:

channel_name:
audience:
platform_priorities:
voice:
  tone:
  point_of_view:
  pacing:
content_pillars:
recurring_formats:
publishing:
  default_cta:
  description_boilerplate:
  hashtags:
prompt_rules:
  always_include:
  avoid:
  thumbnail_rules:
  title_rules:

Make the output valid YAML.

Do not include explanation inside the YAML.

Here is my channel idea:

[PASTE CHANNEL IDEA HERE]
```

## Install

Requirements:

- Node.js 20+
- npm

Install dependencies and build:

```bash
npm install
npm run build
```

Optional `.env` setup:

macOS / Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then add only the keys you need to `.env`.

- `OPENAI_API_KEY` for OpenAI image generation or transcription
- `MAGNIFIC_API_KEY` for optional Magnific image generation, upscaling or scene video clips
- `MAGNIFIC_WEBHOOK_KEY` for future Magnific webhook verification
- `PEXELS_API_KEY` for optional Pexels stock downloads
- `PIXABAY_API_KEY` for optional Pixabay stock downloads

You do not need an API key for the manual, external or mock workflow.

Check setup without revealing key values:

```bash
video-pack doctor --project ./my-video
```

macOS notes:

```text
docs/MAC_SETUP.md
```

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

Try the local mock demo without any API key:

```bash
npm run demo:mock
```

Pick it back up later:

```bash
npm run demo:status
```

The main public examples live in:

- `examples/tiktok-local-film-pitch`
- `examples/youtube-pop-economics-explainer`
- `examples/linkedin-ai-jargon-series-ep1`

## Start Your Own Project

Create a project:

```bash
node dist/index.js init my-video
```

Check what to do next:

```bash
node dist/index.js guide
node dist/index.js wizard --project ./my-video
node dist/index.js next --project ./my-video
```

The easiest creator loop is:

```bash
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

`wizard` shows the next command and the route. `next` runs the next safe step, refreshes `output/BOARD.html`, and stops before paid API image generation unless you pass `--allow-paid`.

For manual testing, you can still run the safe workflow up to preview:

```bash
node dist/index.js validate --project ./my-video
node dist/index.js analyze --project ./my-video
node dist/index.js plan --project ./my-video
node dist/index.js proposal --project ./my-video
node dist/index.js prepare --project ./my-video
node dist/index.js visual-events --project ./my-video
node dist/index.js prompts --project ./my-video
node dist/index.js preview --project ./my-video --count 5 --provider mock
```

If you linked the package with `npm link`, replace `node dist/index.js` with `video-pack`.

## What It Creates

`faceless video-pack` creates:

- content analysis for hook, pacing and platform fit
- a production proposal with pipeline, provider readiness, cost watch and human checkpoints
- a local `BOARD.html` / `BOARD.md` project dashboard
- a decision log for route and safety choices
- estimated transcript timings
- editable scene list
- scene production layouts for fast-cut, additive-slide, voxpop, screen-demo, montage and single-image scenes
- visual event plans for edit pacing
- additive overlay text rows
- stock cutaway search queries and credit worksheets
- optional free stock asset downloads through Pexels or Pixabay
- local asset manifest from `input/assets/`
- image prompts grounded in your style and characters
- manual, external, mock, OpenAI or Magnific preview batches
- logical per-scene asset folders for prompts, images, approvals, upscales, clips and notes
- optional Magnific upscale and scene video generation reports
- optional Higgsfield scene video handoff request packs
- captions in SRT and VTT
- edit manifest in CSV and JSON
- storyboard, shot list and asset checklist
- upload checklist and metadata brief
- reusable channel-bible guidance
- thumbnail prompts and thumbnail assets
- image approval sheets
- image and thumbnail review boards
- Premiere, DaVinci and FCPXML timeline exports
- CapCut assembly CSV and guide
- optional Remotion browser preview and MP4 render project
- title, description and post copy
- run report and next-step instructions

## Provider Modes

### `manual`

Creates prompt packs only. Use this when you want to copy prompts into another tool yourself.

### `external`

Same practical workflow as `manual`, but clearer when you intend to use a tool outside this CLI, such as ChatGPT image generation, Codex-assisted image generation, Higgsfield, Midjourney, Leonardo, Ideogram or another image tool.

It does not call an API and does not claim access to ChatGPT or Codex built-in image credits.

### `mock`

Creates placeholder PNGs for testing the workflow without spending money.

### `openai`

Uses `OPENAI_API_KEY` and may incur API costs.

### `magnific`

Uses `MAGNIFIC_API_KEY` for Magnific image generation. The same key is also used by:

```bash
video-pack upscale-images --project ./my-video --provider magnific
video-pack generate-scene-videos --project ./my-video --provider magnific --duration 5
```

Magnific work is asynchronous, so the CLI creates a task, polls for completion, downloads the generated asset, and writes a report into the relevant scene folder.

## Production Pipelines

`profile` controls output format. `pipeline` controls production intent.

Example:

```yaml
pipeline: "faceless-explainer"
profile: "tiktok"
aspect_ratio: "9:16"
```

List built-in pipelines:

```bash
video-pack pipelines
```

Current presets:

- `faceless-explainer`
- `animated-explainer`
- `documentary-montage`
- `screen-demo`

Before asset-heavy work, generate the route proposal:

```bash
video-pack proposal --project ./my-video
```

The proposal is written to `output/00_proposal/proposal.md`. The live project board is written to `output/BOARD.html`.

## Using ChatGPT or Another External Image Tool

Run:

```bash
video-pack generate-images --project ./my-video --provider external
```

Then open:

```text
output/04_images/full/full_prompts.md
```

Copy prompts into your chosen image generation tool.

Save each image using the suggested filename.

Place finished images in:

```text
output/04_images/full/
```

Then run:

```bash
video-pack scene-assets --project ./my-video
video-pack approve-images --project ./my-video
video-pack package --project ./my-video
```

Scene folders are written to:

```text
output/04_images/scenes/scene_001/
```

Each folder keeps `prompt.md`, `prompt.json`, `image.png`, optional `approved.png`, `upscaled/`, `video/` and `notes.md` together.

## Optional Upscale and Scene Video Clips

After image generation, use scene folders as the working asset pack:

```bash
video-pack scene-assets --project ./my-video
video-pack upscale-images --project ./my-video --provider manual
video-pack generate-scene-videos --project ./my-video --provider manual
```

Manual mode writes request packs only. For API generation:

```bash
video-pack upscale-images --project ./my-video --provider magnific
video-pack generate-scene-videos --project ./my-video --provider magnific --duration 5
```

For Higgsfield, the CLI writes an MCP/CLI handoff pack because this integration is intentionally treated as experimental:

```bash
video-pack generate-scene-videos --project ./my-video --provider higgsfield
```

## Visual Events, Overlays and Stock Planning

After scenes are prepared, you can generate an editor-facing plan:

```bash
video-pack visual-events --project ./my-video
```

This creates:

- `output/02_scenes/scene_production.html`
- `output/02_scenes/scene_production.md`
- `output/02_scenes/scene_production.json`
- `output/02_scenes/visual_events.md`
- `output/06_edit_pack/visual_events.csv`
- `output/06_edit_pack/overlay_text.csv`
- `output/06_edit_pack/stock_asset_queries.csv`
- `output/06_edit_pack/stock_credits.md`
- `output/06_edit_pack/asset_manifest.json`

This stage chooses the scene production layout, then plans image holds, text overlays, transitions and optional stock cutaway searches. The stock files are search plans only. The CLI does not call stock APIs, download assets or add credits automatically. `video-pack package` also creates these files if they are missing.

Open `output/02_scenes/scene_production.html` first. It is the guided review board for layout mode, base frame, layers, continuity and expected assets. Scene production layout modes include `fast-cut`, `additive-slide`, `voxpop`, `screen-demo`, `montage` and `single-image`. See [Scene production](docs/SCENE_PRODUCTION.md).

### Pacing Modes

Visual events label each scene with an edit pacing mode:

| Mode | Use it for | What it creates |
| --- | --- | --- |
| `burst` | hooks, cold opens, fast jokes, pattern interrupts | quick cutaways, punchy text and a clean transition |
| `steady` | explanations, slower narrative sections, context setting | one main image hold with a simple supporting overlay |
| `additive` | term reveals, list items, step-by-step ideas | layered text/overlay beats plus a supporting cutaway |
| `landing` | recap, payoff, CTA or final beat | takeaway text, CTA overlay and a final hold |

The default `profile` pacing chooses these automatically from the profile and scene position. You can override early planning in `project.yml` with `visual_events.default_pacing`.

To download optional free stock placeholders or assets:

```bash
video-pack stock-assets --project ./my-video --provider mock --limit 5
video-pack stock-assets --project ./my-video --provider pexels --limit 5
video-pack stock-assets --project ./my-video --provider pixabay --limit 5
```

Real stock providers require their own API keys in `.env`:

```env
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Downloaded assets and credits are written to:

```text
output/06_edit_pack/stock_assets/
```

Always review provider license and credit requirements before publishing.

The included examples cover the pacing vocabulary:

- `tiktok-local-film-pitch` - burst hook, additive short-form escalation, landing payoff
- `youtube-pop-economics-explainer` - steady explainer pacing with additive section beats and landing recap
- `linkedin-ai-jargon-series-ep1` - burst hook, additive term reveals, landing recap and stock search worksheets

## Remotion Preview and Render Output

`video-pack package` also creates an optional Remotion project:

```text
output/08_remotion/
```

Use it when you want a browser-previewable draft or a direct MP4 render without opening Premiere, DaVinci or CapCut first.

```bash
cd output/08_remotion
npm install
npm run dev
npm run render
```

You can regenerate only the Remotion output after changing images, visual events or stock assets:

```bash
video-pack remotion --project ./my-video --force
```

The Remotion draft uses scene video clips when present, then upscaled images, then approved scene images, then source scene images. Missing media renders as readable placeholders. It also uses optional stock assets when downloaded, overlay events, captions and voiceover audio when configured.

## CapCut

CapCut is supported as a practical assembly pack, not a hidden project-file export.

`video-pack package` and `video-pack export-timeline --format capcut` create:

```text
output/06_edit_pack/timelines/capcut_timeline.csv
output/06_edit_pack/capcut_assembly_guide.md
```

Use these with `output/05_captions/captions.srt`, generated images, optional stock assets and overlay text. DaVinci/Premiere/FCPXML exports remain useful, but CapCut is likely the friendlier default for many short-form creators.

## Text in Images

Text is not banned.

It can work well when it is part of the scene, such as:

- a handwritten notebook title
- a sign
- a label on a prop
- a comic poster
- a title card
- a fake newspaper headline

However, avoid relying on generated images for tiny, dense or important factual text.

If text must be perfect, add it later in CapCut, Premiere, DaVinci or your editor.

## Costs

The base estimate is simple arithmetic from the configured per-image cost.

The cautious estimate applies a multiplier to allow for provider variation, retries or billing differences.

Example:

```yaml
costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
  cost_multiplier: 2
```

Actual costs can vary by provider, model, quality, image size, retries and provider billing behaviour. Do not treat the estimate as a billing guarantee.

## Project Structure

`video-pack init my-project` creates:

```text
my-project/
  project.yml
  input/
    assets/
    script.txt
    style-bible.yml
    characters.yml
    channel-bible.yml
    voice.example.txt
  output/
  README_PROJECT.md
```

## Core Commands

```bash
video-pack validate --project ./my-video
video-pack analyze --project ./my-video
video-pack plan --project ./my-video
video-pack proposal --project ./my-video
video-pack prepare --project ./my-video
video-pack visual-events --project ./my-video
video-pack prompts --project ./my-video
video-pack preview --project ./my-video --count 5
video-pack generate-images --project ./my-video
video-pack scene-assets --project ./my-video
video-pack upscale-images --project ./my-video --provider manual
video-pack generate-scene-videos --project ./my-video --provider manual
video-pack approve-images --project ./my-video
video-pack package --project ./my-video
video-pack board --project ./my-video
video-pack doctor --project ./my-video
video-pack wizard --project ./my-video
video-pack next --project ./my-video
video-pack status --project ./my-video
video-pack guide --project ./my-video
video-pack guide
```

Other useful commands:

```bash
video-pack audio-info --project ./my-video
video-pack transcribe --project ./my-video --provider openai
video-pack visual-events --project ./my-video
video-pack stock-assets --project ./my-video --provider mock
video-pack upscale-images --project ./my-video --provider magnific
video-pack generate-scene-videos --project ./my-video --provider higgsfield
video-pack approve-images --project ./my-video
video-pack generate-thumbnails --project ./my-video
video-pack remotion --project ./my-video
video-pack copy --project ./my-video
video-pack export-timeline --project ./my-video --format capcut
video-pack pipelines
video-pack profiles
video-pack channel-bible ./bibles/my-channel.yml --name "My Channel"
```

## Profiles

| Profile | Aspect ratio | Best for |
| --- | --- | --- |
| `tiktok` | `9:16` | Fast short-form videos with an immediate hook |
| `youtube-shorts` | `9:16` | Short-form loops, payoffs and completion-focused edits |
| `youtube-long` | `16:9` | Slower essays, explainers and chaptered videos |
| `linkedin-video` | `4:5` | Professional, useful, caption-first posts |

## Documentation

- [Workflow](docs/WORKFLOW.md)
- [macOS setup](docs/MAC_SETUP.md)
- [ChatGPT setup](docs/CHATGPT_SETUP.md)
- [Providers](docs/PROVIDERS.md)
- [Production pipelines](docs/PIPELINES.md)
- [Scene production](docs/SCENE_PRODUCTION.md)
- [Costs](docs/COSTS.md)
- [Examples](docs/EXAMPLES.md)
- [Walkthrough video script](docs/WALKTHROUGH_VIDEO.md)
- [Inputs](docs/INPUTS.md)
- [Outputs](docs/OUTPUTS.md)
- [Profiles](docs/PROFILES.md)

## Development

```bash
npm install
npm run build
npm test
node dist/index.js --help
```

## Design Principles

- CLI first
- creator-first onboarding
- generic across creative projects
- human override at every stage
- editable files over hidden state
- preview before full generation
- manual publishing by design
