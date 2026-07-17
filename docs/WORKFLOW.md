# Agent-Guided Workflow

The conversational agent is the creator surface. `video-pack` is the deterministic engine that stores durable project state, rebuilds stale stages, and enforces asset and approval gates.

## Core Route

```text
script
-> route review
-> scene/cost proposal
-> final narration
-> timed scenes
-> claim or continuity checkpoint when required
-> script-specific art direction
-> visual events and prompts
-> representative style frames
-> primary visuals
-> primary approval
-> supplemental raster cutaways
-> supplemental approval
-> editor pack
-> optional rendered draft
```

The agent should show one decision at a time. It should recommend a route when the script clearly fits, propose three tailored art directions before external generation, and generate representative hook/middle/payoff frames before committing to a full set.

## Stable Artifacts

| Need | Artifact |
| --- | --- |
| Return or answer "what now?" | `output/NEXT.html` |
| Make the current human choice | `output/DECISION.html` |
| Audit visual/audio/render truth | `output/PROGRESS.html` |
| Inspect the whole production | `output/BOARD.html` |
| Resume in a new agent session | `output/SESSION_HANDOFF.md` |

Image boards embed their previews as data URIs. They remain readable in local browsers and hosted agent surfaces that cannot serve sibling files.

## Route Checkpoints

### Short Explainer

Check that the script has a clear question or claim, a direct answer, one mechanism/example, and a takeaway or intentional loop. Recurring characters are included only when the narration cues them.

### LinkedIn Point-of-View / Vox Pop

`input/evidence.yml` and `output/00_analysis/claim_review.md` distinguish sources, first-hand experience, internal data, and editorial opinion. The mapping is a review aid, not independent fact-checking.

### Narrated Visual Story

`input/continuity.yml` and `output/02_scenes/continuity_review.html` track recurring characters, locations, world rules, and prompt anchors. Pixel-level continuity still requires image review.

## Art Direction Gate

Before full prompts or external generation, the agent should inspect the scene production board for generic or contradictory output. It should correct impossible subjects, repeated presenter reactions, continuity drift, and characters appearing outside their approved beats.

The creator then chooses among three script-specific visual directions. The recommendation should be decisive and tied to the script's tone, production cost, repeatability, and edit behaviour.

## Asset Classes

Faceless separates:

- **primary visuals** - one stable base frame or clip per scene
- **supplemental raster visuals** - planned cutaways that require a real image/video asset
- **code-rendered events** - overlay text and transitions rendered by Remotion or reproduced in an editor

Primary images use `output/04_images/review_board.html`. Supplemental raster events use `output/04_images/events/review_board.html`. Both require explicit human approval before a normal editor package.

## Safe Automation

`video-pack next --project <path>` runs the first safe incomplete local step. It pauses for external/paid providers and approval actions. `--allow-paid` and `--approve-all` should only be supplied after explicit confirmation.

Changing the script or a bible marks dependent outputs stale. `next` rebuilds from the first affected stage. Existing scene media is preserved and reported instead of deleted automatically.

## Packaging Truth

Normal packaging requires final narration, approved primary visuals, and approved supplemental raster visuals. `package --draft` creates an assembly draft with explicit gaps.

Packaging creates captions, edit manifests, timeline helpers, publishing drafts, and a Remotion project. It does not automatically render an MP4 or publish anything.

`output/PROGRESS.html` names the current deliverable and reports narration, timings, raster coverage, code events, editor files, and MP4 separately.

## Remote Handoff

Hosted agent workspaces may be isolated from the creator's computer. At handoff:

```bash
video-pack board --project productions/my-video
video-pack export-project --project productions/my-video --force
```

Return the ZIP, not a folder link. The archive excludes environment files, keys, Git metadata, dependencies, caches, and previous exports.

## Human Gates

Explicit confirmation is required before external provider use, paid actions, transcription uploads, primary or supplemental approval, authored-input replacement, destructive media cleanup, final-claim acceptance, rendering through paid services, and publishing.
