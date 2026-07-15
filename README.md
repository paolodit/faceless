# faceless video-pack

`faceless video-pack` turns a narrated script into a reviewed, editable video production pack. It is for creators who want a strong production system without surrendering creative control to a one-click publisher.

It creates scene plans, visual-event notes, image prompts, review boards, captions, edit assembly files, publishing copy and an optional Remotion draft. You still choose the final images, edit, and publish.

## Three Creator Types

| Creator type | Use it for | What the workflow emphasises |
| --- | --- | --- |
| `explainer` | Short explainers for TikTok, Reels and YouTube Shorts | one question, a clear answer, concrete example, visual metaphors and a memorable takeaway |
| `linkedin` | LinkedIn POV, vox pops and professional explainers | claim/support review, speaker/quote-card moments, readable overlays, b-roll and post copy |
| `story` | narrated visual stories and character-led local pitches | recurring characters or places, visual continuity, sequential scenes and optional motion |

`profile` is output format, not a creator type: TikTok, YouTube Shorts, YouTube long-form, or LinkedIn video.

## Start Here

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run build
npm link

video-pack init my-video --type explainer
```

Choose another route when it fits better:

```bash
video-pack init my-linkedin-video --type linkedin
video-pack init my-story --type story
```

Replace `my-video/input/script.txt`, then use the two creator-facing commands:

```bash
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

`wizard` explains the route and what to review. `next` runs the next safe step and refreshes `output/BOARD.html`.

Every route begins with `output/00_analysis/route_review.html`: an honest structural scorecard with script evidence, rewrite priorities, a suggested beat map and human review questions. When a script, bible or project setting changes, `next`, `wizard`, `status` and the board roll dependent stages back to the first stale output instead of treating an old pack as complete.

For a no-cost complete run of the public demo:

```bash
npm run demo:mock
```

## The Honest Workflow

```text
script and optional voiceover
-> route-specific script review
-> scene plan
-> no-cost layout preview
-> real scene assets
-> approval
-> edit assembly pack
-> edit and publish
```

The mock preview checks framing, aspect ratio, scene count and the review flow. It is not a claim that the final visual style is good.

For an external image tool, `generate-images --provider external` creates a prompt pack only. Create the images in your tool of choice, save them using the expected filenames in `output/04_images/full/`, then return to `video-pack next`.

Approval and normal packaging only unlock when every scene has a real image or video asset. If you need captions and structure before artwork is ready, make that explicit:

```bash
video-pack package --project ./my-video --draft
```

## Creator Inputs

Every project begins with:

```text
input/script.txt
input/style-bible.yml
input/characters.yml
input/channel-bible.yml
input/assets/
```

LinkedIn projects also include `input/evidence.yml`: source, first-hand, internal-data or editorial-opinion cards for factual-looking statements. After `prepare`, run `video-pack claims --project ./my-linkedin-video`; unresolved support warnings are copied into the publishing pack.

Story projects also include `input/continuity.yml`: one shared world anchor, visual constants, and explicit scene mappings for recurring characters and places. After `prepare`, run `video-pack continuity --project ./my-story`; it checks the plan and prompt coverage before you generate assets. The image review board remains the final judgement of the actual generated art.

Voiceover is optional, but recommended when the edit must match spoken timing. Set `input.audio_file` in `project.yml` to an `.mp3`, `.wav` or `.m4a` file. The tool reads local duration metadata and can use OpenAI transcription when configured.

Use the copyable prompts in [ChatGPT setup](docs/CHATGPT_SETUP.md) to create better scripts, style bibles, character bibles and channel bibles.

## Image Routes

`manual` and `external` create prompt packs only. `mock` makes local placeholders for testing. `openai` and `magnific` make paid API calls when their keys are configured.

```bash
video-pack preview --project ./my-video --provider mock --count 5
video-pack generate-images --project ./my-video --provider external
```

After creating external images, save them into:

```text
output/04_images/full/
```

Then approve them from the review board:

