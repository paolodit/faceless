# Examples

The public examples are designed to show different creator use cases.

## Pacing Coverage

The examples are deliberately small, but together they cover the visual event pacing modes:

| Example | Pacing modes shown | Also demonstrates |
| --- | --- | --- |
| `tiktok-local-film-pitch` | `burst`, `additive`, `landing` | short-form hook and payoff rhythm |
| `youtube-pop-economics-explainer` | `steady`, `additive`, `landing` | calmer long-form section pacing |
| `linkedin-ai-jargon-series-ep1` | `burst`, `additive`, `landing` | term overlays and stock asset worksheets |

## TikTok Local Film Pitch

Folder:

```text
examples/tiktok-local-film-pitch/
```

Demonstrates:

- fast 9:16 local comedy / story pitch
- original hand-drawn family-adventure animation
- recurring local characters and background groups
- external/manual image workflow
- burst hook, additive escalation and landing payoff pacing

Run:

```bash
node dist/index.js validate --project ./examples/tiktok-local-film-pitch
node dist/index.js analyze --project ./examples/tiktok-local-film-pitch
node dist/index.js plan --project ./examples/tiktok-local-film-pitch
node dist/index.js prepare --project ./examples/tiktok-local-film-pitch
node dist/index.js visual-events --project ./examples/tiktok-local-film-pitch
node dist/index.js prompts --project ./examples/tiktok-local-film-pitch
node dist/index.js preview --project ./examples/tiktok-local-film-pitch --count 5 --provider mock
node dist/index.js guide --project ./examples/tiktok-local-film-pitch
```

## YouTube Pop Economics Explainer

Folder:

```text
examples/youtube-pop-economics-explainer/
```

Demonstrates:

- longer 16:9 explainer
- slower scene timing
- abstract ideas turned into visual metaphors
- a calmer educational voice
- steady explainer pacing with additive section beats

## LinkedIn AI Jargon Series EP1

Folder:

```text
examples/linkedin-ai-jargon-series-ep1/
```

Demonstrates:

- 60 second LinkedIn-style AI terminology explainer
- burst hook, additive term reveals and landing recap
- overlay text planning before prompt generation
- stock search worksheets for simple business cutaways

## What to Edit First

For any example, start with:

```text
input/script.txt
input/style-bible.yml
input/characters.yml
input/channel-bible.yml
```

Then run:

```bash
video-pack guide --project ./examples/tiktok-local-film-pitch
```

Generated output folders are intentionally ignored by Git. Keep examples lightweight and do not commit generated images.
