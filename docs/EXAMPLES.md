# Examples

The public examples map directly to the three creator types.

| Example | Creator type | Main lesson |
| --- | --- | --- |
| `tiktok-local-film-pitch` | narrated visual story | character/place continuity and a short-form story payoff |
| `youtube-pop-economics-explainer` | narrated explainer | calm long-form pacing, visual metaphors and additive explanation |
| `linkedin-ai-jargon-series-ep1` | LinkedIn POV / vox pop | clear term explanation, overlay readability and stock-cutaway planning |

All examples keep generated media out of Git. You can safely create local mock outputs:

```bash
npm run build
node dist/index.js validate --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js wizard --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js next --project ./examples/linkedin-ai-jargon-series-ep1
```

For an end-to-end no-cost run:

```bash
npm run demo:mock
```

Mock previews test layout and handoff. They do not replace review of real art direction.
