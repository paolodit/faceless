# Creative Setup with ChatGPT or a Coding Agent

Faceless no longer expects beginners to manufacture YAML by copying long setup prompts. Start with one sentence:

> I want to create a video with https://github.com/paolodit/faceless - install it and guide me from my idea or script to a reviewed production.

A coding agent with repository and terminal access can operate the full workflow. An ordinary chat can still help draft a script, but it cannot create durable project files or run the production engine.

## Minimum Input

Only a spoken script is required to reach the route proposal. A rough idea is also enough if you want the agent to help shape the script. Final narration is then required before timed production and editor-ready packaging; conventional `input/voice.*` filenames are detected automatically.

Useful optional material:

- a voiceover file, when the route reaches timed production
- visual references or brand assets
- recurring character or location rules
- LinkedIn claim sources and declared opinions
- channel tone, CTA, title, and thumbnail preferences

The agent should ask for these only when the relevant stage arrives.

## Script Brief

For a faster writing pass, provide:

- the one thing the viewer should understand or feel
- target platform and approximate duration
- desired tone
- any phrases, facts, or jokes that must survive
- whether the ending should land, loop, or ask for action

Short Explainers work best with a question/claim, direct answer, mechanism/example, and takeaway. LinkedIn videos need a defensible point of view and support. Narrated Visual Stories need a clear world, character, escalation, and payoff.

## Bibles

The starter `style-bible.yml`, `characters.yml`, and `channel-bible.yml` files are valid. The agent should update them after the route and art direction are understood, not ask the creator to fill every field up front.

Character entries may include `scene_cues` and `scene_exclude_cues`. These stop Short Explainer characters from appearing in unrelated scenes. For example, a bee character can be tied to `bee`, `bees`, and `flower logistics`, while pre-bee history remains character-free.

## Art Direction Decision

Before full generation, the agent should propose three directions tailored to the script and recommend one. Good options differ in production logic, not merely colour palette: documentary realism, editorial collage, and recurring stylised animation are meaningfully different routes.

After selection, review three representative style frames before generating the full set.

## Returning

Say:

> Continue my Faceless production in `productions/<project-name>`, read its session handoff, and guide me from the first unfinished or stale decision.

Use `output/NEXT.html` for the immediate action and `output/PROGRESS.html` for the honest deliverable state.
