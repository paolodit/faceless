# Creator Types

Creator type describes the creative job. Profile describes the output format.

```yaml
pipeline: "linkedin-vox-pop"
profile: "linkedin-video"
aspect_ratio: "4:5"
```

Create a project with a friendly alias:

```bash
video-pack init my-video --type explainer
video-pack init my-linkedin-video --type linkedin
video-pack init my-story --type story
```

| Project value | Creator promise | Best for |
| --- | --- | --- |
| `narrated-explainer` | Explain one useful idea with a clear hook, visual metaphors and a concrete takeaway. | Shorts, TikTok, YouTube explainers |
| `linkedin-vox-pop` | Make a credible point of view with claim/support review, speaker, quote-card, b-roll and conversation-led post copy. | LinkedIn explainers, expert viewpoints, vox pops |
| `narrated-visual-story` | Tell a place-led or character-led story with visual continuity and a payoff. | local stories, illustrated essays, story pitches |

`video-pack pipelines` lists these routes in the terminal.

## What Is Not a Creator Type

Stock downloading, Remotion rendering, Magnific upscaling and scene-video generation are optional production lanes. They enhance a route when needed; they are not a reason to choose a project type.

Legacy values such as `faceless-explainer` still load so existing projects do not break, but new projects should use the three creator types above.

## Proposal Checkpoint

Run after `plan`:

```bash
video-pack proposal --project ./my-project
```

It writes the selected creator route, provider readiness, cost watch and human review checkpoints to `output/00_proposal/proposal.md`.