```bash
video-pack scene-assets --project ./my-video
video-pack approve-images --project ./my-video
video-pack package --project ./my-video
```

Each logical scene folder keeps its prompt, source image, approved alias, variations, optional upscale, optional clip and notes together:

```text
output/04_images/scenes/scene_001/
```

## Editing and Publishing

`package` creates:

- SRT and VTT captions
- scene and visual-event manifests
- overlay text and stock search plans
- title, description and post-copy drafts
- thumbnail prompts and review boards
- an edit assembly pack for CapCut, Premiere or DaVinci
- a valid FCPXML timeline helper
- an optional Remotion browser-preview/render project

The CapCut, Premiere and DaVinci CSVs are reliable assembly helpers, not native editor project files. CapCut has no stable public timeline interchange format here.

For a browser draft or direct MP4 render, open the generated Remotion folder:

```bash
cd output/08_remotion
npm install
npm run dev
npm run render
```

## Optional Production Lanes

These are deliberately optional rather than part of the first-run route:

```bash
# Free stock placeholders or downloaded provider assets
video-pack stock-assets --project ./my-video --provider mock --limit 5
video-pack stock-assets --project ./my-video --provider pexels --limit 5
video-pack stock-assets --project ./my-video --provider pixabay --limit 5

# Upscale selected scene images
video-pack upscale-images --project ./my-video --provider manual
video-pack upscale-images --project ./my-video --provider magnific

# Short video clips for selected story beats
video-pack generate-scene-videos --project ./my-video --provider manual
video-pack generate-scene-videos --project ./my-video --provider magnific --duration 5

# Experimental handoff pack, not a direct Higgsfield API integration
video-pack generate-scene-videos --project ./my-video --provider higgsfield
```

Real stock downloads require `PEXELS_API_KEY` or `PIXABAY_API_KEY`; always check final licence and credit requirements. Magnific requires `MAGNIFIC_API_KEY` and may incur costs.

## Included Examples

| Example | Creator type | Shows |
| --- | --- | --- |
| `examples/tiktok-local-film-pitch` | narrated visual story | local story pitch, explicit world/character/place review, burst to landing pacing |
| `examples/youtube-pop-economics-explainer` | Short Explainer | sub-minute 9:16 question-answer-example structure, visual metaphors and additive sections |
| `examples/linkedin-ai-jargon-series-ep1` | LinkedIn POV / vox pop | professional term explainer, claim/support mapping, quote/overlay beats and stock worksheets |

Examples are intentionally input-only so the repository does not carry heavy generated media. Run them with `mock` to explore the output safely.

## Setup

Copy `.env.example` to `.env` and add only keys you want to use:

```text
OPENAI_API_KEY=
MAGNIFIC_API_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Run a non-secret setup check:

```bash
video-pack doctor --project ./my-video
```

For platform-specific setup, see [macOS setup](docs/MAC_SETUP.md). Windows PowerShell users who cannot run `npm` because of execution policy can use `npm.cmd` or run the project from Command Prompt.

## Commands You Actually Need

Most creators only need:

```bash
video-pack init my-video --type explainer
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

Use `status` for a detailed diagnostic and `board` to refresh the local browser dashboard. The remaining commands are available when you want a specific advanced step.

## Documentation

- [Quickstart](docs/QUICKSTART.md)
- [Workflow](docs/WORKFLOW.md)
- [Creator types](docs/PIPELINES.md)
- [Inputs](docs/INPUTS.md)
- [Outputs](docs/OUTPUTS.md)
- [Providers](docs/PROVIDERS.md)
- [Examples](docs/EXAMPLES.md)
- [Scene production](docs/SCENE_PRODUCTION.md)
- [Costs](docs/COSTS.md)
- [ChatGPT setup](docs/CHATGPT_SETUP.md)
- [macOS setup](docs/MAC_SETUP.md)
- [Walkthrough recording script](docs/WALKTHROUGH_VIDEO.md)

## Development

```bash
npm install
npm run build
npm test
```
