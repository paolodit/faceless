# TikTok Local Film Pitch

Demonstrates a fast 9:16 local comedy/story pitch.

Profile: `tiktok`
Pipeline: `faceless-explainer`

Pacing coverage:

- `burst` for the opening hook
- `additive` for fast short-form escalation
- `landing` for the final payoff beat

Edit first:

```text
input/script.txt
input/style-bible.yml
input/characters.yml
input/channel-bible.yml
```

Recommended sequence:

```bash
video-pack validate --project .
video-pack analyze --project .
video-pack plan --project .
video-pack proposal --project .
video-pack prepare --project .
video-pack visual-events --project .
video-pack prompts --project .
video-pack preview --project . --count 5 --provider mock
video-pack board --project .
video-pack guide --project .
```

Look for clear vertical framing, instantly readable jokes, useful stock cutaway suggestions and consistent gull characters in preview output.
