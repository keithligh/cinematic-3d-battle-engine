/* =====================================================================
 *  director.js, the show: camera framing, lower-third captions, the
 *  Director state machine that plays the storyboard like a TV programme,
 *  the transport HUD, and wireUI() (controls + muted-autoplay music).
 *  Captions/HUD/wireUI are bidirectionally coupled to the Director, so they
 *  live together here; internal cohesion, not a cross-module cycle.
 * ===================================================================== */
import { CFG, D, FAC, clamp, lerp, easeIO, deg, REDUCE_MOTION, sameLang } from "./config.js";
import { WEDGE_PTS, AIR_PTS, NAVY_PTS, ARTY_PTS } from "./entities.js";   // the glyph outlines: the legend symbols are derived from them, never copied

/* A unit glyph outline, rendered as the 12px HUD legend symbol. The outlines live in entities.js and are
 * extruded into the 3D map tokens; this draws the SAME numbers flat, so a glyph edit moves both and they
 * cannot drift (they did once: LegendGlyphSync, 2026-06-25). VIEW is the existing 16x16 box, so the
 * outline is centred at VIEW/2 and scaled by SPAN, the factor that fits every glyph inside it. */
const VIEW=16, SPAN=5;
const glyphSymbol=pts=>`<svg viewBox="0 0 ${VIEW} ${VIEW}" width="12" height="12" style="vertical-align:middle"><path d="`
  + pts.map(([x,y],i)=>`${i?"L":"M"}${+(VIEW/2+x*SPAN).toFixed(4)} ${+(VIEW/2+y*SPAN).toFixed(4)}`).join(" ")
  + ` Z" fill="currentColor"/></svg>`;
import { camera, controls } from "./core.js";
import { vec } from "./projection.js";
import { Clock, setDay, lookTarget, unitById, setFocus } from "./state.js";
import { sampleTrack } from "./entities.js";
import { flagTexture } from "./flags.js";

/* ===================== CAMERA & DIRECTOR ========================= */
const TITLE_DUR=4.5;
// closing shot: a slow majestic pull-back/orbit over the whole theatre (camera framing comes from the battle's data)
const OUTRO_CAM = D.outro.cam;
const _off=new THREE.Vector3();
function spherical(target,dist,azDeg,elDeg){ const a=azDeg*deg, e=elDeg*deg;
  _off.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(dist);
  return target.clone().add(_off); }
function camFromShot(c){ const target=vec(c.lng,c.lat,8); return { target, pos:spherical(target,c.dist*CFG.ZOOM,c.az,c.el) }; }
// aim at the centroid of the shot's focus units so the action is centred & close
function shotTarget(sh){ let x=0,y=0,z=0,n=0;
  (sh.focus||[]).forEach(id=>{ const o=unitById[id]; if(!o) return; const s=sampleTrack(o.u.track,sh.day);
    const v=vec(s.lng,s.lat,0); x+=v.x; y+=v.y; z+=v.z; n++; });
  return n ? new THREE.Vector3(x/n, y/n+8, z/n) : vec(sh.cam.lng,sh.cam.lat,8); }

/* ---- captions (lower-third) ---- */
const $=id=>document.getElementById(id);
// One control's name, in both places a name is read: the tooltip a sighted user hovers and the label a
// screen reader speaks. Fed from D.ui.a11y, so a localized battle is localized to a blind visitor too.
const setName=(el,s)=>{ if(el&&s!=null){ el.title=s; el.setAttribute("aria-label",s); } };
// One chapter, named once: the tooltip on a timeline tick and the value a screen reader reads off the scrubber.
const chapterText=sh=>sh.dateLabel+" · "+sh.title_zh;
let spokenShot=null;              // the chapter last written to the scrubber's aria value (see updateProgress)
function showCap(){ $("caption").classList.add("show"); }
function hideCap(){ $("caption").classList.remove("show"); }
let narrLang="both";              // caption narration language: "both" | "zh" | "en"
let lastNarr={zh:"",en:""};       // remembered so the toggle can re-render the current caption
function setNarr(zh,en){ lastNarr={zh:zh||"",en:en||""};
  $("cap-narr").innerHTML = narrLang==="zh" ? `<span class="nz">${lastNarr.zh}</span>`
    : narrLang==="en" ? `<span class="ne">${lastNarr.en||lastNarr.zh}</span>`
    : `<span class="nz">${lastNarr.zh}</span>`+(lastNarr.en&&!sameLang(lastNarr.zh,lastNarr.en)?`<span class="ne">${lastNarr.en}</span>`:""); }
