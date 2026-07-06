# Production Pipelines

Pipelines describe the kind of production you are making. Profiles describe the output format.

```yaml
pipeline: "faceless-explainer"
profile: "tiktok"
aspect_ratio: "9:16"
```

List available pipelines:

```bash
video-pack pipelines
```

## Presets

| Pipeline | Best for | Asset bias |
| --- | --- | --- |
| `faceless-explainer` | short educational videos, opinion explainers, script-first creator formats | one readable generated image per scene, with optional overlays and stock cutaways |
| `animated-explainer` | visual metaphors, simple concepts, recurring characters | consistent characters and simple backgrounds that animate cleanly |
| `documentary-montage` | essay shorts, case studies, local stories, context videos | generated keyframes plus local references, screenshots and stock cutaways |
| `screen-demo` | software explainers, product walkthroughs, tutorials | local screenshots and recordings first, generated assets second |

## Proposal Checkpoint

Run this after `plan`:

```bash
video-pack proposal --project ./my-project
```

It writes:

```text
output/00_proposal/proposal.md
output/00_proposal/proposal.json
output/decision_log.md
```

Use the proposal to confirm the pipeline, provider path, rough cost and human checkpoints before generating a large asset set.

## Project Board

Run this any time:

```bash
video-pack board --project ./my-project
```

It writes:

```text
output/BOARD.html
output/BOARD.md
```

`video-pack next` refreshes the board automatically after each successful step.
