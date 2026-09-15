<div align="center">

# cinematic-3d-battle-engine

### Turn **any battle, historical or fictional**, into a **self-playing 3D documentary** on **real-scale satellite and elevation terrain**. No build, no backend, no API keys. Build your own by **just asking an AI**.

[![live demo](https://img.shields.io/badge/live_demo-online-2ea44f?style=for-the-badge)](https://keithligh.github.io/cinematic-3d-battle-engine/)
&nbsp;
[![built with Claude Code](https://img.shields.io/badge/built_with-Claude_Code-d97757?style=for-the-badge)](PROMPT.md)
&nbsp;
[![Star this repo](https://img.shields.io/badge/%E2%98%85_Star_this_repo-FFD93D?style=for-the-badge&logo=github&logoColor=181717)](https://github.com/keithligh/cinematic-3d-battle-engine)

[![code MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)
[![content CC BY 4.0](https://img.shields.io/badge/content-CC_BY_4.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![Three.js r128](https://img.shields.io/badge/Three.js-r128-000000)](https://threejs.org/)
[![no build, runs offline](https://img.shields.io/badge/build-none-success)](#quick-start)

[![The bundled Example Battle running out of the box: a fictional coastal assault on real Italian terrain, Blue Force landing from the sea and driving inland against Red Force, with captions, place labels, flags, troop-strength readouts and the legend](docs/demo.gif)](https://keithligh.github.io/cinematic-3d-battle-engine/)

**▶ [Try the live demo](https://keithligh.github.io/cinematic-3d-battle-engine/)** &nbsp;·&nbsp; **🤖 [Build your own: just ask an AI](#build-your-own-just-ask-an-ai)**

</div>

---

This is the open-source engine that renders **any battle, historical or fictional, as a self-playing 3D documentary**. A
cinematic camera **directs itself** through the campaign over **real elevation and satellite imagery** projected to
scale, with troop movements, period flags, bilingual narration, weather, and a day/night cycle. Everything is
**data-driven**: you describe a battle in one data file, the engine renders it, and the engine modules themselves never
change from one battle to the next. **Every frame is the live engine. Nothing is mocked up.** No build step, no backend,
no API keys: one folder of static files that runs in any browser.

The repo ships a **complete fictional "Example Battle"** so it plays itself the moment you clone it: a coastal assault
where Blue Force lands from the sea and drives inland against Red Force, on the real terrain of the Italian coast.

This engine was extracted from **[The Battle of Hong Kong, 1941](https://github.com/keithligh/battle-of-hong-kong-1941)**,
and **[D-Day: The Normandy Landings, 1944](https://github.com/keithligh/d-day-normandy-1944)** was then built on it.
All three are **separate, independent repositories that share no code** ([more below](#where-it-came-from-and-what-it-makes)).

## Highlights

- 🌍 **Real Earth, to scale.** Actual SRTM elevation and Sentinel-2 satellite imagery, projected by real lng/lat. Any land or coastal geography on the planet, from global, key-less tile providers.
- 🎬 **It directs itself.** A cinematic "Director" plays the campaign as a sequence of shots; grab the camera any time to free-look, and it resumes.
- 🧩 **Data-driven, engine never touched.** A battle lives in `data.js` and `flags.js`; the engine modules read every value from the data and never change from one battle to the next.
- 🌐 **Any side, any language.** Any number of forces, bilingual by design, any script including right-to-left (`meta.fonts`, `meta.dir`).
- 🎨 **Any look.** A per-battle film grade, sky, sea, sun and fog via `meta.theme`: the same engine renders a sunlit landing or a rain-soaked night.
- 🛡️ **Fails loud, not silent.** A boot validator names the exact missing or mistyped field, in the browser and from the command line (`node tools/validate.mjs`), so a broken `data.js` never half-renders.
- 📚 **Honest by design.** `notes.sources` is a required field: the engine will not start a battle that cites no sources.
- ⚡ **Zero infrastructure.** Static files, Three.js r128, no build step, no backend, no API keys; runs offline.

> The Example Battle is a complete, self-contained **fictional** demo (it cites no sources because it is invented). To build your own, you do not edit it: you start from the minimal annotated skeleton `data.example.js` and follow [PLAYBOOK.md](PLAYBOOK.md). The finished documentaries on the same engine ([Hong Kong](https://keithligh.github.io/battle-of-hong-kong-1941/), [D-Day](https://keithligh.github.io/d-day-normandy-1944/)) show what it renders once a real, sourced battle is described in data.

> _If this made you think "wow, AI can build that?", a ⭐ helps other people find it._

## Build your own: just ask an AI

You do not need to write code, and you do not need to be a coder. Fork this repo, open it in an AI coding agent
([Claude Code](https://claude.com/claude-code), Codex, or similar), and ask it to build your battle. The agent does the
work: it researches the history, writes the data, draws the period flags, sets the map, and runs it. **You direct and
fact-check; the agent builds.** That is the whole idea: a finished 3D documentary of any battle without you ever
touching the engine.

A ready starting prompt ships right here in the repo: **[PROMPT.md](PROMPT.md)**. The agent's full runbook is
**[AGENTS.md](AGENTS.md)**, and the field reference it follows is **[PLAYBOOK.md](PLAYBOOK.md)**. Everything the
agent needs is in this repository; it never has to read another one.

## Quick start

Map tiles load over HTTP, so serve the folder (opening `index.html` via `file://` will **not** work).

1. **Fetch the terrain and imagery tiles for the example** (first time only):
   ```
   node tools/fetch_tiles.mjs
   ```
   This downloads the elevation and satellite imagery for the Example Battle's bounding box from their source providers into `lib/tiles/`. No account or API key is required.

2. **Serve and open:**
   ```
   node tools/serve.js
   ```
   then open <http://localhost:5050>. (Windows: double-click **`start.bat`**; macOS/Linux: `sh start.sh`.)

You should see the fictional Example Battle play itself over real Italian coastal terrain. Now read **[PLAYBOOK.md](PLAYBOOK.md)** and make it yours.

## Under the hood

You do not have to know any of this, but it is why an AI can build a whole documentary by editing data alone: **a battle is a data project, not an engine project.** The battle layer is `data.js` (forces, dated movements, the storyboard, narration), `flags.js` (each side's flag art), and the `index.html` title and social meta. The engine modules (`config.js`, `app.js`, `core.js`, `terrain.js`, `director.js`, and the rest) read every value from the data and never change from one battle to the next.

## How it works

- **Terrain:** AWS "Terrarium" elevation tiles (SRTM/USGS, public domain) decoded to a real height-mesh, Web-Mercator, to scale (with a fixed vertical exaggeration for legibility).
- **Surface:** EOX *Sentinel-2 cloudless 2016* satellite imagery draped over the terrain.
- **Direction:** a state-machine "Director" plays a fixed storyboard of shots; grab the camera to free-look and it resumes.
- **Data contract:** `validate.js` defines exactly what a renderable battle needs, and the same file runs at boot and from the CLI (`node tools/validate.mjs`), so the two can never disagree.

## How it was built

This engine was **extracted from a finished documentary**, not designed in the abstract. It began as
**[The Battle of Hong Kong, 1941](https://github.com/keithligh/battle-of-hong-kong-1941)**, built from a single
from-scratch brief before any engine existed. Everything battle-specific was then pulled out of it, pass by pass,
until what remained named no battle, no faction and no language, and read all of it from data. **[D-Day: The Normandy
Landings, 1944](https://github.com/keithligh/d-day-normandy-1944)** was then built on the result, which is what proved
the extraction worked: a completely different battle, in a different language pair, on different terrain, with the
engine untouched.

That is agentic engineering, and the interesting part is not the AI but the architecture and the judgment around it.
To build a battle of your own on top of it, [just ask an AI](#build-your-own-just-ask-an-ai).

## Licensing

- **Code** (the `.js` source, `index.html`, `tools/`): **MIT**, see [`LICENSE`](LICENSE).
- **The bundled Example Battle's text content:** **CC BY 4.0**, <https://creativecommons.org/licenses/by/4.0/>.
- **Bundled and fetched third-party software and data** (Three.js, the Sentinel-2 imagery, the SRTM/USGS elevation) keep their own licenses; see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- Battles you build carry whatever license you choose for your own `data.js` content.

## Credits and data sources

- Satellite imagery: **Sentinel-2 cloudless 2016 © EOX IT Services GmbH** (s2maps.eu); contains modified Copernicus Sentinel data.
- Elevation: **SRTM, courtesy U.S. Geological Survey** via AWS Terrain Tiles.
- 3D engine: **Three.js** (MIT).

## Where it came from, and what it makes

Two finished documentaries stand either side of this engine, and they play different roles:

- **The origin.** **[The Battle of Hong Kong, 1941](https://github.com/keithligh/battle-of-hong-kong-1941)** ([live](https://keithligh.github.io/battle-of-hong-kong-1941/)): the 18-day battle on the real terrain of Hong Kong, in 中文 and English. This came **first**, and this engine is what was extracted from it.
- **The proof.** **[D-Day: The Normandy Landings, 1944](https://github.com/keithligh/d-day-normandy-1944)** ([live](https://keithligh.github.io/d-day-normandy-1944/)): the 6 June 1944 assault on the Normandy coast, with the Allied and Wehrmacht (Iron Cross / Balkenkreuz) insignia of the day. This was built **on** the finished engine, and is the kind of thing you can make with it.

**They are three separate repositories, and they share no code.** Nothing here imports them and nothing in them
imports this: no submodule, no package, no dependency of any kind. Each one clones, fetches its own tiles and runs on
its own, and each is free to diverge. The engine in this repository names no battle at all, which is exactly why the
same files can render Hong Kong, Normandy, or yours. Your battle will be independent in the same way: your own
repository, owing nothing to this one once you have it.

## Security

Found something? See [`SECURITY.md`](SECURITY.md) for how to report it.

## Author

Built by **Keith Li**. Find me on [LinkedIn](https://www.linkedin.com/in/keithlihk/).
