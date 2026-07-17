<p align="center">
  <img src="docs/assets/faceless-logo-mark-650.png" alt="Faceless" width="180">
</p>

<h1 align="center">Faceless</h1>

<p align="center"><strong>Agent-guided production for narrated videos.</strong><br>Go from an idea or script to reviewed visuals, a truthful editor pack, and an optional rendered draft.</p>

<p align="center">
  <a href="START_WITH_AI.md">Start with an AI agent</a> |
  <a href="examples/bees-pollination-explainer/README_PROJECT.md">See the acceptance demo</a> |
  <a href="docs/WORKFLOW.md">Understand the workflow</a>
</p>

## Start in One Sentence

Paste this into **Codex, ChatGPT Work, Claude Code, Claude Co-work**, or another coding agent with repository and terminal access:

> I want to create a video with https://github.com/paolodit/faceless - install it and guide me from my idea or script to a reviewed production.

That is the recommended interface. You do not need to learn the command set first.

The agent handles installation, chooses a sensible route, keeps the production private, makes creative recommendations, runs the local production engine, and stops whenever your judgment or permission is required.

## Three Focused Formats

| Format | Best for | Opinionated structure |
| --- | --- | --- |
| **Short Explainer** | TikTok, Reels, Shorts, concise social video | question, direct answer, mechanism/example, takeaway or loop |
| **LinkedIn Point-of-View / Vox Pop** | expert takes, professional explainers, claim-led or interview-style video | claim, support, tension, practical implication, defensible post copy |
| **Narrated Visual Story** | character-led stories, local film pitches, illustrated essays | world, character, escalation, payoff, continuity review |

Faceless is intentionally narrow. It is not a generic "make any content" framework.

## How It Feels

```text
idea or script
  -> route and script review
  -> final narration
  -> timed scenes
  -> one art-direction decision
  -> three representative style frames
  -> primary scenes + supporting cutaways
  -> human visual approval
  -> editor pack
  -> optional Remotion render
```

At each checkpoint the agent should show one relevant artifact, make one recommendation, and ask one clear question. Routine commands stay behind the conversation.

## Production Artifacts

Every project gets stable, local surfaces that work in normal browsers and power-agent previews:

| Artifact | Use it for |
| --- | --- |
| `output/NEXT.html` | one clear action when starting or returning |
| `output/DECISION.html` | the current human choice and recommended route |
| `output/PROGRESS.html` | honest visual, audio, editor-pack, and render coverage |
| `output/BOARD.html` | the complete scene-level production home |
| `output/04_images/review_board.html` | primary image approval and regeneration notes |
| `output/04_images/events/review_board.html` | supplemental raster cutaway review |
| `output/SESSION_HANDOFF.md` | durable state for the next agent session |

Image previews are embedded inside the HTML. They do not depend on a local web server or neighbouring files being served, which keeps them visible across Codex, Claude, and hosted Work surfaces.

## Truthful Deliverables

Faceless never treats "expected filenames exist" as "the video is finished." It reports a named deliverable:

- **Production plan** - scenes and edit intent exist
- **Visual review** - visuals exist and need human decisions
- **Assembly draft** - editor files exist with known gaps
- **Editor-ready pack** - narration, required primary and supplemental raster assets, approvals, and assembly files are present
- **Rendered draft** - an MP4 exists and still needs full human playback review

The progress board reports primary visuals, supplemental cutaways, code-rendered overlays, transitions, narration, editor files, and rendered MP4 separately.

## What It Produces

- route-specific script, hook, pacing, claim, and continuity reviews
- local audio-duration detection and optional real transcription
- timed scenes with `burst`, `steady`, `additive`, and `landing` pacing
- script-specific image and thumbnail prompts
- logical per-scene and per-event asset folders
- primary and supplemental image approval state
- optional OpenAI or Magnific image generation
- optional Pexels or Pixabay stock sourcing with credit reports
- optional Magnific upscaling and video generation
- Higgsfield handoff packs for external video generation
- SRT and VTT captions
- Premiere, DaVinci Resolve, CapCut, and FCPXML assembly helpers
- title, description, LinkedIn post, and upload-checklist drafts
- an optional Remotion project that can preview or render an MP4
- one portable ZIP for remote-agent or editor handoff

Faceless does not silently spend provider credits, approve creative work, fact-check every claim, publish content, or call a mock file finished.

## Resume Without Relearning

Open the same workspace and say:

> Continue my Faceless production in `productions/<project-name>`, read its session handoff, and guide me from the first unfinished or stale decision.

The agent reads durable files instead of relying on chat memory. Script or bible edits automatically invalidate the affected downstream stages while preserving existing media for review.

## Remote Agent Workspaces

Hosted Work surfaces may be separate from your desktop filesystem. Faceless makes that explicit and produces a single handoff archive:

```bash
video-pack export-project --project productions/<project-name> --force
```

The ZIP includes the private production state and media but excludes environment files, common credential/key files, Git metadata, dependencies, caches, and older exports. Review any private archive before sharing it. A folder link is not presented as a download.

## Providers and Cost

Planning, prompts, boards, approvals, mock assets, packaging, timelines, and portable exports run locally without an API key.