function cycleNarrLang(){ narrLang = narrLang==="both"?"zh":narrLang==="zh"?"en":"both";
  const b=$("lang-btn"); if(b) b.textContent = D.ui.langToggle[narrLang];
  setNarr(lastNarr.zh,lastNarr.en); }
function card(zh,en,narrZh,narrEn){ $("cap-date").textContent=""; $("cap-title").innerHTML=zh+(sameLang(zh,en)?"":`<span class="en">${en}</span>`);
  setNarr(narrZh,narrEn); $("cap-meta").innerHTML=""; showCap(); }
function sideStrength(sh,side){ let s=0; (sh.focus||[]).forEach(id=>{ const o=unitById[id];
  if(o&&o.u.cf&&o.u.faction===side) s+=sampleTrack(o.u.track,Clock.day).s; }); return s; }
function setCaption(sh){
  $("cap-date").textContent=sh.dateLabel;
  $("cap-title").innerHTML=sh.title_zh+(sameLang(sh.title_zh,sh.title_en)?"":`<span class="en">${sh.title_en}</span>`);
  setNarr(sh.narration_zh,sh.narration_en);
  let meta=(sh.commanders||[]).map(c=>`<span class="cmd">${c.zh}${c.en?(" · "+c.en):""}</span>`).join("");
  (sh.side==="both"?Object.keys(FAC):[sh.side]).forEach(sd=>{ const f=FAC[sd]; if(!f) return; const v=sideStrength(sh,sd); if(!v) return;
    const pct=clamp(v/f.maxStrength*100,6,100), nm=f.name_zh;
    meta+=`<span class="str ${sd}">${nm} ${v.toLocaleString()}${D.ui.strengthUnit}<span class="bar"><i style="width:${pct}%"></i></span></span>`; });
  $("cap-meta").innerHTML=meta; showCap();
}

