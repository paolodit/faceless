# Workflow

1. Write or paste a narrated script into `input/script.txt`.
2. Optionally record a voiceover and update `project.yml`.
3. Edit `input/style-bible.yml` to define the visual style.
4. Edit `input/characters.yml` to define recurring characters.
5. Run validation.

```bash
video-pack validate --project ./my-project
```

6. Analyze hook strength, pacing and platform fit.

```bash
video-pack analyze --project ./my-project
```

Review:

```text
output/00_analysis/content_analysis.md
```

7. Plan the run and review estimated scenes and costs.

```bash
video-pack plan --project ./my-project
```

8. Prepare transcript, timestamps and scenes.

```bash
video-pack prepare --project ./my-project
```

9. Review and edit `output/02_scenes/scenes.md` or `scenes.json`.
10. Generate image prompts.

```bash
video-pack prompts --project ./my-project
```

11. Preview the first few prompts or mock images.

```bash
video-pack preview --project ./my-project --count 5
```

12. Generate the full manual prompt pack or mock image set.

```bash
video-pack generate-images --project ./my-project
```

13. Package captions, manifest, publishing checklists and next-step guidance.

```bash
video-pack package --project ./my-project
```

14. Import the voiceover, images, captions and manifest into CapCut, Premiere Pro, DaVinci Resolve or another editor.

15. Use `output/07_publish/upload_checklist.md` and `metadata_brief.md` before uploading manually.

At any point, check progress with:

```bash
video-pack status --project ./my-project
```
