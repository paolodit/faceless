# Outputs

## Analysis

`output/00_analysis/content_analysis.md` checks hook timing, pacing, scene density and platform fit.

`output/00_analysis/content_analysis.json` contains the same data in structured form.

## Transcript

`output/01_transcript/transcript.txt` contains the script text used as the transcript.

`output/01_transcript/timestamps.json` contains estimated scene timings.

## Scenes

`output/02_scenes/scenes.json` is the structured scene list.

`output/02_scenes/scenes.md` is the human-editable review version.

`output/02_scenes/visual_events.json` contains the structured visual event plan grouped by scene.

`output/02_scenes/visual_events.md` is the readable visual event review sheet for pacing, overlays, stock cutaways and transitions.

The scene pacing labels are:

- `burst`
- `steady`
- `additive`
- `landing`

## Prompts

`output/03_prompts/prompts.json` contains prompt objects with filenames and provider metadata.

`output/03_prompts/prompts.md` is a readable prompt pack for manual image tools.

`output/03_prompts/thumbnail_prompts.md` is a readable thumbnail prompt pack.

## Images

`output/04_images/preview/` contains preview prompts or placeholder images.

`output/04_images/full/` contains the full prompt pack or generated mock images.

`output/04_images/approvals.json`

`output/04_images/approval_sheet.md`

`output/04_images/review_board.md`

`output/04_images/review_board.html`

The review board shows scene number, transcript, visual goal, prompt, expected filename, image preview if present, approval status, notes and useful approve/regenerate commands.

## Captions

`output/05_captions/captions.srt`

`output/05_captions/captions.vtt`

## Edit Pack

`output/06_edit_pack/edit_manifest.csv`

`output/06_edit_pack/edit_manifest.json`

`output/06_edit_pack/visual_events.csv`

`output/06_edit_pack/visual_events.json`

`output/06_edit_pack/overlay_text.csv`

`output/06_edit_pack/stock_asset_queries.csv`

`output/06_edit_pack/stock_credits.md`

`output/06_edit_pack/asset_manifest.json`

`output/06_edit_pack/stock_assets/`

`output/06_edit_pack/storyboard.md`

`output/06_edit_pack/shot_list.md`

`output/06_edit_pack/asset_checklist.md`

`output/06_edit_pack/timelines/premiere_timeline.csv`

`output/06_edit_pack/timelines/davinci_timeline.csv`

`output/06_edit_pack/timelines/capcut_timeline.csv`

`output/06_edit_pack/timelines/timeline.fcpxml`

`output/06_edit_pack/capcut_assembly_guide.md`

The edit manifest maps scenes, timestamps, transcripts, visual goals and image filenames.

The visual event files plan image holds, additive on-screen text, transitions and optional stock asset searches.

`stock_assets/` contains automatic stock downloads only when you run `video-pack stock-assets` or set `stock_assets.enabled: true`.

The CapCut files are an assembly pack: import media, import SRT captions and use the CSV for scene order and durations. They are not an unofficial CapCut draft-file writer.

## Publishing

`output/07_publish/upload_checklist.md`

`output/07_publish/metadata_brief.md`

`output/07_publish/copy_pack.md`

`output/07_publish/thumbnails/`

Thumbnail review boards are created in:

```text
output/07_publish/thumbnails/review_board.md
output/07_publish/thumbnails/review_board.html
```

These files support manual platform upload and metadata review.

## Reports

`output/cost_estimate.json` is created by `plan`.

`output/run_report.md` and `output/README_NEXT_STEPS.md` are created by `package`.
