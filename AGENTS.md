# Faceless Agent Guide

Faceless is designed to be operated through a capable coding agent. The CLI is the production engine behind the conversation; it is not the creator's primary interface.

This repository supports two jobs:

1. Create or resume a private video production.
2. Maintain or extend Faceless source code.

A request to make a video means job 1 unless the user explicitly asks to change Faceless itself.

## Production Guide Mode

### First Response

Read this file and `START_WITH_AI.md`. If the idea or script clearly fits a route, recommend that route and proceed; do not make the creator choose from a menu merely because three routes exist.

- `explainer`: one useful idea with a question, answer, example, and takeaway
- `linkedin`: a professional point of view, claim-led explainer, or interview-style video
- `story`: a narrated character-led or place-led visual story

Keep private work under `productions/<project-name>/` unless the user names another private folder. Never commit production scripts, audio, evidence, generated media, archives, `.env` files, or provider keys.

Install and build when needed. Use `npm link` when available; otherwise operate `node dist/index.js` from the repository. If npm's default cache is unavailable in a remote workspace, use a writable temporary cache and continue.

### Conversation Contract

At every checkpoint:

1. Tell the creator what has just happened in plain language.
2. Show exactly one primary artifact for the current decision.
3. Recommend one choice and explain why in one or two sentences.
4. Offer no more than two meaningful alternatives.
5. Ask one clear question when human confirmation is required.
6. After the decision, execute the safe local work and refresh the artifacts.

Do not make creators copy routine CLI commands. Commands may be shown as secondary operation detail, but the user-facing next step must be a human action such as "review these three style frames" or "approve or regenerate scene 5."

Use these stable surfaces:

- `output/NEXT.html` for resuming or answering "what now?"
- `output/DECISION.html` for the current human choice
- `output/PROGRESS.html` for truthful production coverage
- the relevant review board for scene, image, supporting-cutaway, continuity, claim, or thumbnail review
- `output/BOARD.html` only when the creator needs the complete production view

All generated HTML boards with images must be self-contained. Never repair a board manually with a one-off script; report a Faceless source defect if embedding fails.

### Opinionated Art Direction

Before final prompts or external generation:

1. Read the full script, route review, scene plan, style bible, character bible, and channel bible.
2. Correct generic, repetitive, historically impossible, or narration-contradicting visual goals.
3. Propose three script-specific art directions, recommend one, and pause for the creator's choice.
4. Update the bibles and scene assignments only after that choice.
5. Generate three representative style frames first: hook, middle mechanism, and payoff.

Do not automatically place a recurring character in every Short Explainer scene. Characters belong only where the narration or approved art direction calls for them. LinkedIn presenter continuity and Narrated Visual Story continuity may intentionally persist across scenes.

### Workflow

For a new private production, initialize the inferred route and then use `next` as the behind-the-scenes state machine:

```bash
video-pack init productions/<project-name> --type <explainer|linkedin|story>
video-pack doctor --project productions/<project-name>
video-pack next --project productions/<project-name>
```

Run `board` after every human decision or asset change. Approval commands refresh it automatically, but a final refresh is still cheap and explicit.

For a new production, the spoken script is enough to reach the route proposal. Ask for final narration after that proposal and before timed scenes; real delivery should drive cuts, captions, and visual beats.

Primary scene visuals and supplemental raster cutaways are different asset classes. A package is editor-ready only when narration is present and both required visual classes are present and approved. Text overlays and transitions may be code-rendered, but planned raster events may never disappear behind a green package stage.

### Human Gates

Always pause for explicit confirmation before:

- using OpenAI, Magnific, stock APIs, or any provider that may incur cost or send content externally
- using a power agent's built-in image generation with the creator's prompts or references
- transcribing audio with an external provider
- marking primary or supplemental images approved, including any `--approve-all` action
- replacing creator-authored input files
- deleting or moving source media, stale folders, or approved assets
- treating publishing copy or claims as fact-checked
- rendering when it will trigger a paid remote service
- publishing or uploading anything

`manual`, `external`, and `mock` are safe workflow routes. A mock file is a local placeholder, never a finished creative asset.

### Truthful Completion

Never use "complete" without naming the deliverable. Report one of these:

- **Production plan** - scenes and edit intent, no reviewed visual set
- **Visual review** - some or all visual assets exist and need decisions
- **Assembly draft** - editor files exist with known visual gaps
- **Editor-ready pack** - narration, required primary and supplemental raster approvals, and assembly files exist
- **Rendered draft** - an MP4 exists and still needs human playback review

Always state separately:

- primary visuals present / approved
- supplemental raster visuals present / approved
- code-rendered overlays and transitions
- narration present or absent
- timings measured from audio or estimated from script
- editor pack present or absent
- rendered MP4 present or absent
- publishing performed or not performed

### Remote Workspace Handoff

ChatGPT Work, Claude Co-work, and other hosted agents may not share the creator's desktop filesystem. Say this early when relevant. Do not offer folder links as downloads.

At a meaningful handoff point, run:

```bash
video-pack board --project productions/<project-name>
video-pack export-project --project productions/<project-name> --force
```

Return the single ZIP and summarize `output/SESSION_HANDOFF.md`. Do not claim the remote production is present on the user's local machine.

### Resume Protocol

At the start of a returning session:

```bash
video-pack doctor --project productions/<project-name>
video-pack status --project productions/<project-name>
video-pack board --project productions/<project-name>
```

Read `output/SESSION_HANDOFF.md`, show `output/NEXT.html`, respect stale-stage detection, and preserve stale scene folders unless the user explicitly approves cleanup.

## Source Maintenance Mode

When the user explicitly asks to modify Faceless:

- follow existing TypeScript, Commander, and Vitest patterns
- keep the three creator routes focused
- preserve human review and paid-provider gates
- update agent guidance and generated artifacts when command behaviour changes
- run `npm run build` and `npm test`
- do not use private content under `productions/` or `jack-n-jack/` as public fixtures

## Completion Standard

A production session ends only when the creator knows what changed, what needs review, whether any external or paid action occurred, the next human action, the relevant artifact, and where the portable handoff lives when the workspace is remote.

A source change ends only when code, tests, examples, and public guidance agree.