/* ---- the Director: plays the storyboard like a TV programme ---- */
export const Director = {
  shots:D.storyboard, i:-1, t:0, mode:"title", playing:true, userFree:false, capShown:false,
  fromPos:new THREE.Vector3(), fromTgt:new THREE.Vector3(), tgt:new THREE.Vector3(), fromDay:CFG.DAY_MIN, toDay:CFG.DAY_MIN,
  start(){ this.mode="title"; this.t=0; this.playing=true; this.userFree=false; setDay(this.shots[0].day);
    const c=camFromShot(D.intro.cam); camera.position.copy(c.pos); controls.target.copy(c.target);
    lookTarget.copy(controls.target);
    card(D.intro.title_zh, D.intro.title_en, D.intro.sub_zh, D.intro.sub_en); },
  enterShot(i){ this.i=i; this.t=0; this.capShown=false; const sh=this.shots[i];
    this.fromDay=Clock.day; this.toDay=sh.day;   // ease the day across the move → smooth day/night + weather
    setFocus(new Set(sh.focus||[])); this.tgt.copy(shotTarget(sh));
    this.fromPos.copy(camera.position); this.fromTgt.copy(controls.target); hideCap(); },
  pauseForUser(){ if(this.mode==="title"||this.userFree) return; this.userFree=true; $("resume").classList.add("show"); },
  resume(){ if(!this.userFree) return; this.userFree=false; $("resume").classList.remove("show");
    if(this.mode==="play"){ this.fromPos.copy(camera.position); this.fromTgt.copy(controls.target); this.t=0; this.capShown=false; hideCap(); }
    this.playing=true; updatePlayBtn(); },
  togglePlay(){ if(this.mode==="outro"){ this.start(); updatePlayBtn(); return; }
    this.playing=!this.playing; updatePlayBtn(); },
  goToShot(i){ i=clamp(i,0,this.shots.length-1);     // jump to a chapter from the timeline axis
    this.userFree=false; $("resume").classList.remove("show"); this.mode="play"; this.playing=true;
    this.enterShot(i); updatePlayBtn(); },
  update(dt){
    if(this.userFree){ lookTarget.copy(controls.target); return; }   // free-look: OrbitControls owns the camera
    if(!this.playing) return;
    this.t+=dt;
    if(this.mode==="title"){ if(this.t>=TITLE_DUR){ hideCap(); this.enterShot(0); this.mode="play"; } return; }
    if(this.mode==="outro"){ const dist=OUTRO_CAM.dist*CFG.ZOOM;
      if(this.t<OUTRO_CAM.tween){ const e=easeIO(this.t/OUTRO_CAM.tween);
        camera.position.lerpVectors(this.fromPos,spherical(this.tgt,dist,OUTRO_CAM.az,OUTRO_CAM.el),e);
        controls.target.lerpVectors(this.fromTgt,this.tgt,e); }
      else { const ot=this.t-OUTRO_CAM.tween;
        controls.target.copy(this.tgt); camera.position.copy(spherical(this.tgt,dist,OUTRO_CAM.az+OUTRO_CAM.orbit*ot*(REDUCE_MOTION?0:1),OUTRO_CAM.el)); }
      lookTarget.copy(controls.target); updateProgress(); return; }
    const sh=this.shots[this.i], dur=CFG.TWEEN+sh.hold, dist=sh.cam.dist*CFG.ZOOM;
    if(this.t<CFG.TWEEN){ const e=easeIO(this.t/CFG.TWEEN);
      setDay(lerp(this.fromDay,this.toDay,e));   // day/night + weather glide as the camera moves
      camera.position.lerpVectors(this.fromPos,spherical(this.tgt,dist,sh.cam.az,sh.cam.el),e);
      controls.target.lerpVectors(this.fromTgt,this.tgt,e); }
    else { const ot=this.t-CFG.TWEEN;
      const nextDay=(this.i+1<this.shots.length)?this.shots[this.i+1].day:CFG.DAY_MAX;
      setDay(lerp(this.toDay, nextDay, clamp(ot/sh.hold,0,1)));   // keep time advancing through the hold so units GLIDE, not freeze
      controls.target.copy(this.tgt); camera.position.copy(spherical(this.tgt,dist,sh.cam.az+sh.cam.orbit*ot*(REDUCE_MOTION?0:1),sh.cam.el));
      if(!this.capShown){ setCaption(sh); this.capShown=true; } }
    lookTarget.copy(controls.target);
    if(this.t>=dur){
      if(this.i+1<this.shots.length) this.enterShot(this.i+1);
      else { this.mode="outro"; this.t=0; setFocus(new Set());
        this.fromPos.copy(camera.position); this.fromTgt.copy(controls.target);
        this.tgt.copy(vec(OUTRO_CAM.lng,OUTRO_CAM.lat,8));
        card(D.outro.title_zh,D.outro.title_en,D.outro.narration_zh,D.outro.narration_en); updatePlayBtn(); } }
    updateProgress();
  }
};

/* ===================== MINIMAL UI (no control panel) ============= */
// The glyph and the spoken name are picked by ONE branch, so the three states cannot drift apart again
// (the name used to be a fixed "Play / pause", which was simply wrong in the replay state).
export function updatePlayBtn(){ const A=D.ui.a11y, out=Director.mode==="outro", b=$("play");
  b.textContent = out ? "↻" : (Director.playing?"⏸":"▶");
  setName(b, out ? A.replay : (Director.playing?A.pause:A.play)); }
