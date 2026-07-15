# faceless

Faceless is a guided local production tool for turning a narrated script into a reviewed, editable video pack. The installed command is `video-pack`.

It is deliberately focused on three creator workflows:

| Creator type | CLI type | Best for |
| --- | --- | --- |
| **Short Explainer** | `explainer` | TikTok, Reels and YouTube Shorts that explain one useful idea clearly |
| **LinkedIn Point-of-View / Vox Pop** | `linkedin` | professional explainers, expert opinions, claim-led commentary and interview-style formats |
| **Narrated Visual Story** | `story` | character-led stories, local film pitches, illustrated essays and place-led narratives |

Faceless creates route-specific script reviews, scene plans, prompts, review boards, captions, edit manifests, timeline helpers, publishing copy and an optional Remotion draft. It does not silently publish, approve creative work for you, or pretend a placeholder is a finished image.

## Recommended: Start with Codex or Claude

The easiest creator experience is to give Codex, Claude Code or another coding agent with terminal and file access the repository URL and tell it you want to make a production. It can clone or open Faceless, install it, and guide the workflow.

Use the copyable onboarding prompt in [START_WITH_AI.md](START_WITH_AI.md). The repository includes:

- [AGENTS.md](AGENTS.md), the canonical production and safety instructions for coding agents
- [CLAUDE.md](CLAUDE.md), a lightweight Claude Code entrypoint to the same instructions
- `productions/`, a Git-ignored workspace for private creator projects
- `output/SESSION_HANDOFF.md`, a generated return point with completed work, human gates and the exact next command

The coding agent acts as the conversational operator. The `video-pack` CLI remains the source of truth, and project files remain the durable state. An ordinary chat without terminal and file access can help write a script, but it cannot install or run the production workflow.

## Contents

