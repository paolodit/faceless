# Workflow

`faceless video-pack` works best when you treat it as the production engine, not the place where the idea starts.

The practical flow is:

```text
idea -> script -> voiceover -> style bible -> character bible -> validate -> analyze -> plan -> prepare -> prompts -> preview -> generate -> package -> edit manually -> publish manually
```

## 1. Create the Creative Inputs

Start in ChatGPT, Claude, your notes app or your normal writing process.

Prepare:

- `input/script.txt`
- `input/style-bible.yml`
- `input/characters.yml`
- optional `input/channel-bible.yml`
- optional `input/voice.mp3`, `input/voice.wav` or `input/voice.m4a`

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

## 5. Create and Preview Prompts

```bash
video-pack prompts --project ./my-project
video-pack preview --project ./my-project --count 5 --provider mock
```

Review:

```text
output/03_prompts/prompts.md
output/04_images/preview/
```

## 6. Generate the Full Image Set

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

For placeholder testing:

```bash
video-pack generate-images --project ./my-project --provider mock
```

For OpenAI:

```bash
video-pack generate-images --project ./my-project --provider openai
```

## 7. Package the Edit Pack

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

## 8. Do Not Get Lost

At any point, run:

```bash
video-pack status --project ./my-project
video-pack guide --project ./my-project
```

The guide shows what is complete, what is missing, the recommended next command, why it matters, and what to do after that.
