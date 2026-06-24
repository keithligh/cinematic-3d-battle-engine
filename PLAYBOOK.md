# Playbook: building a new battle from this engine

This folder is a fork of a self-playing 3D battle-documentary engine (originally the Battle of Hong Kong, 1941). After
the `EngineAgnostic` refactor the engine names **no** battle, faction, or language: every such value is read from the
battle layer. A fork is **data + flags + branding** — the engine is never edited. This is the field manual.

## What you change, and what you never touch

**Change (the battle layer):**
- `data.js` : EVERYTHING battle-specific. The top of the file is now the battle config — `meta` (map box, clock
  window, date, title), `factions` (each side's colours + `role:"attacker"/"defender"` + names + strength ceiling +
  default flag), `ui` (every string the engine renders), `intro`/`outro` (the title card + the opening/closing
  cameras), `flagLegend` — followed by the scenario (`geography`/`units`/`arrows`/`fronts`/`hotspots`/`weather`/
  `notes`/`storyboard`). This is the work. (Schema below.)
- `flags.js` : the flag each side flies. Copy `flags.example.js` → `flags.js` and compose from its primitives
  (`bands`/`disc`/`star`); the HK `flags.js` shows richer painters. The unknown-flag fallback reads each faction's
  `defaultFlag` from `factions`, so you never name a faction here.
- `index.html` : **`<title>` + `og:`/social meta only** — the page's head metadata. The on-screen title, legend rows,
  symbol/flag labels, hint, boot splash and disclaimer are **data-driven** (the engine paints them from `meta` + `ui`),
  so the page body carries **no battle text**. There is also **no faction colour** in the page: the engine injects all
  faction CSS (vars, label/legend/bar colours, the progress gradient, the favicon) from `factions` at boot.
- `tools/fetch_tiles.mjs` (cross-platform; the `.ps1` is a thin wrapper) : downloads the terrain + imagery tiles. It reads the map box from `data.js` `meta.geo` — there is **no box to set here** (single source of truth).
- Optional: your own `lib/<track>.mp3` in the `<audio>` tag (omit it and the music button auto-hides), and the `docs/`
  gallery (capture your own).

**Never touch (the engine — fully battle-agnostic):** `config.js`, `validate.js`, `app.js`, `core.js`, `projection.js`,
`state.js`, `terrain.js`, `entities.js`, `director.js`. They read every battle/faction/language value from `data.js`.
(`config.js` is a thin adapter that pulls `GEO`/`DAY`/`FAC` out of `data.js`; `validate.js` is the data contract, shared
with `tools/validate.mjs`; you do not edit either.) The rendering, the real-scale projection, the self-playing Director,
the day/night and weather all carry over.

> Forking **with an AI agent?** Read **AGENTS.md** — the step-by-step runbook (research → author → validate → serve →
> capture), the never-touch list, and the no-fabrication rule. This PLAYBOOK is the field-by-field schema it references.

## Build sequence
1. Set `meta.geo` (data.js) to your battle's map box — the ONE place the box is defined (the fetcher reads it).
2. `node tools/fetch_tiles.mjs` (cross-platform; or `pwsh tools/fetch_tiles.ps1`) downloads that box's elevation + satellite tiles into `lib/tiles/`. Add `--dry` to preview the tile count first. Global coverage, no account, no API key.
3. `node tools/serve.js` (a long-running server; if an agent runs it, background it and do not block on it), then open <http://localhost:5050>. It must be served over http, not opened as `file://`.
4. Author the battle: copy **`data.example.js`** → `data.js` and fill it in (the bulk). Then `flags.js` (the flag art). Then the `index.html` branding.
5. **Validate as you go:** `node tools/validate.mjs` checks `data.js` against the engine's contract and names the first wrong/missing field — no browser needed. Iterate until it prints `OK`, then watch the tour in the browser. Also run `node tools/check-agnostic.mjs` to confirm the engine + the page `<body>` stayed battle-agnostic (it fails, naming the spot, if hardcoded battle text leaked outside `data.js`/`flags.js`/the `<head>`).

