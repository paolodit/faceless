# Examples

This folder contains input-only examples for Faceless. Generated media, provider keys and private production output stay out of Git.

The main examples are:

- `tiktok-local-film-pitch` - narrated visual story
- `youtube-pop-economics-explainer` - Short Explainer, 9:16 and under a minute
- `linkedin-ai-jargon-series-ep1` - LinkedIn POV / vox-pop explainer
- `bees-pollination-explainer` - canonical Short Explainer acceptance case from a real agent-workspace trial

Pacing coverage:

- `tiktok-local-film-pitch` - `burst`, `additive`, `landing`
- `youtube-pop-economics-explainer` - `steady`, `additive`, `landing`
- `linkedin-ai-jargon-series-ep1` - `burst`, `additive`, `landing`, plus stock search worksheets
- `bees-pollination-explainer` - all four pacing modes, restrained recurring-character cues and distinct supplemental cutaways

Run one from the repo root:

```bash
npm run build
npm run demo:mock
```

Generated output is ignored by Git, so you can rerun examples without committing heavy assets.

The demo exercises primary and supplemental approval state, packaging, Remotion generation and the stable progress boards. Its mock PNGs are workflow placeholders, never finished creative assets.