function sceneLabel(){   // the running time chip. Default: year.month.day (the day taken from the clock). A fork may set ui.sceneLabel to false (hide it) or to a string with {year}/{month}/{day} tokens (e.g. a static "U.C. 0079.11.30" for a non-calendar timeline; the per-shot dateLabel carries the real date).
  const sl=D.ui.sceneLabel, mm=String(D.meta.month).padStart(2,"0"), dd=String(Math.min(D.meta.lastDay,Math.floor(Clock.day))).padStart(2,"0");
  if(sl===false) return "";
  if(typeof sl==="string") return sl.replace(/\{year\}/g,D.meta.year).replace(/\{month\}/g,mm).replace(/\{day\}/g,dd);
  return `${D.meta.year}.${mm}.${dd}`;
}
function updateProgress(){ const N=Director.shots.length; let f=0;
  if(Director.mode==="play"){ const sh=Director.shots[Director.i]; f=(Director.i+clamp(Director.t/(CFG.TWEEN+sh.hold),0,1))/N; }
  else if(Director.mode==="outro") f=1;
  $("prog").firstChild.style.width=(f*100)+"%";
  // The same position, spoken. Written only when the CHAPTER changes, not every frame: a screen reader
  // re-announces a slider whose value attribute is touched, and 60 announcements a second is unusable.
  const out=Director.mode==="outro", i=out?N-1:(Director.mode==="play"?Director.i:0);
  const spoken=out?"end":i;   // the outro sits on the LAST shot's index, so the mode is part of the key or the end is never announced
  if(spoken!==spokenShot && i>=0){ spokenShot=spoken; const p=$("prog"), A=D.ui.a11y;
    p.setAttribute("aria-valuenow",i); p.setAttribute("aria-valuemax",N-1);
    p.setAttribute("aria-valuetext", out ? D.ui.endLabel : `${A.chapter} ${i+1}/${N} · ${chapterText(Director.shots[i])}`); }
  $("scene-label").textContent = Director.mode==="outro" ? D.ui.endLabel
    : (Director.mode==="play" ? sceneLabel() : ""); }
/* ---- buildChrome(): paint the static HUD chrome from data, so a fork reskins by editing data ONLY.
 *  index.html carries no battle text (only <title>/og); every visible string here has ONE source:
 *  D.meta (battle name) · FAC (faction names + the --fac-<key> swatch injectBattleStyles emits) ·
 *  D.geography.lines (defensive lines) · D.ui (+ DEFAULT_UI English fallback). Called at init BEFORE
 *  loadTiles so the boot splash shows the battle's name. Names no faction/script/coordinate. */