- [Recommended: Start with Codex or Claude](#recommended-start-with-codex-or-claude)
- [What You Get](#what-you-get)
- [Quick Start](#quick-start)
- [Install](#install)
- [Configure](#configure)
- [Choose a Creator Type](#choose-a-creator-type)
- [Create a Project](#create-a-project)
- [Operate a Project](#operate-a-project)
- [Review Checkpoints](#review-checkpoints)
- [Audio and Transcription](#audio-and-transcription)
- [Images, Stock and Motion](#images-stock-and-motion)
- [Approval and Regeneration](#approval-and-regeneration)
- [Package and Edit](#package-and-edit)
- [Resume Existing Work](#resume-existing-work)
- [Troubleshooting](#troubleshooting)
- [Security and Privacy](#security-and-privacy)
- [Deployment and Distribution](#deployment-and-distribution)
- [Project Status](#project-status)
- [What to Build Next](#what-to-build-next)
- [Development](#development)

## What You Get

The normal production path is:

```text
script and optional voiceover
-> route-specific script review
-> scene and visual-event plan
-> low-cost layout preview
-> real scene assets
-> human approval
-> captions, edit assembly and publishing pack
-> optional Remotion preview or render
```

The generated pack includes:

- script analysis and a route-specific structural scorecard
- scene timings, visual goals, pacing and layout plans
- image and thumbnail prompts
- local HTML and Markdown review boards
- a generated session handoff for reliable agent and creator resumes
- per-scene asset folders with stable filenames and approval state
- optional OpenAI or Magnific image generation
- optional Pexels or Pixabay stock downloads
- optional Magnific upscaling and scene video generation
- manual Higgsfield scene-video handoff packs
- SRT and VTT captions
- Premiere, DaVinci Resolve and CapCut assembly CSVs
- FCPXML timeline interchange
- title, description, LinkedIn post and upload-checklist drafts
- an optional Remotion project for browser preview and MP4 rendering

The CLI is local and file based. There is no server, database, account system or automatic social publishing.

## Quick Start

Requirements: Node.js 20 or newer, npm, and a terminal.

```bash
git clone https://github.com/paolodit/faceless.git
cd faceless
npm ci
npm run build
npm link

video-pack init productions/my-video --type explainer
```

Replace `productions/my-video/input/script.txt`, then let the guided workflow lead:

```bash
video-pack doctor --project productions/my-video
video-pack wizard --project productions/my-video
video-pack next --project productions/my-video
```

Run `next` again after each requested human review. It executes the next safe stage and refreshes `productions/my-video/output/BOARD.html` plus `output/SESSION_HANDOFF.md`.

To try a complete no-cost local run using placeholder assets:

```bash
npm run demo:mock
```

Mock files prove the workflow and framing. They are not final creative assets.

## Install

### Windows PowerShell

```powershell
git clone https://github.com/paolodit/faceless.git
Set-Location faceless
npm.cmd ci
npm.cmd run build
npm.cmd link
video-pack --help
```

PowerShell may block `npm.ps1` under its script execution policy. Using `npm.cmd` as shown above avoids changing the machine policy. Command Prompt can use normal `npm` commands.

If `npm link` needs elevated permissions or `video-pack` is not found, use the repository-local command:

```powershell
node dist/index.js --help
node dist/index.js init my-video --type explainer
```

### macOS and Linux

```bash
git clone https://github.com/paolodit/faceless.git
cd faceless
npm ci
npm run build
npm link
video-pack --help
```

Install Node with [nodejs.org](https://nodejs.org/), Homebrew (`brew install node`) or a version manager such as `nvm`. If global linking is not available, use `node dist/index.js` from the repository.

macOS paths use `/`, environment variables use `export`, and filenames containing spaces must be quoted. See [docs/MAC_SETUP.md](docs/MAC_SETUP.md) for the short platform checklist.

### Verify the Installation

```bash
node --version
video-pack --version
video-pack doctor
video-pack pipelines
video-pack profiles
```

`doctor` reports setup readiness without printing secret values.

## Configure

No API key is required for planning, prompts, review boards, manual handoffs, mock assets, packaging or timeline export.

Copy the example only when you want API-backed features:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Available variables:

```env
# OpenAI image generation and audio transcription
OPENAI_API_KEY=

# Magnific image generation, upscaling and scene video
MAGNIFIC_API_KEY=

# Reserved for future callback verification; not needed by current polling flows
MAGNIFIC_WEBHOOK_KEY=

# Optional free-stock provider access
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

`.env` is loaded from the directory where the CLI is run. The simplest arrangement is to run commands from this repository and keep `.env` here. If projects live elsewhere, either keep a protected `.env` in that working directory or set keys for the current shell session.

Windows PowerShell session:

```powershell
$env:OPENAI_API_KEY="your-key"
```

macOS/Linux session:

```bash
export OPENAI_API_KEY="your-key"
```

Only configure providers you intend to use. Provider prices and free-tier limits change, so check the provider before a production run. ElevenLabs can be used separately to create a voiceover and has offered a limited free tier; confirm its current allowance before relying on it for a series.

## Choose a Creator Type

Creator type controls the creative structure. Profile controls the output format and aspect ratio.

### Short Explainer

```bash
video-pack init my-explainer --type explainer
```

Default route: `narrated-explainer` with a 9:16 YouTube Shorts profile. The review looks for a plain-language premise, explanation, concrete example, progression and memorable takeaway.

### LinkedIn Point-of-View / Vox Pop

```bash
video-pack init my-linkedin-video --type linkedin
```

Default route: `linkedin-vox-pop` with a 4:5 LinkedIn profile. The review looks for a feed-first opening, stance, tension, support and useful landing. It also creates `input/evidence.yml` so factual-looking claims can be mapped to a source, first-hand experience, internal data or declared editorial opinion.

The current workflow is strongest for scripted POV videos and designed interview-style explainers. Automatic ingest and cutting of long multi-speaker camera footage is not implemented yet.

### Narrated Visual Story

```bash
video-pack init my-story --type story
```

Default route: `narrated-visual-story` with a 9:16 TikTok profile. It adds `input/continuity.yml` and checks that world, character and place anchors reach the scene plan and prompt pack.

Available output profiles are `tiktok`, `youtube-shorts`, `youtube-long` and `linkedin-video`. Change `profile` and `aspect_ratio` in `project.yml` before generating assets.

## Create a Project

`init` creates a complete starter structure. The recommended private location is under the Git-ignored `productions/` folder:

```text
productions/my-video/
  project.yml
  README_PROJECT.md
  input/
    script.txt
    style-bible.yml
    characters.yml
    channel-bible.yml
    evidence.yml       # LinkedIn only
    continuity.yml     # story only
    assets/
  output/
    SESSION_HANDOFF.md  # generated resume state for people and coding agents
```

For a first run, replace only `input/script.txt`. The starter bibles are valid and can be refined after seeing one complete pass.

Use `input/assets/` for logos, screenshots, reference images, downloaded media or other local production material. Add a voiceover anywhere inside the project, then point `input.audio_file` in `project.yml` to it:

```yaml
input:
  audio_file: "./input/voice.mp3"
```

Private projects created under `productions/` are ignored by this repository. If you use another folder inside a public checkout, add it to `.gitignore` before adding scripts, audio, evidence or media. The ignore rule is not a backup system.

Reusable channel bibles can be created outside a project:

```bash
video-pack channel-bible ./bibles/my-channel.yml
```

Point multiple projects at that file in `project.yml`, or copy a reviewed version into each project for reproducible archives.

## Operate a Project

### Recommended Guided Loop

```bash
video-pack guide
video-pack guide --project ./my-video
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

- `guide` explains how to start when no project exists.
- `guide --project` shows the current stage, why the next action matters, review files and the exact next command.
- `wizard` explains the selected creator route and safest next action.
- `next` runs one safe stage and refreshes the project board.
- `status` gives detailed file-by-file progress and stale-output diagnostics.
- `board` regenerates `output/BOARD.html`, `output/BOARD.md` and `output/SESSION_HANDOFF.md`.

Use a goal when you only want part of the production path:

```bash
video-pack wizard --project ./my-video --goal images
video-pack wizard --project ./my-video --goal package
video-pack wizard --project ./my-video --goal upscale
video-pack wizard --project ./my-video --goal video
```

Paid image generation is never selected by `next` without an explicit opt-in:

```bash
video-pack next --project ./my-video --provider openai --allow-paid
video-pack next --project ./my-video --provider magnific --allow-paid
```

### Full Manual Command Order

Use this when debugging or deliberately controlling each stage:

```bash
video-pack validate --project ./my-video
video-pack analyze --project ./my-video
video-pack plan --project ./my-video
video-pack proposal --project ./my-video
video-pack prepare --project ./my-video

# LinkedIn only
video-pack claims --project ./my-video

# Narrated Visual Story only
video-pack continuity --project ./my-video

video-pack visual-events --project ./my-video
video-pack prompts --project ./my-video
video-pack preview --project ./my-video --provider mock --count 5
video-pack generate-images --project ./my-video --provider external
video-pack scene-assets --project ./my-video
video-pack approve-images --project ./my-video
video-pack generate-thumbnails --project ./my-video --provider external
video-pack package --project ./my-video
```

Use `--force` to regenerate output owned by a command. Use `--resume` on supported API asset commands to continue missing files. Existing creator inputs are not overwritten by normal resume behavior.

## Review Checkpoints

| Stage | Open this file | Decide |
| --- | --- | --- |
| route review | `output/00_analysis/route_review.html` | Does the script fulfil the promise of its creator type? |
| proposal | `output/00_proposal/proposal.md` | Is the route, provider and cost direction right? |
| claims | `output/00_analysis/claim_review.md` | Are LinkedIn claims mapped and honestly described? |
| scenes | `output/02_scenes/scenes.md` | Do narration beats and visual goals make sense? |
| continuity | `output/02_scenes/continuity_review.html` | Are story anchors present in every relevant scene and prompt? |
| scene production | `output/02_scenes/scene_production.html` | Are layouts, layers, cutaways and editor notes useful? |
| prompts | `output/03_prompts/prompts.md` | Is the art direction specific and internally consistent? |
| images | `output/04_images/review_board.html` | Does each actual asset serve its narration? |
| thumbnails | `output/07_publish/thumbnails/review_board.html` | Which concept is clearest at feed size? |
| package | `output/README_NEXT_STEPS.md` | Is the pack ready to assemble and fact-check? |

Visual-event pacing uses four labels:

- `burst`: hook, fast joke or pattern interrupt
- `steady`: explanation, context or slower story beat
- `additive`: term reveal, list or layered build
- `landing`: recap, payoff or call to action

These are edit intentions, not rigid durations. Review the generated scene plan before multiplying assets.

## Audio and Transcription

Supported local voiceover formats are MP3, WAV and M4A.

1. Save the audio inside the project.
2. Set `input.audio_file` in `project.yml`.
3. Detect its real duration.
4. Optionally create an OpenAI transcript.

```bash
video-pack audio-info --project ./my-video
video-pack transcribe --project ./my-video --provider openai
```

With `transcription.provider: "script"`, do not run `transcribe`: `prepare` uses `input/script.txt` as the transcript and costs nothing. The `transcribe` command is for the `openai` provider; it uploads the configured audio to the OpenAI transcription API and requires `OPENAI_API_KEY`.

Keep the final script aligned with the recorded narration. Audio duration improves scene timing, but generated timestamps remain an edit starting point and should be checked against the waveform in the editor.

## Images, Stock and Motion

### Image Providers

| Provider | Network/API call | Intended use |
| --- | --- | --- |
| `manual` | no | write prompt packs for a human workflow |
| `external` | no | use ChatGPT, Midjourney, Higgsfield or another external visual tool |
| `mock` | no | create numbered placeholder PNGs for testing |
| `openai` | yes, paid API may apply | generate images directly with OpenAI |
| `magnific` | yes, paid API may apply | generate images directly with Magnific |

External workflow:

```bash
video-pack generate-images --project ./my-video --provider external
```

Open `output/04_images/full/full_prompts.md`, generate each image in the chosen tool, and save it under the expected filename in `output/04_images/full/`.

Direct generation:

```bash
video-pack generate-images --project ./my-video --provider openai --resume
video-pack generate-images --project ./my-video --provider magnific --resume
```

Generate selected scenes only:

```bash
video-pack generate-images --project ./my-video --provider openai --scene 3,4 --force
video-pack generate-images --project ./my-video --provider openai --from-scene 8 --resume
```

### Per-Scene Asset Structure

Run `scene-assets` after adding or generating images:

```bash
video-pack scene-assets --project ./my-video
```

Each scene gets a logical production folder:

```text
output/04_images/scenes/scene_001/
  prompt.md
  prompt.json
  scene_production.md
  manifest.json
  notes.md
  image.png
  approved.png
  variations/
  upscaled/upscaled.png
  video/clip.mp4
```

### Optional Free Stock

Stock search uses queries created by `visual-events`. Downloads are optional and off by default.

```bash
video-pack stock-assets --project ./my-video --provider mock --limit 5
video-pack stock-assets --project ./my-video --provider pexels --limit 5
video-pack stock-assets --project ./my-video --provider pixabay --limit 5
```

Use `--dry-run` to create reports without downloads. Real providers require `PEXELS_API_KEY` or `PIXABAY_API_KEY`. Files, source URLs, creator details and credit notes are written under `output/06_edit_pack/stock_assets/`.

Free access does not remove licensing responsibility. Review each asset's current source terms, model/property issues and attribution requirements before publication.

### Optional Upscaling and Scene Video

```bash
# Create a manual upscale request pack
video-pack upscale-images --project ./my-video --provider manual

# Run Magnific upscaling
video-pack upscale-images --project ./my-video --provider magnific --scale 2 --resume

# Create manual or Higgsfield handoff requests
video-pack generate-scene-videos --project ./my-video --provider manual
video-pack generate-scene-videos --project ./my-video --provider higgsfield

# Run Magnific scene-video generation
video-pack generate-scene-videos --project ./my-video --provider magnific --duration 5 --resume
```

Higgsfield is currently a request-pack handoff, not a direct REST integration. Remotion prefers a scene's `video/clip.mp4`, then its upscale, approved image, source image and finally its flat full-size image.

## Approval and Regeneration

Create or refresh the image review board:

```bash
video-pack approve-images --project ./my-video
```

Record decisions from the terminal:

```bash
video-pack approve-images --project ./my-video --scene 3 --status approved
video-pack approve-images --project ./my-video --scene 5 --status needs-regen --notes "Make the expression warmer"
video-pack approve-images --project ./my-video --approve-all
```

Regenerate only rejected scenes with a direct provider:

```bash
video-pack generate-images --project ./my-video --provider openai --scene 5 --force
video-pack scene-assets --project ./my-video
video-pack approve-images --project ./my-video
```

For an external provider, edit the prompt or use the review note in your external tool, replace the expected file, rerun `scene-assets`, and review again.

Approval state remains in `output/04_images/approvals.json`. The HTML and Markdown boards are readable views over that state. Normal packaging requires a real image or video and approval for every scene.

Thumbnail prompts are generated with the prompt pack. Prepare or generate thumbnail options with:

```bash
video-pack generate-thumbnails --project ./my-video --provider external
video-pack generate-thumbnails --project ./my-video --provider mock
video-pack generate-thumbnails --project ./my-video --provider openai
```

Review them in `output/07_publish/thumbnails/review_board.html`.

## Package and Edit

Create the final production pack after asset approval:

```bash
video-pack package --project ./my-video
```

For captions, manifests and structure before real assets are approved:

```bash
video-pack package --project ./my-video --draft
```

Draft packaging is an explicit incomplete state. It is useful for early editing, not a claim that the video is ready.

Important outputs:

```text
output/
  BOARD.html
  SESSION_HANDOFF.md
  README_NEXT_STEPS.md
  04_images/review_board.html
  05_captions/captions.srt
  05_captions/captions.vtt
  06_edit_pack/edit_manifest.csv
  06_edit_pack/overlay_text.csv
  06_edit_pack/stock_asset_queries.csv
  06_edit_pack/timelines/
  07_publish/copy_pack.md
  07_publish/upload_checklist.md
  07_publish/thumbnails/review_board.html
  08_remotion/
```

### Premiere, DaVinci Resolve and CapCut

```bash
video-pack export-timeline --project ./my-video --format all
video-pack export-timeline --project ./my-video --format premiere
video-pack export-timeline --project ./my-video --format davinci
video-pack export-timeline --project ./my-video --format fcpxml
video-pack export-timeline --project ./my-video --format capcut
```

Premiere, DaVinci and CapCut CSVs are assembly helpers containing media order, timing and scene metadata. FCPXML is the actual interchange timeline helper. CapCut does not have a stable public project interchange format supported here, so use the generated media, SRT captions, CSV and `capcut_assembly_guide.md` rather than expecting a native CapCut project file.

### Remotion Preview and Render

`package` creates a standalone Remotion project under `output/08_remotion/`. It is useful for reviewing motion, overlays and timing in a browser or rendering an MP4 without opening a desktop editor.

```bash
cd my-video/output/08_remotion
npm install
npm run dev
npm run render
```

The MP4 is written to `render/video.mp4` inside that Remotion folder. Run `video-pack remotion --project ./my-video --force` from the parent working directory whenever source assets or events change and only the Remotion project needs rebuilding.

## Resume Existing Work

Start every returning session with:

```bash
video-pack doctor --project ./my-video
video-pack status --project ./my-video
video-pack wizard --project ./my-video
```

When a coding agent is guiding the session, refresh and read the durable handoff before continuing:

```bash
video-pack board --project ./my-video
```

```text
my-video/output/SESSION_HANDOFF.md
```

The handoff records completed and pending stages, review files, provider and approval gates, durable project files and the exact next command.

Then run:

```bash
video-pack next --project ./my-video
```

Faceless fingerprints generated stages against the inputs they depend on. If the script, project settings, channel bible, style bible, character bible, evidence, continuity file or local assets change, guided commands return to the first stale dependent stage.

This is expected behavior. Existing scene folders are preserved and reported instead of being deleted. Review stale or obsolete media manually before removing it.

For interrupted API asset work:

```bash
video-pack generate-images --project ./my-video --provider openai --resume
video-pack upscale-images --project ./my-video --provider magnific --resume
video-pack generate-scene-videos --project ./my-video --provider magnific --resume
```

## Troubleshooting

### `video-pack` Is Not Recognized

Rebuild and relink from the repository:

```bash
npm run build
npm link
```

On Windows, use `npm.cmd`. As a fallback, replace `video-pack` with `node C:\path\to\faceless\dist\index.js`.

### PowerShell Blocks `npm.ps1`

Use the executable shim without changing execution policy:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd link
```

### Project Cannot Be Found or Validated

Confirm that the path points to a folder containing `project.yml`:

```bash
video-pack validate --project ./my-video
video-pack doctor --project ./my-video
```

Quote paths containing spaces. Paths inside `project.yml` are resolved relative to the project folder.

### API Key Is Missing Even Though `.env` Exists

The CLI loads `.env` from the current working directory. Run the command from the directory containing `.env`, or export the key in the current shell. Then rerun `video-pack doctor --project ...`.

Do not put quotes or trailing comments into a key value unless the provider explicitly requires them.

### `generate-images` Created Prompts but No Images

That is correct for `manual` and `external`. Open `output/04_images/full/full_prompts.md`, generate the assets elsewhere, and save them to `output/04_images/full/` using the expected names.

Use `mock`, `openai` or `magnific` when actual local image files should be created by the command.

### Packaging Says Assets Are Missing or Unapproved

Run:

```bash
video-pack scene-assets --project ./my-video
video-pack approve-images --project ./my-video
```

Open `output/04_images/review_board.html`. Every scene needs a real image or video and an `approved` status. Use `package --draft` only when an intentionally incomplete structural pack is acceptable.

### A Changed Script Made Later Work Incomplete

The freshness system has detected that downstream files no longer match their source. Run `video-pack next --project ./my-video` until the project reaches the next human checkpoint. This is a protective rebuild, not lost progress.

### Audio Duration or Transcription Fails

- confirm the configured file exists and is MP3, WAV or M4A
- quote paths with spaces
- run `audio-info` before transcription
- use the `script` provider to isolate API problems
- run `doctor` and check OpenAI account quota before using `openai`

### Provider Generation Stops Partway Through

Read the reported provider error, check key validity, quota and network access, then use `--resume`. Use `--scene` to retry a specific scene. `output/cost_estimate.json` is planning guidance, not a provider billing record.

### Stock Downloads Are Empty

Run `visual-events` first so stock queries exist. Check the provider key with `doctor`, try `--dry-run`, and inspect the reports under `output/06_edit_pack/stock_assets/`. A provider can legitimately return no suitable result for a narrow query.

### CapCut Will Not Open the Timeline CSV

The CSV is a shot-order and duration guide, not a native CapCut project. Import scene media and SRT captions, then follow `output/06_edit_pack/capcut_assembly_guide.md`.

### Remotion Does Not Start

Run `npm install` inside the generated `output/08_remotion/` folder, not the repository root. Confirm Node 20+, then run `npm run dev`. Rebuild the Remotion folder after changing production assets.

### Start with a Clean Diagnostic

These three commands answer most state questions:

```bash
video-pack doctor --project ./my-video
video-pack status --project ./my-video
video-pack board --project ./my-video
```

## Security and Privacy

### Protect Secrets

- Never commit `.env`, API keys or provider response tokens.
- Confirm secret files are ignored with `git check-ignore .env`.
- Inspect staged changes with `git diff --cached` before every push.
- Use separate, revocable provider keys with the lowest practical permissions.
- Set provider spending limits and review usage dashboards independently of this CLI.
- Rotate a key immediately if it appears in terminal history, logs, screenshots or Git history.

The repository `.gitignore` protects root `.env` variants and generated example output. It cannot automatically protect every new project folder created inside the repository. Prefer private project storage outside this public checkout, or add project-specific script, audio, evidence, media and output paths to `.gitignore`.

### Know What Leaves the Machine

| Action | Data sent externally |
| --- | --- |
| planning, manual, external and mock modes | nothing by the CLI |
| OpenAI transcription | configured audio |
| OpenAI image generation | generated scene or thumbnail prompts |
| Magnific generation/upscale/video | prompts and relevant source images |
| Pexels/Pixabay stock search | generated search queries |
| Higgsfield handoff | nothing automatically; request files stay local |
| Remotion `npm install` | normal npm package requests; project media renders locally |

The tool does not upload a finished video to social platforms. External tools used after a manual handoff have their own privacy and retention terms.

### Protect Content and People

- Treat scripts, voice recordings, evidence files and unreleased media as confidential production data.
- Obtain consent for real voices, likenesses, interview footage and personal stories.
- Fact-check claims, links, dates and generated publishing copy before release.
- Review generated images for misleading text, logos, public figures, stereotypes and continuity failures.
- Check stock and generated-media licences for the intended commercial use.
- Back up project inputs and approved originals; generated output can be rebuilt, source recordings cannot.

No `LICENSE` file is currently included in this repository. Public visibility does not by itself grant redistribution rights; add an explicit licence before distributing the code as a product or package.

## Deployment and Distribution

Faceless is a local CLI, so there is no production web server to deploy. A practical deployment means installing a pinned checkout on a creator machine or build workstation.

### Install on a Production Workstation

```bash
git clone https://github.com/paolodit/faceless.git
cd faceless
npm ci
npm run build
npm test
npm link
video-pack doctor
```

Keep creator projects and secrets outside the source checkout. Use a dedicated working folder, back it up, and pin the Git commit used for an important production.

### Install for a Team

1. Choose and record a tested commit or release tag.
2. Clone that version on each workstation.
3. Run `npm ci`, `npm run build` and `npm link` per machine.
4. Give each user their own provider keys and spending limits.
5. Share reviewed bibles and templates, not `.env` files.
6. Archive `project.yml`, `input/`, approvals and final assets with each production.

For maximum reproducibility without a global link:

```bash
node /absolute/path/to/faceless/dist/index.js wizard --project /absolute/path/to/my-video
```

### Update an Existing Installation

Commit or back up local work first, then:

```bash
git pull --ff-only
npm ci
npm run build
npm test
npm link
video-pack doctor
```

Do not run a newly updated CLI against the only copy of a live project. Duplicate or back up the project, run `status`, and verify the generated board before continuing.

### Render Deployment

Generated Remotion projects are self-contained render workspaces. Install their dependencies and render locally or on a Node-capable render machine:

```bash
cd my-video/output/08_remotion
npm install
npm run render
```

Copy the complete generated Remotion folder when moving the render to another machine because its `public/assets/` directory contains the selected media.

### Current Distribution Boundary

This repository currently assumes source installation from GitHub. It does not yet provide:

- an npm registry release
- signed Windows or macOS binaries
- Docker images
- automatic updates or migrations
- a hosted multi-user service
- CI-driven release publishing
- automatic social-platform deployment

Those are release-engineering tasks, not hidden capabilities of the current CLI.

## Included Examples

| Example | Creator type | What it demonstrates |
| --- | --- | --- |
| `examples/youtube-pop-economics-explainer` | Short Explainer | question, answer, example, additive explanation and landing |
| `examples/linkedin-ai-jargon-series-ep1` | LinkedIn POV / Vox Pop | claim mapping, quote/overlay beats, b-roll and LinkedIn copy |
| `examples/tiktok-local-film-pitch` | Narrated Visual Story | recurring world, character/place continuity, burst and story payoff |

Examples are committed as lightweight inputs. Generated media is ignored. Run `npm run demo:mock` to build the story example locally without API credits.

## Project Status

### Usable Today

- The three creator types have distinct scaffolds, structural reviews, copy framing and human checkpoints.
- `guide`, `wizard`, `next`, `status` and the browser board support first-run and resume workflows.
- Codex and Claude onboarding files provide a supported conversational front door without replacing the CLI.
- Input freshness cascades through dependent stages when scripts, bibles, settings or local assets change.
- Audio duration detection and OpenAI transcription are wired.
- Manual, external, mock, OpenAI and Magnific image paths are wired.
- Pexels and Pixabay stock downloads are optional and produce source/credit reports.
- Images have per-scene folders, approval state, regeneration controls and static review boards.
- Story continuity and LinkedIn claim-support reviews are part of their guided routes.
- Caption, publishing, thumbnail, editor assembly and Remotion outputs are generated.
- The repository has focused examples and automated TypeScript/Vitest checks.

### Honest Limits

- Script, scene and copy quality still depends on the input and human review.
- LinkedIn vox-pop support does not yet ingest, identify and cut long multi-speaker source footage.
- Story continuity checks anchors in plans and prompts, not faces, costumes or locations in generated pixels.
- Publishing copy is a draft and claim review does not independently verify sources.
- Stock selection is query driven and needs a human licensing and relevance check.
- Premiere, DaVinci and CapCut outputs are assembly helpers; only FCPXML is an interchange timeline.
- Higgsfield is a handoff pack rather than a direct API integration.
- Provider cost estimates are configurable estimates, not live billing data.

## What to Build Next

The highest-value next work should stay narrow and strengthen the three routes:

1. **Real LinkedIn footage ingest.** Accept multiple interview or presenter clips, transcribe with timestamps and speakers, propose soundbites, map b-roll, and create a reviewable rough cut. This is the biggest gap between "POV template" and genuinely useful vox-pop production.
2. **Route-specific render quality.** Give Remotion distinct edit grammars for additive explainers, speaker/quote/b-roll LinkedIn videos and continuity-led visual stories, with better audio, caption and transition controls.
3. **Visual quality assurance.** Add automated checks for missing subjects, inconsistent recurring characters, unreadable generated text, crop/safe-zone problems and media corruption before approval.
4. **Release hardening.** Add an explicit licence, CI, versioned releases, install/update tests and either an npm package or signed binaries so non-developers can install the tool without maintaining a source checkout.

Before broadening providers or adding another creator type, run one real production through each route and record time spent, paid generations, manual corrections and editor friction. Those three acceptance runs should decide the order inside the four areas above.

## Development

```bash
npm ci
npm run build
npm test
```

Useful development commands:

```bash
node dist/index.js --help
npm run demo:mock
npm run demo:status
```

The project uses TypeScript, Commander and Vitest. `dist/`, generated example output, local `.env` files and private `jack-n-jack/` content are ignored by Git.

Further reference:

- [Start with an AI coding agent](START_WITH_AI.md)
- [Quickstart](docs/QUICKSTART.md)
- [Workflow](docs/WORKFLOW.md)
- [Creator types](docs/PIPELINES.md)
- [Inputs](docs/INPUTS.md)
- [Outputs](docs/OUTPUTS.md)
- [Providers](docs/PROVIDERS.md)
- [Profiles](docs/PROFILES.md)
- [Examples](docs/EXAMPLES.md)
- [Scene production](docs/SCENE_PRODUCTION.md)
- [Costs](docs/COSTS.md)
- [ChatGPT setup prompts](docs/CHATGPT_SETUP.md)
- [macOS setup](docs/MAC_SETUP.md)
- [Walkthrough recording script](docs/WALKTHROUGH_VIDEO.md)
