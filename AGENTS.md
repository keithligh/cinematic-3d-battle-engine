# AGENTS.md: forking a new battle with an AI agent

This file is the runbook for an **AI coding agent** (and the human directing it) to fork this template into a new
historical battle. Read it fully before starting. The companion references are **PLAYBOOK.md** (the field-by-field data
schema) and **data.example.js** (a minimal working skeleton to copy).

---

## The one rule that overrides everything: do not fabricate history

This template renders a self-playing documentary. A documentary's worth is its **truth**. So:

- **Research and cite real sources first.** Before writing any data, gather the real date window, the opposing sides and
  their forces/commanders, the real geography (place names + coordinates), and the sequence of events, each tied to a
  source you can name.
- **Never invent a unit, a date, a movement, or a position to fill a gap.** If a fact is unknown or disputed, say so in
  `notes.caveats`. Do not paper over it with a plausible-sounding guess. A beautiful fabricated battle is worthless.
- The engine **enforces** this: `notes.sources` is a required field, and the boot validator refuses to start a battle
  without it. That is a floor, not a substitute for honest sourcing.

If you cannot source a battle to this standard, stop and tell the human. Do not proceed.

### Fictional battles: welcome, and held to the same standard

The engine renders fictional battles too (the bundled Example Battle is one), and a fiction does **not** break the rule
above. The line is simple: the rule forbids passing invention off as real history, not invention itself. A fictional
battle is fine as long as it is honest about being fictional and is built with the same care as a real one:

