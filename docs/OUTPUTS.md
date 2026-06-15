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

## Prompts

`output/03_prompts/prompts.json` contains prompt objects with filenames and provider metadata.

`output/03_prompts/prompts.md` is a readable prompt pack for manual image tools.

## Images

`output/04_images/preview/` contains preview prompts or placeholder images.

`output/04_images/full/` contains the full prompt pack or generated mock images.

## Captions

`output/05_captions/captions.srt`

`output/05_captions/captions.vtt`

## Edit Pack

`output/06_edit_pack/edit_manifest.csv`

`output/06_edit_pack/edit_manifest.json`

`output/06_edit_pack/storyboard.md`

`output/06_edit_pack/shot_list.md`

`output/06_edit_pack/asset_checklist.md`

The edit manifest maps scenes, timestamps, transcripts, visual goals and image filenames.

## Publishing

`output/07_publish/upload_checklist.md`

`output/07_publish/metadata_brief.md`

These files support manual platform upload and metadata review.

## Reports

`output/cost_estimate.json` is created by `plan`.

`output/run_report.md` and `output/README_NEXT_STEPS.md` are created by `package`.