## data.js schema
**Battle config (the new top of the file — the engine reads all of it, so it never hard-codes a battle):**
- `meta` (required) : `{ geo{minLng,maxLng,minLat,maxLat,Z}, dayMin, dayMax, year, month, lastDay, title, subtitle }`.
  Plus three **optional, data-only** blocks (engine defaults if omitted): `dir:"ltr"|"rtl"` (the primary-narration reading direction — set `"rtl"` for Arabic/Hebrew and the title/narration/caption/label text flows right); `fonts:{display,mono}` (`display`=the narration-script font, `mono`=the Latin/technical font; defaults to a broad CJK+Latin stack); `theme:{ sky{day,dayB,night,nightB,over,overB}, smoke, sea, sun{day,night}, amb{day,night}, grade{filter,vignette,grain} }` (the cinematic look — deep-merged over the engine default, so you can override just one colour). HK declares all three so it renders identically; a desert/snow/summer battle restyles via `theme` alone.
- `factions` : `{ <key>:{ glow,dim,css, name_zh,name_en, role:"attacker"|"defender", maxStrength, defaultFlag } }` (`main` optional). The engine iterates `Object.keys(factions)`; `role` drives attacker/defender behaviour (line/retreat colour, the strength bars, the progress gradient). **The `<key>` must be a valid CSS identifier** (letters/digits/`_`/`-`, no leading digit, no spaces) and not the reserved word `both`; it becomes `--fac-<key>` and `.unit.<key>`. Any number of sides.
- `ui` : every engine-rendered string — `boot{dem,imagery,terrain,music,starting}`, `err{tileLoad,tilesMissing,tilesMissingHint,tileGaps}`, `frontLine{zh,en}`, `strengthUnit`, `endLabel`, `notesCaveatsHeader`, `notesSourcesHeader`, `langToggle{both,zh,en}`, plus the HUD chrome the engine paints: `notesBtn`, `notesHeader`, `resume`, `hint{autoplay,drag}`, `legend{symbolsHeader,flagsHeader,advance,hq,contact,strength,movement,combat,lost}`, and `disclaimer` (the imagery note — its English default carries the required EOX/SRTM attribution; keep that if you use these tiles). **All optional** — the engine ships English defaults and deep-merges yours over them, so a half-translated `ui` never shows the word "undefined"; translate them all for a polished local-language build.
- `intro` : `{ title_zh,title_en, sub_zh,sub_en, cam }` (the opening title card + establishing shot); `outro` carries its own `cam`.
- `flagLegend` : `[ {flag,zh,en,faction} ]` (the legend flag swatches).

**The engine validates this contract at boot (fail-loud, never silent garbage).** Omit a *required* field — a `meta.geo` bound, a `meta` date, a faction colour/role, `intro.cam`/`outro.cam`, a non-empty `storyboard` — and the engine stops with one clear message naming exactly what is missing, instead of rendering a NaN world or printing "undefined". So if a fresh fork won't start, read the error: it tells you the field. Optional blocks (`meta.dir/fonts/theme`, every `ui` string) are never required; they default.

**Bilingual by design (a product decision, not a limit).** The contract is two narration slots — `_zh` (primary, any script) + `_en` (secondary, conventionally English). Put your local language in `_zh` and English in `_en`; both render and the lang button toggles them. This is "any two languages/scripts flawlessly" (incl. RTL), not "N languages".

**Scenario** (the boot validator checks every field below and names the first wrong/missing one, so a half-authored fork tells you exactly what to fix):
- `geography` : `regions[]` + `points[]` (each `{name_zh,name_en,lng,lat,type?,h?}` — **optional**; a naval/open battle may have few or none) and `lines[]` (each `{name_zh,name_en,color,path:[[lng,lat],…],fade?{holdUntil,collapseBy,span}}`; omit `fade` for a permanent line, omit `lines` for none).
- `units[]` : each `{ id, faction:<key>, name_zh, flag, kind?, cf?, commander?, track:[ {d,lng,lat,s,st}, … ] }`. **A unit MOVES along its `track` keyframes** — there is no flat "position/strength" field. Each keyframe is a day `d`, a position `lng/lat`, a strength `s`, and a state `st` ∈ `march|hold|attack|retreat|landing|dead`. One keyframe = a fixed unit; two+ = it glides between them.
- `arrows[]` : each `{ f:<key>, from:[lng,lat], to:[lng,lat], d, kind, label }` (shown ~0.6 day before to ~1.1 day after `d`).
- `fronts[]` *(optional)* : dated front-line polylines, each `{ d, path:[[lng,lat],…] }`.
- `hotspots[]` *(optional)* : dated combat FX, each `{ a, b, kind, lng, lat, i }` (active days `a`→`b`; `kind` ∈ `firefight|artillery|explosion|landing|air|oilfire`; `i` = intensity 0..1).
- `weather[]` *(optional)* : per-day `{ d, night, fog, rain, smoke }` (each 0..1; absent → a clear, dry day).
- `storyboard[]` : the directed shots, each `{ day, hold, cam:{lng,lat,dist,az,el,orbit}, title_zh, title_en, dateLabel, narration_zh?, narration_en?, side?, focus?:[ids], commanders?:[{zh,en}] }`. **Direct it like a TV documentary:** keep `cam.dist` close enough that the audience can read the action (the focused units, the arrows, the terrain); a far-out view of the whole map reads as an empty map where nothing is legible. Zoom in on each shot's `focus`. **Picking `cam.dist`** (world units; the whole bbox is always 2000 units wide, so the same `dist` frames a fixed fraction of any box): visible ground width is about bbox-width x `dist`/4800, so `dist` ~1200 frames roughly a quarter of the box (a close action shot), ~600 a tight eighth, ~2400 a wide half-box establisher; the bundled example uses ~1150-1300 for action and ~2700 to establish. On a **focused shot** the camera aims at the `focus` centroid, so only `az/el/dist/orbit` apply (`cam.lng/lat` is the no-focus fallback).
- `notes` : `{ summary, caveats:[…], sources }` — **REQUIRED**, and `sources` must be non-empty. History must be sourced, never fabricated; the validator refuses to boot a battle with no sources.

