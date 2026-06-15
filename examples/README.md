# Examples

This folder contains ready-to-run demo projects.

## Dopamine Tax

`examples/dopamine-tax` is a safe local demo. It uses:

- script-based transcript preparation
- mock image generation
- mock thumbnail generation
- no API key
- no paid generation

Run it from the repo root:

```bash
npm run build
npm run demo:mock
```

Check progress later:

```bash
npm run demo:status
```

Generated output is ignored by Git, so you can rerun the demo without dirtying the repo.
