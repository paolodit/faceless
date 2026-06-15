# Dopamine Tax Demo

This is a ready-to-run `video-pack` demo project.

It is designed to prove the full local workflow without needing an API key:

```bash
npm run build
npm run demo:mock
```

Useful manual commands:

```bash
node ../../dist/index.js status --project .
node ../../dist/index.js prompts --project .
node ../../dist/index.js generate-images --project . --provider mock --force
node ../../dist/index.js package --project . --force
```

Edit files in `input/` to try a real script, style, character set or channel voice.
