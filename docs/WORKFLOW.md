# Workflow

`faceless video-pack` works best when you treat it as the production engine, not the place where the idea starts.

If you are starting fresh, use the short route first:

```bash
npm install
npm run build
npm link
video-pack init my-video
```

Then replace `my-video/input/script.txt` and run:

```bash
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

You can leave the generated style, character and channel files alone for this first pass. They are valid starter files. The project board at `my-video/output/BOARD.html` is the thing to check whenever you wonder what exists or what comes next.

The practical flow is:

```text
idea -> script -> voiceover -> style bible -> character bible -> validate -> analyze -> plan -> proposal -> prepare -> visual-events -> prompts -> preview -> generate -> scene-assets -> optional upscale/video -> approve -> package -> board -> optional Remotion preview/render -> edit manually -> publish manually
```

## 1. Create the Creative Inputs

Start in ChatGPT, Claude, your notes app or your normal writing process.

Prepare:

- `input/script.txt`
- `input/style-bible.yml`
- `input/characters.yml`
- optional `input/channel-bible.yml`
- optional `input/voice.mp3`, `input/voice.wav` or `input/voice.m4a`
- optional local reference assets in `input/assets/`

The script and voiceover should match reasonably closely. If you ad-lib heavily while recording, update the script before running the CLI.

See [CHATGPT_SETUP.md](CHATGPT_SETUP.md) for copyable setup prompts.

## 2. Check the Project

```bash
video-pack validate --project ./my-project
```

If validation fails, fix the listed files first.

## 3. Analyze and Plan

```bash
video-pack analyze --project ./my-project
video-pack plan --project ./my-project
video-pack proposal --project ./my-project
```

Review:

```text
output/00_analysis/content_analysis.md
output/cost_estimate.json
output/00_proposal/proposal.md
```

The plan shows both base and cautious cost estimates. The proposal explains the selected production pipeline, provider readiness, cost watch and human checkpoints before asset-heavy work.

## 4. Prepare Scenes

```bash
video-pack prepare --project ./my-project
```

Review and edit:

```text
output/02_scenes/scenes.md
output/02_scenes/scenes.json
```

## 5. Plan Visual Events

```bash
video-pack visual-events --project ./my-project
```

Review:

```text
output/02_scenes/scene_production.html
output/02_scenes/scene_production.md
output/02_scenes/visual_events.md
output/06_edit_pack/overlay_text.csv
output/06_edit_pack/stock_asset_queries.csv
output/06_edit_pack/asset_manifest.json
```

This stage chooses the scene production layout, then plans image holds, text overlays, transitions and optional stock cutaway searches. Open `scene_production.html` first for a guided scene-by-scene review. It does not download stock assets or render a finished video. If you skip it, `video-pack package` creates the files automatically.

Scene production layout modes:

- `fast-cut` - quick hook or pattern-interrupt cuts
- `additive-slide` - one base frame that gains layers over time
- `voxpop` - consistent background, subject and foreground prop/caption
- `screen-demo` - screenshots or recordings are primary
- `montage` - anchor image plus references or cutaways
- `single-image` - one strong image hold

Visual events use four pacing labels:

- `burst` - fast hook or pattern interrupt
- `steady` - calm explanation or context
- `additive` - layered term, list or step reveal
- `landing` - recap, payoff or CTA

Optional free stock placeholders or downloads:

```bash
video-pack stock-assets --project ./my-project --provider mock --limit 5
video-pack stock-assets --project ./my-project --provider pexels --limit 5
video-pack stock-assets --project ./my-project --provider pixabay --limit 5
```

Use `mock` to test without API keys. Use Pexels or Pixabay only after adding the relevant key to `.env`.

## 6. Create and Preview Prompts

```bash
video-pack prompts --project ./my-project
video-pack preview --project ./my-project --count 5 --provider mock
```

Review:

```text
output/03_prompts/prompts.md
output/04_images/preview/
```

## 7. Generate the Full Image Set

For external tools:

```bash
video-pack generate-images --project ./my-project --provider external
```

Then copy prompts from:

```text
output/04_images/full/full_prompts.md
```

Generate the images externally, save them with the suggested filenames, and place them in:

```text
output/04_images/full/
```

Then create the review board and approval sheet:

```bash
video-pack scene-assets --project ./my-project
video-pack approve-images --project ./my-project
```

For placeholder testing:

```bash
video-pack generate-images --project ./my-project --provider mock
```

For OpenAI:

```bash
video-pack generate-images --project ./my-project --provider openai
```

For Magnific:

```bash
video-pack generate-images --project ./my-project --provider magnific
```

Scene assets are written to:

```text
output/04_images/scenes/
```

Each scene folder keeps the prompt, source image, approval alias, upscaled files, video clips and notes together.

## 8. Optional Upscale or Scene Video Clips

You can skip this section and go straight to approvals/package.

Prepare manual request packs:

```bash
video-pack upscale-images --project ./my-project --provider manual
video-pack generate-scene-videos --project ./my-project --provider manual
```

Run Magnific directly after setting `MAGNIFIC_API_KEY`:

```bash
video-pack upscale-images --project ./my-project --provider magnific
video-pack generate-scene-videos --project ./my-project --provider magnific --duration 5
```

Create a Higgsfield handoff pack:

```bash
video-pack generate-scene-videos --project ./my-project --provider higgsfield
```

Remotion automatically prefers scene video clips, then upscaled images, then approved/source scene images.

## 9. Package the Edit Pack

```bash
video-pack package --project ./my-project
```

Review:

```text
output/05_captions/
output/06_edit_pack/
output/07_publish/
output/08_remotion/
output/BOARD.html
output/README_NEXT_STEPS.md
```

For CapCut, review:

```text
output/06_edit_pack/timelines/capcut_timeline.csv
output/06_edit_pack/capcut_assembly_guide.md
```

For Remotion browser preview or direct MP4 rendering, review:

```text
output/08_remotion/README.md
```

Then from `output/08_remotion/`:

```bash
npm install
npm run dev
npm run render
```

You can regenerate only the Remotion project later:

```bash
video-pack remotion --project ./my-project --force
```

## 10. Do Not Get Lost

At any point, run:

```bash
video-pack doctor --project ./my-project
video-pack wizard --project ./my-project
video-pack next --project ./my-project
video-pack board --project ./my-project
video-pack status --project ./my-project
```

Use `doctor` to check setup and provider readiness without printing API key values. Use `wizard` to see the next command and route. Use `next` to run the next safe step and refresh the local board. It will pause before paid API image generation unless you pass `--allow-paid`.

Use `board` when you want a browser-friendly project dashboard. Use `status` when you want the detailed file-by-file diagnostic view.