## The rules learned the hard way
- **The data cannot be auto-generated.** Research it, cross-check it, cite it. Auto-generated history is fabrication, which turns the piece into AI slop. This discipline is what makes it credible.
- **Fictional battles are welcome, if honest.** A fiction does not need real sources, but it must be MARKED fictional in `notes` (the example uses `notes.sources:"FICTIONAL DEMONSTRATION SCENARIO"`) and kept true to its own source material (a novel, a game, an alternate-history premise, its own canon). That is fictional historical accuracy: plausible and internally consistent, never invention dressed up as real history. See AGENTS.md.
- **Anachronism discipline.** Period-correct flags and forces. If you use present-day imagery, disclose it honestly (the original states "geography is present-day; the 1941 coastline was narrower").
- **Relative paths only** (no leading `/`, no hardcoded domain). The app must run from any folder or sub-path.
- **ES-module MIME.** On a static host, `.js` must be served as a JavaScript MIME type or the module will not load. GitHub Pages does this automatically; some hosts need an `.htaccess` `AddType application/javascript .js`.
- **Audio: muted autoplay, unmuted only by a deliberate user click.** Never surprise-play sound. (The boot no longer hangs on the music preload — it has a 10s cap and skips entirely when there is no `<audio src>`, in which case the music button auto-hides.)

## Credibility (do not look like a bot or a careless dev)
- **No em-dash** (`—`) unless it is absolutely necessary. LLMs overuse the em-dash, and dense em-dash prose reads as AI-generated slop and artifacts, so default to periods, colons, and commas and reach for one only when nothing else conveys the meaning. Just avoid creating unnecessary ones as you write; do not scan or hunt the codebase for existing ones. (The Chinese dash `——` is correct in Chinese text and stays.)
- **AI is a tool, not a contributor.** Keep the git history authored by you, with no `Co-Authored-By` trailers. A "built with [tool]" note is fine (it is like "built with my laptop"); listing the tool as a contributor is not.
- **Honour the engine credit (good will).** The movie ships a small credit to the engine and its author (`#credit` + `#engine-credit`). The licence lets you remove it; we ask that you keep it visible and add your own name alongside it. The engine is free and open, and leaving the credit is how the favour is returned. See AGENTS.md.
- Do not leak build/process names in `.gitignore` or comments.

## Capturing real screenshots / GIFs
Press **P** in the running app to save the current 3D view as a PNG — built in, no dependencies (the renderer keeps its
drawing buffer). Size the browser window to your target ratio first (e.g. ~1200x630 for an `og:image`). The capture is
the clean 3D scene (terrain, units, flags, arrows, lines); the place-name labels and the HUD are DOM overlays, not in
the canvas. For a fully composited still (with captions) or a GIF, screen-record the auto-playing tour and convert with
ffmpeg or an online tool.

## Deploy
- **Run it locally:** clone the repo, fetch the tiles (`node tools/fetch_tiles.mjs`), then `node tools/serve.js` and open <http://localhost:5050>. Serve over http, not `file://`, so the ES modules load.
- **Any static host:** upload the folder as-is. Because every path is relative, it just runs.
