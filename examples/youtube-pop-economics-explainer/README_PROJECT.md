# YouTube Pop Economics Short Explainer

Demonstrates a sub-minute 9:16 explainer with one question, concrete examples and abstract ideas turned into visual metaphors.

Profile: `youtube-shorts`
Creator type: `Short Explainer` (`narrated-explainer`)

Pacing coverage:

- `steady` for core explanation scenes
- `additive` for section or concept-building beats
- `landing` for the final recap

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

Review `output/00_analysis/route_review.html` first. Look for a clean question-answer-example-takeaway chain, mobile-readable frames and visual metaphors that explain queue behaviour without dense on-image text.
