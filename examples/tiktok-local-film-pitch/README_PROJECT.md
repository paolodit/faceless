# TikTok Local Film Pitch

Demonstrates a narrated visual story: a fast 9:16 local comedy/story pitch.

Profile: `tiktok`
Creator type: `narrated-visual-story`

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

The mock preview checks vertical framing and handoff. Review real generated images for consistent characters, location and emotional story beats before approval.
