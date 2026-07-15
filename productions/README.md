# Private Productions

Create private Faceless projects in this folder. Everything beside this README is ignored by the repository's `.gitignore`.

From the Faceless repository root:

```bash
video-pack init productions/my-video --type explainer
video-pack doctor --project productions/my-video
video-pack wizard --project productions/my-video
video-pack next --project productions/my-video
```

Available types are `explainer`, `linkedin` and `story`.

Do not force-add production scripts, audio, evidence, API keys, generated images or output to Git. The ignore rule is a guardrail, not a backup system. Keep source recordings and approved assets backed up separately.