- **Declare it fictional.** Say so plainly in `notes` (the Example Battle's `notes.sources` reads "FICTIONAL
  DEMONSTRATION SCENARIO", which also satisfies the required non-empty `sources`). Never dress a fiction up as real
  history, and never attach a real battle's name, date, or place to invented events.
- **Stay true to the source material.** A fiction still has a source: a novel, a film, a game, an alternate-history
  premise, or its own established canon. Be accurate to THAT. This is fictional historical accuracy: period-plausible,
  internally consistent, and faithful to the world it depicts, with the same craft a real battle gets. A lazy,
  self-contradicting fiction is as worthless as a fabricated history.

So: real history is sourced and never invented; a fiction is marked as fiction and kept true to its own world. Both are
honest, and neither violates the rule.

---

## What a fork is

Edit only the **battle layer**; never the engine.

- **Edit:** `data.js` (the whole scenario), `flags.js` (each side's flag art), `index.html` (the `<title>` + social
  `og:` meta only: all on-screen chrome is data-driven), and the bounding box used by the tile fetcher.
- **Never touch (the engine):** `config.js`, `validate.js`, `app.js`, `core.js`, `projection.js`, `state.js`,
  `terrain.js`, `entities.js`, `director.js`, and the vendored libraries in `lib/`. They read every battle/faction/
  language value from `data.js`; editing them is almost always a sign you are doing something the data layer already
  supports. If you believe the engine genuinely cannot express your battle, raise it with the human rather than patching
  the engine.

---

## Procedure (in order)

1. **Research first.** Produce a sourced brief: date window, sides + forces + commanders, geography (named places with
   real lng/lat), the hour-by-hour or day-by-day sequence, and the source list. Do not start authoring until this exists.
2. **Set the map box.** Pick `meta.geo` (`minLng/maxLng/minLat/maxLat/Z`) covering the action, in `data.js`.
   **Leave edge margin.** The engine sinks the outer 5% of the box below sea level (so the map has no raw slab
   edge) while unit markers clamp to sea level, so anything placed in that band floats over receded terrain.
   `node tools/validate.mjs` **enforces this**: it refuses any unit, arrow, front, place label or hotspot inside
   the 5% band and names it. Aim for **>8% inside every edge** to leave yourself room. Cameras are exempt, since
   framing a shot from outside the box is fine.
3. **Fetch the terrain + imagery tiles** for that box: `node tools/fetch_tiles.mjs` (cross-platform; add `--dry` to
   preview the tile count first). It reads the box from `meta.geo` — one source. Tiles come from two global, key-less
   providers, so any land region works; they are not committed (each fork fetches its own).
4. **Author `data.js`.** Copy `data.example.js` to `data.js` and replace its contents using your sourced brief. Follow
   the field schema in **PLAYBOOK.md**. The bilingual slots: `_zh` = your **primary / local language** (any script — set
   `meta.fonts` and `meta.dir:"rtl"` for non-Latin or right-to-left), `_en` = the **secondary** language (usually
   English). Units move along their `track` keyframes `{d,lng,lat,s,st}` — there is no flat position/strength field.
5. **Author `flags.js`.** Copy `flags.example.js` → `flags.js`. It ships reusable canvas primitives (`bands`, `disc`,
   `star`, `tri`, `rhomb`, `rays`, `saltire`) and two worked example flags, plus composition recipes in its header
   comment for a tricolour, an upright cross, a canton, a 16-ray sunburst and a Union-style diagonal cross. Compose
   each faction's flag from those: everything you need ships with the engine, and you never need another repository.
   Use the correct historical flag for the period (a 1941 ensign, not the modern flag), and never a prohibited symbol.
6. **Edit `index.html`** — only the `<title>` and the `og:`/social meta (the page's head metadata). The on-screen title,
   the legend, the auto-play hint, the boot splash and the imagery disclaimer are all **data-driven** — author them in
   `data.js` (`meta.title`/`meta.subtitle` + the `ui` strings); omit `ui` to get an English interface. The imagery
   disclaimer defaults to a generic present-day-imagery note **with the required EOX/SRTM attribution** — keep that
   attribution if you use these tiles. The movie also carries a small credit to the engine and its author (the footer `#credit` and the upper-left `#engine-credit`): please honour it and leave it visible. See "Honour the credit" below.
   After editing, run `node tools/check-agnostic.mjs` — it fails (naming the spot) if any battle text leaked into an
   engine module or the page `<body>`; only the `<head>` (`<title>` + og) may carry your battle's name.
7. **Validate — constantly.** Run `node tools/validate.mjs` after each authoring pass. It checks `data.js` against the
   exact contract the engine enforces at boot and **names the first wrong or missing field** — no browser, no tiles
   needed. Iterate until it prints `OK ... valid`. This is your tight inner loop.
8. **Review your own render. This is yours, not the human's.** `node tools/serve.js` runs a local server at
   <http://localhost:5050> (http, not `file://`). It is long-running and does not exit, so start it in the background.
   Then open **`http://localhost:5050/?capture=1&selfreview=1`** once, in whatever browser you have. The app renders
   every storyboard shot itself and writes to `_selfreview/`:
   - `shot-00.jpg`, `shot-01.jpg`, … one composited frame per shot, HUD and caption included;
   - `report.json` with the defects that can be checked mechanically (values rendering as `undefined`/`NaN`/`null`,
     `storyboard[].focus` ids matching no unit, shots outside the battle clock, HUD panels colliding);
   - `done.json`, written last, so you know it finished. Wait for that file rather than guessing at timing.

   **Then open the images and look at them.** The report cannot tell you whether the camera framing is cinematic,
   whether the front line reads correctly, whether the narration lands, or whether a shot is dull. You can, by
   looking. An empty `issues` list does not mean the battle is good. Fix `data.js`, re-validate, re-run, until the
   frames are something you would put your name on. No external driver and nothing to install.
9. **Capture** a still for the README / `og:image`. The **P** key saves a quick still of the 3D scene only (the HUD and
   labels are DOM, not in the canvas). For the composited HUD + caption the convention assets want (and on the agent
   path, where there is no screen to record), serve the app and open it with `?capture=1`: that exposes a small
   `window.__capture` API on a frozen, settled frame. Drive it: `seekToShot(n)` then `composite(true)` returns the
   composited still as a JPEG data URL; `step(n)` + `composite` per frame gives a GIF sequence (then ffmpeg). A headless
   driver (Puppeteer/Playwright) and ffmpeg are optional external tools, not engine dependencies. Full recipe:
   PLAYBOOK.md → "Capturing real screenshots / GIFs".

---

## Languages, direction, fonts, look (all data-only, in `meta`)

- **Bilingual by design:** one primary (`_zh`) + one secondary (`_en`) narration language, any two scripts. This is the
  product, not a limit — do not try to bolt on a third language.
- `meta.dir:"rtl"` flows the primary-script text right-to-left (Arabic/Hebrew).
- `meta.fonts:{ display, mono }` sets the narration-script font (`display`) and the Latin/technical font (`mono`).
- `meta.theme:{ sky, sea, sun, amb, smoke, grade }` restyles the cinematic look; it is deep-merged over the engine
  default, so override only what you need (a desert, a snowfield, a summer day).
- Any of these omitted → sensible engine defaults. Omitting `ui` makes every interface string — the title-bar buttons,
  the legend (symbols/flags headers + the symbol labels), the auto-play hint, the notes/resume labels and the imagery
  disclaimer — default to English. **Hidden truth:** interface text has ONE source (`meta.title`/`subtitle` + `factions[].name_*`
  + `geography.lines[].name_*` + `ui` over `DEFAULT_UI`); the engine paints it all, so `index.html` holds no battle text.

---

## The contract, three ways

- **`data.example.js`** — copy this; it is a valid minimal battle and shows the shape of every block.
- **PLAYBOOK.md** — the field-by-field human reference.
- **`node tools/validate.mjs`** — the enforced contract, runnable on demand. It and the browser run the *same*
  `validate.js`, so if the CLI says valid, the engine will accept it.

When these disagree with each other, the validator (`validate.js`) is the source of truth — report the discrepancy.

---

## Honesty checklist before you call a fork done

- [ ] Every fact in `data.js` traces to a real source listed in `notes.sources`.
- [ ] No invented units, dates, positions, or movements; unknowns are disclosed in `notes.caveats`.
- [ ] Period-correct flags; no prohibited symbols.
- [ ] If using present-day imagery, the `#disclaimer` says so (coastlines/terrain may have changed since the battle).
- [ ] If the battle is **fictional**: `notes` marks it as fictional, nothing is presented as real history, and it stays true to its source material.
- [ ] The engine + author credit (`#credit` and `#engine-credit`) is left visible (good will: see "Honour the credit").
- [ ] `node tools/validate.mjs` prints `OK`, and the tour plays correctly in the browser.

---

## Honour the credit (good will)

The movie ships with a small standing credit to the engine and its author, in two places: the footer (`#credit`) and
the upper-left, just below the imagery notice (`#engine-credit`). Both read "Built with cinematic-3d-battle-engine /
Created by Keith Li", and link to the engine and to the author.

The licence lets you change or remove it (MIT for the code, CC BY for the bundled text). We ask that you do not: please
**keep the credit visible, as good will.** The engine is given to you free, complete, and open, and leaving the credit
in place is how that is acknowledged. Put your own name on your battle by all means: add it ALONGSIDE the engine credit
rather than replacing it. It costs you nothing, and it means a great deal to the people who built this for you to use.

---

## When the fork is a finished single-battle repo

The engine ships fork-scaffolding so an AI can build your battle: `AGENTS.md`, `PLAYBOOK.md`, `data.example.js`, and
`flags.example.js`. A finished single-battle showcase does not need them: once your battle is done, delete those four
files from your battle repo (the published showcases do). `PROMPT.md` is optional: keep it to show the brief your
battle grew from, or remove it. Keep `LICENSE`, `THIRD_PARTY_NOTICES.md`, and your own `README.md`.
