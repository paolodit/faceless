# Providers

## manual

Manual mode does not call an image API. It writes prompt packs that can be copied into another visual tool.

Preview output:

```text
output/04_images/preview/preview_prompts.md
output/04_images/preview/preview_prompts.json
```

Full output:

```text
output/04_images/full/full_prompts.md
output/04_images/full/full_prompts.json
```

## mock

Mock mode creates real placeholder PNG files with scene numbers and timestamps. Use it to test editing workflow without spending generation credits.

## openai

OpenAI mode generates real images with the OpenAI Image API and can transcribe audio with the OpenAI Audio Transcriptions API.

Set an API key:

```powershell
$env:OPENAI_API_KEY="sk-..."
```

Generate images:

```bash
video-pack generate-images --project ./my-project --provider openai
```

Transcribe audio:

```bash
video-pack transcribe --project ./my-project --provider openai
```

Relevant `project.yml` settings:

```yaml
providers:
  openai:
    image_model: "gpt-image-1"
    image_size: "auto"
    image_quality: "medium"
    image_output_format: "png"
    transcription_model: "whisper-1"
```

## Future Providers

Future provider adapters can reuse the prompt records in `output/03_prompts/prompts.json` and write assets into the same preview/full folders.
