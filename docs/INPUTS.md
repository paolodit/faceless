# Inputs

## project.yml

`project.yml` is the main configuration file. It declares the project name, output profile, aspect ratio, input files, output folder, generation settings and cost assumptions.

```yaml
project_name: "dopamine-tax"
profile: "tiktok"
aspect_ratio: "9:16"

input:
  audio_file: ""
  script_file: "./input/script.txt"
  style_bible: "./input/style-bible.yml"
  character_bible: "./input/characters.yml"

output:
  folder: "./output"
```

## script.txt

Plain text narration. The MVP uses this text as the transcript and estimates timings from word count.

## style-bible.yml

Defines the visual style, composition rules and prompt rules used when generating image prompts.

Required areas:

- `style_name`
- `visual_style`
- `composition_rules`
- `prompt_rules`

## characters.yml

Defines reusable characters and prompt anchors. At least one character is required.

## Audio File

Audio is optional for v1. If you have a voiceover, set `input.audio_file` to a `.mp3`, `.wav` or `.m4a` path. The MVP does not require real transcription to prepare a pack.