export function buildChrome(){
  const q=sel=>document.querySelector(sel), txt=(sel,s)=>{ const e=q(sel); if(e&&s!=null) e.textContent=s; };
  const ui=D.ui, name=D.meta.title, sub=D.meta.subtitle;
  txt("#title h1", name); txt("#title .sub", sub);                  // on-screen title
  txt("#boot .bt", name);  txt("#boot .bs", sub);                   // boot splash (painted before the tile load)
  // the spoken names, from ui.a11y — index.html hardcodes none of them (tools/check-agnostic.mjs enforces that).
  // The play button and the music button name themselves per state instead, in updatePlayBtn / paintMusic.
  const A=ui.a11y;
  const nb=$("notes-btn"); if(nb){ nb.textContent=ui.notesBtn; nb.setAttribute("aria-label", ui.notesBtn); nb.setAttribute("aria-expanded","false"); }
  const lb=$("lang-btn");  if(lb) lb.textContent=ui.langToggle.both;   // initial; cycleNarrLang updates on click
  setName(lb, A.langBtn);   // one name for a three-state cycle: data.js carries language SLOTS, not language names
  const mb=$("music-btn"); if(mb){ setName(mb, A.music); mb.setAttribute("aria-pressed","false"); }   // honest: sound is off until a deliberate click
  setName($("prog"), A.progress);
  setName($("notes-close"), A.close);
  txt("#resume", ui.resume);
  txt("#notes .nhd span", ui.notesHeader);
  const hint=$("hint");    if(hint) hint.innerHTML=`<b>${ui.hint.autoplay}</b><br>${ui.hint.drag}`;
  const dis=$("disclaimer"); if(dis) dis.innerHTML=ui.disclaimer;     // default carries the EOX/SRTM attribution
  const key=$("key");
  if(key){
    const keys=Object.keys(FAC), att=keys.find(k=>FAC[k].role==="attacker")||keys[0], L=ui.legend;
    let h="";
    for(const k of keys) h+=`<div class="row ${k}"><span class="sw"></span><span>${FAC[k].name_zh}${sameLang(FAC[k].name_zh,FAC[k].name_en)?"":" "+FAC[k].name_en}</span></div>`;
    h+=`<div class="sep"></div>`;
    h+=`<div class="row front"><span class="ln"></span><span>${ui.frontLine.zh}${sameLang(ui.frontLine.zh,ui.frontLine.en)?"":" "+ui.frontLine.en}</span></div>`;
    for(const ln of (D.geography.lines||[])) h+=`<div class="row"><span class="ln" style="color:${ln.color}"></span><span>${ln.name_zh}${sameLang(ln.name_zh,ln.name_en)?"":" "+ln.name_en}</span></div>`;
    // the arm symbols below are DERIVED from the entities.js glyph outlines, not copies of them: same numbers, two renderings (see glyphSymbol)
    h+=`<details class="syms"><summary>${L.symbolsHeader}</summary>`
     + `<div class="row"><span class="gl" style="color:var(--fac-${att})">➤</span><span>${L.advance}</span></div>`
     + `<div class="row"><span class="gl">◆</span><span>${L.hq}</span></div>`   // HQ is an OctahedronGeometry, not a Shape: no outline to derive, so it stays a text diamond
     + `<div class="row"><span class="gl">${glyphSymbol(WEDGE_PTS)}</span><span>${L.infantry}</span></div>`
     + `<div class="row"><span class="gl">${glyphSymbol(AIR_PTS)}</span><span>${L.air}</span></div>`
     + `<div class="row"><span class="gl">${glyphSymbol(NAVY_PTS)}</span><span>${L.navy}</span></div>`
     + `<div class="row"><span class="gl">${glyphSymbol(ARTY_PTS)}</span><span>${L.artillery}</span></div>`
     + `<div class="row"><span class="gl">◎</span><span>${L.contact}</span></div>`
     + `<div class="row"><span class="gl mini"><i></i></span><span>${L.strength}</span></div>`
     + `<div class="row"><span class="gl">→</span><span>${L.movement}</span></div>`
     + `<div class="row"><span class="gl" style="color:#ff8a3a">✦</span><span>${L.combat}</span></div>`
     + `<div class="row"><span class="gl" style="color:#9aa6b2">⚑</span><span>${L.lost}</span></div></details>`;
    h+=`<details class="syms"><summary>${L.flagsHeader}</summary><div id="flagkey"></div></details>`;
    key.innerHTML=h;
  }
}

