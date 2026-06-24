# The Prompt

An example starting point: the brief you hand an AI coding agent (for example Claude Code) to fork this engine into
your own battle. It is the *starting point*, not a one-shot recipe. A finished documentary takes many passes beyond
it: researching and cross-checking the history, getting the dates and flags right, writing the narration, tuning the
visuals, and fixing bugs. Plan to iterate, and verify the history yourself.

```
Fork the cinematic-3d-battle-engine to build a self-playing, TV-documentary-style 3D production of [your battle].
Read PLAYBOOK.md and AGENTS.md first. Edit only the battle layer (data.js, flags.js, the index.html title and social
meta, and the map bounding box); never touch the engine modules.

Research first and cite real sources, with no fabrication: the date window, the opposing sides with their forces and
commanders, the real geography (named places with lng/lat), and the sequence of events. If the battle is fictional
rather than historical, mark it as fictional in notes and keep it true to its source material (fictional historical
accuracy); never present invention as real history.

Set the map bounding box (meta.geo) over the action, then fetch the terrain and imagery tiles
(node tools/fetch_tiles.mjs). Author data.js: the forces, each unit's dated movement track, the front lines, the
storyboard of camera shots, the bilingual narration, and each side's period-correct flag (the real flag for the year,
never a prohibited symbol). Direct the storyboard cinematically, like a TV documentary: keep the camera close
enough that the audience can read the action on the ground, never a far-out view of the whole map. Validate with
node tools/validate.mjs after every pass; it exits and names the first wrong field. Keep the present-day-imagery disclaimer. Leave the engine and author credit visible (the footer
and upper-left credits) as good will; add your own name alongside it rather than removing it.
```

For reference, the [Battle of Hong Kong](https://github.com/keithligh/battle-of-hong-kong-1941) documentary was built
from a single from-scratch brief, shipped there as
[PROMPT.md](https://github.com/keithligh/battle-of-hong-kong-1941/blob/main/PROMPT.md), before this engine existed. It
shows the ambition and the level of spec that produces a result like the showcases. With the engine you fork instead,
which is why the brief above is shorter.
