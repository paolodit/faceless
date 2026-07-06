# Providers

Provider modes decide how image assets, optional upscales and optional scene video clips are produced.

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

## external

External mode is the clearest choice when you want to generate images outside this CLI, such as with ChatGPT image generation, Codex-assisted image generation, Higgsfield, Midjourney, Leonardo, Ideogram or another tool.

It behaves like manual mode:

- outputs prompt packs
- outputs expected filenames
- does not call an API
- does not claim access to ChatGPT or Codex built-in image credits
- expects you to save finished image files back into the project

Run:

```bash
video-pack generate-images --project ./my-project --provider external
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
video-pack scene-assets --project ./my-project
video-pack approve-images --project ./my-project
video-pack package --project ./my-project
```

## mock

Mock mode creates real placeholder PNG files with scene numbers and timestamps. Use it to test editing workflow without spending generation credits.

```bash
video-pack preview --project ./my-project --provider mock --count 5
video-pack generate-images --project ./my-project --provider mock
```

## openai

OpenAI mode generates real images with the OpenAI Image API and can transcribe audio with the OpenAI Audio Transcriptions API.

It requires:

```env
OPENAI_API_KEY=
```

Copy `.env.example` to `.env`, then add your own key. Never commit your real `.env` file.

macOS / Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
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

OpenAI mode may incur API costs. See [COSTS.md](COSTS.md).

## magnific

Magnific mode can generate images directly, and Magnific is also available for optional upscaling and scene video clips.

It requires:

```env
MAGNIFIC_API_KEY=
```

`MAGNIFIC_WEBHOOK_KEY` can also be stored in `.env` for future webhook verification. The current CLI uses task polling for repeatable terminal runs.

Generate images:

```bash
video-pack generate-images --project ./my-project --provider magnific
```

Upscale existing scene images:

```bash
video-pack upscale-images --project ./my-project --provider magnific
```

Generate short scene video clips:

```bash
video-pack generate-scene-videos --project ./my-project --provider magnific --duration 5
```

Relevant `project.yml` settings:

```yaml
generation:
  scene_video_provider: "manual"
  scene_video_duration_seconds: 5
  prefer_upscaled_images_for_video: true

providers:
  magnific:
    base_url: "https://api.magnific.com"
    image_model: "flexible"
    image_resolution: "2k"
    image_engine: "automatic"
    poll_interval_seconds: 5
    poll_timeout_seconds: 900
    upscale_scale_factor: 2
    upscale_flavor: "photo"
    video_model: "kling-v2-6-pro"
    video_duration_seconds: 5
    video_generate_audio: false
```

The CLI uses Magnific's REST API and task polling. It does not require MCP for terminal runs.

## scene video providers

Scene video generation is separate from image generation:

```bash
video-pack generate-scene-videos --project ./my-project --provider manual
video-pack generate-scene-videos --project ./my-project --provider magnific --duration 5
video-pack generate-scene-videos --project ./my-project --provider higgsfield
```

- `manual` writes request packs only.
- `magnific` calls the Magnific REST API and downloads `video/clip.mp4`.
- `higgsfield` writes an MCP/CLI handoff pack for each scene. It is intentionally not treated as a direct REST integration yet.

Scene clips are written under:

```text
output/04_images/scenes/scene_001/video/
```

Remotion prefers `video/clip.mp4` when present, then `upscaled/upscaled.png`, then `approved.png`, then `image.png`, then the legacy flat image in `output/04_images/full/`.

## free stock assets

Stock assets are separate from image generation. They use the stock search queries created by:

```bash
video-pack visual-events --project ./my-project
```

Then you can run:

```bash
video-pack stock-assets --project ./my-project --provider mock --limit 5
video-pack stock-assets --project ./my-project --provider pexels --limit 5
video-pack stock-assets --project ./my-project --provider pixabay --limit 5
```

`mock` creates local placeholder PNGs. Pexels and Pixabay call their public APIs and write downloaded files plus credits to:

```text
output/06_edit_pack/stock_assets/
```

Required `.env` keys:

```env
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

See [MAC_SETUP.md](MAC_SETUP.md) for macOS-specific setup notes.

Stock downloads are optional and off by default. To make `video-pack package` attempt stock downloads automatically:

```yaml
stock_assets:
  enabled: true
  provider: "pexels"
  media_type: "photo"
```

Always review the downloaded file, source URL, creator and current license/credit rules before publishing.

## Text in Images

Text is not banned.

It is reasonable when it is naturally part of the scene: a handwritten notebook title, sign, prop label, comic poster, title card or fake newspaper headline.

Avoid relying on generated images for tiny captions, dense paragraphs or important factual text that must be perfectly readable. Add exact overlays later in CapCut, Premiere, DaVinci or your editor.
