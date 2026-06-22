# Examples

This folder contains lightweight example projects for `faceless video-pack`.

The main examples are:

- `tiktok-local-film-pitch` - fast 9:16 local comedy / story pitch
- `youtube-pop-economics-explainer` - slower 16:9 explainer
- `linkedin-ai-jargon-series-ep1` - 60 second AI terminology explainer with overlay planning

Pacing coverage:

- `tiktok-local-film-pitch` - `burst`, `additive`, `landing`
- `youtube-pop-economics-explainer` - `steady`, `additive`, `landing`
- `linkedin-ai-jargon-series-ep1` - `burst`, `additive`, `landing`, plus stock search worksheets

Run one from the repo root:

```bash
npm run build
node dist/index.js validate --project ./examples/tiktok-local-film-pitch
node dist/index.js analyze --project ./examples/tiktok-local-film-pitch
node dist/index.js plan --project ./examples/tiktok-local-film-pitch
node dist/index.js prepare --project ./examples/tiktok-local-film-pitch
node dist/index.js visual-events --project ./examples/tiktok-local-film-pitch
node dist/index.js prompts --project ./examples/tiktok-local-film-pitch
node dist/index.js preview --project ./examples/tiktok-local-film-pitch --count 5 --provider mock
node dist/index.js guide --project ./examples/tiktok-local-film-pitch
```

Generated output is ignored by Git, so you can rerun examples without committing heavy assets.
