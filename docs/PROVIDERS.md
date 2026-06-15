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

The OpenAI provider is scaffolded for a future adapter. v1 intentionally focuses on local manual and mock workflows.

## Future Providers

Future provider adapters can reuse the prompt records in `output/03_prompts/prompts.json` and write assets into the same preview/full folders.
