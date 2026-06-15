# faceless video-pack

`faceless video-pack` is a local CLI workflow for turning a script, voiceover and visual style bible into an editable production pack for faceless video.

The repository is named `faceless`. The CLI command remains:

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
-> prepare
-> prompts
-> preview
-> generate
-> package
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

Optional OpenAI setup:

```powershell
Copy-Item .env.example .env
```

Then add `OPENAI_API_KEY` to `.env` if you want OpenAI image generation or transcription. You do not need an API key for the manual, external or mock workflow.

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
- `examples/linkedin-ai-business-tip`

## Start Your Own Project

Create a project:

```bash
node dist/index.js init my-video
```

Check what to do next:

```bash
node dist/index.js guide --project ./my-video
```

Run the safe workflow up to preview:

```bash
node dist/index.js validate --project ./my-video
node dist/index.js analyze --project ./my-video
node dist/index.js plan --project ./my-video
node dist/index.js prepare --project ./my-video
node dist/index.js prompts --project ./my-video
node dist/index.js preview --project ./my-video --count 5 --provider mock
```

If you linked the package with `npm link`, replace `node dist/index.js` with `video-pack`.

## What It Creates

`faceless video-pack` creates:

- content analysis for hook, pacing and platform fit
- estimated transcript timings
- editable scene list
- image prompts grounded in your style and characters
- manual, external, mock or OpenAI preview batches
- captions in SRT and VTT
- edit manifest in CSV and JSON
- storyboard, shot list and asset checklist
- upload checklist and metadata brief
- reusable channel-bible guidance
- thumbnail prompts and thumbnail assets
- image approval sheets
- Premiere, DaVinci and FCPXML timeline exports
- title, description and post copy
- run report and next-step instructions

## Provider Modes

### `manual`

Creates prompt packs only. Use this when you want to copy prompts into another tool yourself.

### `external`

Same practical workflow as `manual`, but clearer when you intend to use a tool outside this CLI, such as ChatGPT image generation, Codex-assisted image generation, Hicksfield, Midjourney, Leonardo, Ideogram or another image tool.

It does not call an API and does not claim access to ChatGPT or Codex built-in image credits.

### `mock`

Creates placeholder PNGs for testing the workflow without spending money.

### `openai`

Uses `OPENAI_API_KEY` and may incur API costs.

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
video-pack package --project ./my-video
```

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
video-pack prepare --project ./my-video
video-pack prompts --project ./my-video
video-pack preview --project ./my-video --count 5
video-pack generate-images --project ./my-video
video-pack package --project ./my-video
video-pack status --project ./my-video
video-pack guide --project ./my-video
```

Other useful commands:

```bash
video-pack audio-info --project ./my-video
video-pack transcribe --project ./my-video --provider openai
video-pack approve-images --project ./my-video
video-pack generate-thumbnails --project ./my-video
video-pack copy --project ./my-video
video-pack export-timeline --project ./my-video
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
- [ChatGPT setup](docs/CHATGPT_SETUP.md)
- [Providers](docs/PROVIDERS.md)
- [Costs](docs/COSTS.md)
- [Examples](docs/EXAMPLES.md)
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
