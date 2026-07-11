# ChatGPT Setup

Use ChatGPT or another writing assistant to create the creative input files. A beginner should not need to write YAML from scratch.

## Script Prompt

```text
I want to create a faceless narrated video.

Please help me turn this idea into a spoken script.

Target platform:
[ TikTok / YouTube Shorts / YouTube long-form / LinkedIn ]

Target length:
[ 30 seconds / 60 seconds / 3 minutes ]

Tone:
[ funny / thoughtful / educational / sharp / warm / weird / professional ]

Audience:
[ describe audience ]

Idea:
[ paste idea ]

Please ask me up to 5 useful questions first. Then write a script that sounds natural when spoken aloud.
```

## Style Bible Prompt

```text
I am creating a faceless video using a local CLI tool called faceless video-pack.

I need help creating a style-bible.yml file.

First, ask me up to 10 useful questions about the visual style, audience, tone, platform and visual references.

After I answer, generate a complete style-bible.yml file that matches this structure:

style_name:
visual_style:
  medium:
  line_quality:
  colour_palette:
  background_style:
  visual_complexity:
  emotional_tone:
composition_rules:
  aspect_ratio:
  framing:
  readability:
  subject_size:
prompt_rules:
  always_include:
  avoid:

Make the output valid YAML.

Do not include explanation inside the YAML.

Important:
Text in images is allowed when it is naturally part of the scene, such as a handwritten notebook title, sign, poster, prop label or comic object. Avoid tiny captions, dense paragraphs or important factual text that must be perfectly readable.

Here is the demo style-bible.yml:

[PASTE DEMO STYLE BIBLE HERE]

Here is my script or idea:

[PASTE SCRIPT OR IDEA HERE]
```

## Character Bible Prompt

```text
I am creating a faceless video using a local CLI tool called faceless video-pack.

I need help creating a characters.yml file.

First, read my script or idea and identify the recurring characters, presenters, mascots, symbolic figures, crowds or creatures that should appear visually.

Then ask me any useful questions needed to make those characters visually consistent.

After I answer, generate a complete characters.yml file that matches this structure:

characters:
  - name:
    role:
    appearance:
      body_type:
      clothing:
      hair:
      expression_range:
    personality:
      traits:
    prompt_anchor:

Make the output valid YAML.

The prompt_anchor field is especially important. It should be a short reusable description that helps image generators keep the character visually consistent.

Do not include explanation inside the YAML.

Here is the demo characters.yml:

[PASTE DEMO CHARACTERS FILE HERE]

Here is my script or idea:

[PASTE SCRIPT OR IDEA HERE]
```

Tip: keep the first version simple. A first project might only need one main character, one sidekick or symbolic character, and one background crowd or setting group.

## Story Continuity Prompt

Use this for narrated visual-story projects after the script and character bible are settled.

```text
I am creating a narrated visual story using a local CLI tool called faceless video-pack.

I need help creating an input/continuity.yml file.

Read my script and character bible. Identify the one shared story world, the visual rules that must not drift, recurring characters, and recurring places.

Generate valid YAML matching this exact structure:

world:
  name:
  setting_anchor:
  visual_constants:
    -
characters:
  - name:
    visual_anchor:
    scene_numbers: []
locations:
  - id:
    name:
    visual_anchor:
    scene_numbers: []

Use explicit scene_numbers for every recurring character or place. Keep every anchor short, visual and reusable in an image prompt. Do not include explanation inside the YAML.

Here is my script:

[PASTE SCRIPT HERE]

Here is my characters.yml:

[PASTE CHARACTERS FILE HERE]
```

## Channel Bible Prompt

```text
I am creating a faceless video channel using a local CLI tool called faceless video-pack.

I need help creating a channel-bible.yml file.

First, ask me up to 8 questions about the channel audience, tone, content pillars, recurring formats, publishing style and calls to action.

After I answer, generate a complete channel-bible.yml file with this structure:

channel_name:
audience:
platform_priorities:
voice:
  tone:
  point_of_view:
  pacing:
content_pillars:
recurring_formats:
publishing:
  default_cta:
  description_boilerplate:
  hashtags:
prompt_rules:
  always_include:
  avoid:
  thumbnail_rules:
  title_rules:

Make the output valid YAML.

Do not include explanation inside the YAML.

Here is my channel idea:

[PASTE CHANNEL IDEA HERE]
```

## Voiceover

You can record your own voice, hire a voiceover artist, or use an AI voice tool such as ElevenLabs or another provider.

Your own voice is usually best when the channel depends on humour, accent, personality, local references or personal authority.

As of June 2026, the [ElevenLabs pricing page](https://elevenlabs.io/pricing) lists 10k credits per month on its Free plan, described as about 10 minutes of Text to Speech UI. That is usually enough to test or produce a short voiceover, but check the current pricing page before relying on any free allowance.

Save the final voiceover as:

```text
input/voice.mp3
```

Some AI voice tools offer free credits or starter plans, but check their current pricing and usage rules.
