# Workflow

`faceless video-pack` works best when you treat it as the production engine, not the place where the idea starts.

The practical flow is:

```text
idea -> script -> voiceover -> style bible -> character bible -> validate -> analyze -> plan -> prepare -> visual-events -> prompts -> preview -> generate -> package -> edit manually -> publish manually
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
```

Review:

```text
output/00_analysis/content_analysis.md
output/cost_estimate.json
```

The plan shows both base and cautious cost estimates.

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
output/02_scenes/visual_events.md
output/06_edit_pack/overlay_text.csv
output/06_edit_pack/stock_asset_queries.csv
output/06_edit_pack/asset_manifest.json
```

This stage plans image holds, text overlays, transitions and optional stock cutaway searches. It does not download stock assets or render a finished video. If you skip it, `video-pack package` creates the files automatically.

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

## 8. Package the Edit Pack

```bash
video-pack package --project ./my-project
```

Review:

```text
output/05_captions/
output/06_edit_pack/
output/07_publish/
output/README_NEXT_STEPS.md
```

For CapCut, review:

```text
output/06_edit_pack/timelines/capcut_timeline.csv
output/06_edit_pack/capcut_assembly_guide.md
```

## 9. Do Not Get Lost

At any point, run:

```bash
video-pack status --project ./my-project
video-pack guide --project ./my-project
```

The guide shows what is complete, what is missing, the recommended next command, why it matters, and what to do after that.