// Returns syncMusic so init() can start the MUTED, in-sync soundtrack timeline once audio is buffered + the
// tour has started (silent; audible only after a deliberate music-button click).
export function wireUI(){
  const n=D.notes;
  $("notes-body").innerHTML=`<p>${n.summary}</p><h5>${D.ui.notesCaveatsHeader}</h5><ul>`+
    n.caveats.map(c=>`<li>${c}</li>`).join("")+`</ul><h5>${D.ui.notesSourcesHeader}</h5><p>${n.sources}</p>`;
  // flag legend: each force's real flag swatch (from D.flagLegend), so multiple flags on one side read as distinct forces, not noise
  const fk=$("flagkey");
  if(fk){ D.flagLegend.forEach(({flag,zh,en,faction})=>{
    const row=document.createElement("div"); row.className="row";
    const sw=document.createElement("canvas"); sw.width=24; sw.height=16; sw.className="flagsw";
    sw.getContext("2d").drawImage(flagTexture({id:"fk_"+flag,flag,faction}).image,0,0,24,16);
    const t=document.createElement("span"); t.innerHTML=`${zh}`+(sameLang(zh,en)?"":` <span class="en">${en}</span>`);
    row.append(sw,t); fk.append(row); }); }
  const np=$("notes");
  // the panel's open/closed state, spoken: the button already carries it as a class, so a reader should hear it too
  const paintNotes=()=>$("notes-btn").setAttribute("aria-expanded", String(np.classList.contains("open")));
  $("notes-btn").onclick=()=>{ np.classList.toggle("open"); paintNotes(); };
  $("notes-close").onclick=()=>{ np.classList.remove("open"); paintNotes(); };
  $("lang-btn").onclick=cycleNarrLang;
  // background music (if the battle provides an <audio src>); muted autoplay, silent and in sync with the tour; a DELIBERATE click is the ONLY thing that produces sound
  const bgm=$("bgm"), musicBtn=$("music-btn"); bgm.volume=0.55; bgm.muted=true;   // muted from the start; silent until the user opts in
  const hasTrack=!!bgm.getAttribute("src");   // a battle with no <audio src> hides the music control (the player stays forward-compatible)
  let soundOn=false;   // honest default: the user has NOT opted into sound. Governs ONLY audibility (bgm.muted), never the timeline (play/pause).
  // the emoji, the class and the spoken state come off the SAME flag, so the button cannot look on and read off
  const paintMusic=()=>{ musicBtn.textContent=soundOn?"🔊":"🔇"; musicBtn.classList.toggle("off",!soundOn);
    musicBtn.setAttribute("aria-pressed", String(soundOn)); };
  // the MUTED timeline follows the tour's play/pause ONLY (decoupled from soundOn), so the soundtrack stays in sync for an eventual unmute.
  const syncMusic=()=>{ if(hasTrack && Director.playing){ bgm.play().catch(()=>{}); } else { bgm.pause(); } };
  // SOLE path to audible sound: a deliberate click flips mute on the already-playing muted element, inside the user gesture.
  if(hasTrack){ paintMusic(); musicBtn.onclick=()=>{ soundOn=!soundOn; bgm.muted=!soundOn; syncMusic(); paintMusic(); }; }
  else { musicBtn.style.display="none"; }   // no soundtrack bundled → hide the dead control
  $("play").onclick=()=>{ Director.togglePlay(); syncMusic(); };   // pause/resume the tour → pause/resume the (muted) timeline
  $("resume").onclick=()=>{ Director.resume(); syncMusic(); };
  const beats=$("prog-beats"), N=D.storyboard.length;
  D.storyboard.forEach((sh,i)=>{ const b=document.createElement("b"); b.style.left=((i+0.5)/N*100)+"%";
    b.title=chapterText(sh); beats.appendChild(b); });   // hover a tick to read the chapter
  $("prog").addEventListener("click",e=>{ const r=$("prog").getBoundingClientRect();   // click the time axis to jump to a chapter
    const frac=clamp((e.clientX-r.left)/r.width,0,1); Director.goToShot(Math.round(frac*N-0.5)); });
  // ...and reach the same chapters from the keyboard: the axis is a <div>, so without this it is mouse-only.
  // Same seek call as the click above — one seek path, not two.
  $("prog").addEventListener("keydown",e=>{ const i=Math.max(Director.i,0), k=e.key;
    const to = k==="ArrowRight"||k==="ArrowUp" ? i+1 : k==="ArrowLeft"||k==="ArrowDown" ? i-1
             : k==="Home" ? 0 : k==="End" ? N-1 : null;
    if(to===null) return;
    e.preventDefault(); Director.goToShot(to); });
  controls.addEventListener("start",()=>Director.pauseForUser());   // a user drag pauses the tour
  // auto-hide transport + hint on inactivity
  let idle; const ui=[$("controls"),$("hint")];
  const wake=()=>{ ui.forEach(e=>e.classList.remove("hide")); clearTimeout(idle);
    idle=setTimeout(()=>ui.forEach(e=>e.classList.add("hide")),3500); };
  ["pointermove","pointerdown","keydown","wheel"].forEach(ev=>addEventListener(ev,wake)); wake();
  return syncMusic;
}
