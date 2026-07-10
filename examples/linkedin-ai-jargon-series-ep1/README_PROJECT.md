# LinkedIn AI Jargon Series EP1

This example demonstrates a 60 second LinkedIn-style AI terminology video.

Creator type: `linkedin-vox-pop`

## What It Shows

- burst hook pacing
- additive term-by-term overlay planning
- landing recap
- stock cutaway search worksheets
- vox-pop and presenter-led scene grammar
- a reusable channel bible for a series

This is the best example for seeing `overlay_text.csv`, `stock_asset_queries.csv` and optional `stock-assets` output working together.

## Run It

```bash
node dist/index.js validate --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js analyze --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js plan --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js proposal --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js prepare --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js visual-events --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js prompts --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js preview --project ./examples/linkedin-ai-jargon-series-ep1 --count 5 --provider mock
node dist/index.js board --project ./examples/linkedin-ai-jargon-series-ep1
node dist/index.js wizard --project ./examples/linkedin-ai-jargon-series-ep1
```

Optional stock placeholder check:

```bash
node dist/index.js stock-assets --project ./examples/linkedin-ai-jargon-series-ep1 --provider mock --limit 5
```

Review:

- `output/02_scenes/visual_events.md`
- `output/02_scenes/scene_production.md`
- `output/00_proposal/proposal.md`
- `output/BOARD.html`
- `output/06_edit_pack/overlay_text.csv`
- `output/06_edit_pack/stock_asset_queries.csv`
- `output/06_edit_pack/stock_assets/`
- `output/03_prompts/prompts.md`