| Need | Routes |
| --- | --- |
| Narration | your own recording, ElevenLabs or another voice tool |
| Transcription | local script or OpenAI transcription |
| Primary/cutaway images | agent image generation, external/manual, OpenAI API, Magnific API |
| Free stock | optional Pexels or Pixabay API |
| Upscaling | manual or Magnific |
| Scene video | manual, Magnific, or Higgsfield handoff |
| Final assembly | CapCut, Premiere, DaVinci Resolve, FCPXML, or Remotion |

Provider pricing and free allowances change. ElevenLabs has offered a limited free monthly plan that can be enough for a short voiceover; check the current allowance before relying on it for a series. Faceless asks for confirmation before external or potentially paid actions.

See [Providers](docs/PROVIDERS.md) and [Cost controls](docs/COSTS.md).

<details>
<summary><strong>Manual installation</strong></summary>

Requirements: Node.js 20 or newer, npm, Git, and a terminal.

```bash
git clone https://github.com/paolodit/faceless.git
cd faceless
npm ci
npm run build
npm link
video-pack doctor
```

On Windows PowerShell, use `npm.cmd` if the machine blocks `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd link
```

If global linking is unavailable, replace `video-pack` with `node dist/index.js`. macOS setup notes are in [docs/MAC_SETUP.md](docs/MAC_SETUP.md).

</details>

<details>
<summary><strong>Environment configuration</strong></summary>

No `.env` file is required for the local/manual workflow. Create one only for providers you explicitly intend to call:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=
MAGNIFIC_API_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

`.env` is Git-ignored, omitted from portable exports, and should never be pasted into a prompt or committed.

</details>

<details>
<summary><strong>Direct CLI operation</strong></summary>

The CLI remains useful for automation and debugging:

```bash
video-pack init productions/my-video --type explainer
video-pack doctor --project productions/my-video
video-pack next --project productions/my-video
video-pack board --project productions/my-video
```

`next` runs only the next safe local step. Paid generation and human approval remain gated. See [Quick start](docs/QUICKSTART.md), [Workflow](docs/WORKFLOW.md), [Inputs](docs/INPUTS.md), and [Outputs](docs/OUTPUTS.md).

</details>

<details>
<summary><strong>Troubleshooting</strong></summary>

| Symptom | First move |
| --- | --- |
| `video-pack` not found | run `npm link`, or use `node dist/index.js` |
| PowerShell blocks npm | use `npm.cmd` |
| npm cache is read-only in a hosted workspace | point npm at a writable temporary cache |
| images exist but boards are blank | refresh with `video-pack board`; current HTML embeds images directly |
| project appears complete but no MP4 exists | check `output/PROGRESS.html`; an editor-ready pack includes narration and approved assets, but is not a rendered draft |
| Work output is missing on the desktop | hosted and local workspaces are separate; create `export-project` ZIP |
| a script/bible edit made outputs stale | let the agent continue; `next` rebuilds from the first affected stage |

Detailed platform notes: [Windows/macOS quick start](docs/QUICKSTART.md) and [macOS setup](docs/MAC_SETUP.md).

</details>

<details>
<summary><strong>Security and deployment</strong></summary>

Faceless is local and file-based. It has no required server, database, account system, telemetry service, or automatic social publishing. "Deployment" normally means cloning the repository onto a trusted workstation or agent workspace, installing dependencies, and keeping private productions under the Git-ignored `productions/` folder.

Review any generated ZIP before sharing: it intentionally contains the creator's production inputs and media. Provider keys and `.env` files are excluded. Generated publishing copy and claim mappings remain drafts until a human checks them.

</details>

## Examples

- [Bees and Pollination](examples/bees-pollination-explainer/README_PROJECT.md) - canonical Short Explainer acceptance case from a real ChatGPT Work trial
- [AI Jargon Series](examples/linkedin-ai-jargon-series-ep1/README_PROJECT.md) - LinkedIn POV / Vox Pop
- [Local Film Pitch](examples/tiktok-local-film-pitch/README_PROJECT.md) - Narrated Visual Story
- [Pop Economics](examples/youtube-pop-economics-explainer/README_PROJECT.md) - concise editorial explainer

Examples contain inputs and configuration, not generated media or provider credentials.

## Documentation

| Guide | Purpose |
| --- | --- |
| [Start with AI](START_WITH_AI.md) | one-sentence onboarding and return prompt |
| [Quick start](docs/QUICKSTART.md) | manual install and first private project |
| [Workflow](docs/WORKFLOW.md) | stages, human gates, and resume behaviour |
| [Inputs](docs/INPUTS.md) | scripts, bibles, evidence, continuity, assets, config |
| [Outputs](docs/OUTPUTS.md) | boards, assets, captions, timelines, Remotion, exports |
| [Providers](docs/PROVIDERS.md) | image, stock, transcription, upscale, and video routes |
| [Scene production](docs/SCENE_PRODUCTION.md) | layouts, layers, pacing, and visual events |
| [macOS setup](docs/MAC_SETUP.md) | platform-specific commands and editor notes |

## Development

```bash
npm ci
npm run build
npm test
```

The test suite covers validation, stale-state recovery, route reviews, visual-event planning, primary and supplemental approval gates, self-contained boards, timelines, Remotion, and portable exports.

Faceless is early but operational. The product direction is deliberately opinionated: better agent guidance, better creative decisions, and honest production state before broader feature count.
