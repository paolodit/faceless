# Examples

This folder contains lightweight example projects for `faceless video-pack`.

The main examples are:

- `tiktok-local-film-pitch` - narrated visual story
- `youtube-pop-economics-explainer` - narrated explainer
- `linkedin-ai-jargon-series-ep1` - LinkedIn POV / vox-pop explainer

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
node dist/index.js generate-images --project ./examples/tiktok-local-film-pitch --provider mock --force
node dist/index.js approve-images --project ./examples/tiktok-local-film-pitch --approve-all
node dist/index.js package --project ./examples/tiktok-local-film-pitch --force
node dist/index.js wizard --project ./examples/tiktok-local-film-pitch
```

Generated output is ignored by Git, so you can rerun examples without committing heavy assets.

Packaging also creates `output/08_remotion/`, an optional Remotion draft that can be previewed in the browser or rendered to MP4 after running `npm install` inside that folder.
