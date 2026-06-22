# YouTube Pop Economics Explainer

Demonstrates a slower 16:9 explainer with abstract ideas turned into visual metaphors.

Profile: `youtube-long`

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
video-pack prepare --project .
video-pack visual-events --project .
video-pack prompts --project .
video-pack preview --project . --count 5 --provider mock
video-pack guide --project .
```

Look for calm pacing, wide readable frames, optional stock cutaway ideas and visual metaphors that explain the queue behaviour without needing dense on-image text.
