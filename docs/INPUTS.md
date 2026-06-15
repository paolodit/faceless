# Inputs

## project.yml

`project.yml` is the main configuration file. It declares the project name, output profile, aspect ratio, input files, output folder, generation settings, provider settings and cost assumptions.

```yaml
project_name: "my-video"
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
  image_provider: "external"
  preview_scenes: 5
  scene_duration_target_seconds: 5
  max_scene_duration_seconds: 8
  min_scene_duration_seconds: 3
  images_per_scene: 1
  words_per_minute: 150

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
  cost_multiplier: 2
```

## script.txt

Plain text narration. The script is used as the transcript when `transcription.provider` is `script`.

## style-bible.yml

Defines the visual style, composition rules and prompt rules used when generating image prompts.

Required areas:

- `style_name`
- `visual_style`
- `composition_rules`
- `prompt_rules`

Use ChatGPT to generate this from the demo file and your idea. See [CHATGPT_SETUP.md](CHATGPT_SETUP.md).

## characters.yml

Defines reusable characters and prompt anchors. At least one character is required.

The `prompt_anchor` field is important because it gives image tools a short reusable description for visual consistency.

## channel-bible.yml

Defines reusable channel-level defaults such as audience, voice, content pillars, recurring formats, publishing CTA, hashtags, thumbnail rules and title rules.

Create a reusable channel bible:

```bash
video-pack channel-bible ./bibles/my-channel.yml --name "My Channel"
```

Point multiple projects to it:

```yaml
input:
  channel_bible: "../bibles/my-channel.yml"
```

## Audio File

Audio is optional. If you have a voiceover, set `input.audio_file` to a `.mp3`, `.wav` or `.m4a` path.

Detect duration metadata:

```bash
video-pack audio-info --project ./my-project
```

Use OpenAI transcription:

```yaml
transcription:
  provider: "openai"
```

OpenAI transcription requires `OPENAI_API_KEY`.
