# Scene Production

Scene production is the grammar for how each scene should be built.

It sits between timed scenes and image prompts:

```text
prepare -> visual-events -> prompts
```

`video-pack visual-events` writes:

```text
output/02_scenes/scene_production.html
output/02_scenes/scene_production.md
output/02_scenes/scene_production.json
```

Open `scene_production.html` first. It is a guided browser board with layout counts, review route, per-scene base frame, background, middle ground, foreground, layers, expected assets and editor notes.

## Layout Modes

| Layout | Use it for | What it means |
| --- | --- | --- |
| `fast-cut` | hooks, quick jokes, pattern interrupts | several simple visual beats inside one scene |
| `additive-slide` | explainers, lists, reveals | one base frame that gains overlays or foreground elements over time |
| `voxpop` | interview-style or street-opinion scenes | consistent background, middle-ground subject and foreground prop/caption |
| `montage` | documentary, essay, proof or context beats | anchor image plus cutaways, references or stock assets |
| `single-image` | calm holds or simple narration | one strong image carries the scene |

## Config

In `project.yml`:

```yaml
scene_production:
  default_layout: "auto"
  continuity: "auto"
  additive_layers: 3
  voxpop_background: "consistent interview-style background"
  voxpop_middle_ground: "recurring presenter or interview subject"
  voxpop_foreground: "microphone, caption card, phone, or reaction prop"
  screen_demo_surface: "screen recording or screenshot from input/assets/"
```

`default_layout: "auto"` chooses from pacing and creator type:

- `burst` pacing usually becomes `fast-cut`
- `additive` pacing usually becomes `additive-slide`
- LinkedIn POV / vox-pop projects use `voxpop` for steady evidence and speaker beats
- narrated visual stories use segment continuity to keep characters and places consistent
- interview-style language can become `voxpop`

You can force a whole project:

```yaml
scene_production:
  default_layout: "voxpop"
```

## Additive Slide Scenes

An additive scene is not several unrelated images. It is one base visual that gets built on.

The generated plan describes:

- the base frame
- background, middle ground and foreground
- layer order
- overlay timing
- expected assets

Scene folders also receive:

```text
output/04_images/scenes/scene_001/scene_production.md
output/04_images/scenes/scene_001/scene_production.json
```

## Voxpop Scenes

For voxpop scenes, keep the continuity group stable:

- same background type
- same camera height
- same middle-ground subject scale
- foreground props/captions can change

Use `voxpop_background`, `voxpop_middle_ground` and `voxpop_foreground` to define the house style.

`screen-demo` layout remains available for legacy project files, but it is not one of the three first-run creator routes.
