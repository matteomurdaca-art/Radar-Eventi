/* RADAR EVENTI — pannello organizzatori */
document.getElementById("top").innerHTML = topbar("admin");
const DRAFT_KEY = "radar-eventi-bozza";
const DEFAULT_CENTER = [45.5617, 8.1086]; // Vigliano Biellese
let ev = null, amap = null, amarkers = {}, INDEX = null;

const $ = id => document.getElementById(id);
const slug = s => (s || "evento").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
const uid = () => Math.random().toString(36).slice(2, 8);

function blank(){
  const today = ymd(new Date());
  return {id:"", title:"", date:today, dateEnd:today, place:"", address:"", organizer:"", summary:"", facts:[], notice:"",
    center:DEFAULT_CENTER, zoom:17, points:[], program:[], updates:[], todo:[], contacts:[], sponsors:[], source:null};
}

/* ---------- salvataggio ---------- */
let saveTimer = null;
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if(!ev.id && ev.title) ev.id = slug(ev.title + "-" + (ev.date || "").slice(0, 4));
    try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(ev)); $("saved").textContent = "Bozza salvata " + new Date().toTimeString().slice(0, 5); }
    catch(e){ $("saved").textContent = "Bozza troppo grande per questo dispositivo: scarica il file evento."; }
    drawEntry();
  }, 300);
}

/* ---------- avvio ---------- */
async function init(){
  try{
    INDEX = await loadJSON("data/events.json");
    INDEX.events.forEach(e => $("pick").insertAdjacentHTML("beforeend", `<option value="${esc(e.id)}">${esc(e.title)} · ${esc(e.date)}</option>`));
  }catch(e){ $("draftInfo").textContent = "Elenco eventi non disponibile."; }
  let draft = null;
  try{ draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }catch(e){}
  if(draft){ $("draftInfo").textContent = `Hai una bozza: "${draft.title || "senza nome"}". L'ho riaperta.`; open(draft); }
}

function open(data){
  ev = Object.assign(blank(), data);
  $("editor").hidden = false; $("bar").hidden = false;
  document.querySelectorAll("[data-k]").forEach(inp => {
    const v = ev[inp.dataset.k];
    inp.value = inp.hasAttribute("data-lines") ? (v || []).join("\n") : (v || "");
  });
  $("f-contacts").value = (ev.contacts || []).map(c => `${c.label} | ${c.value}`).join("\n");
  $("f-sponsors").value = (ev.sponsors || []).map(s => `${s.name} | ${s.desc || ""}`).join("\n");
  initMap(); drawPoints(); drawProg(); drawUpd(); drawEntry(); save();
}

$("pick").addEventListener("change", async e => {
  const entry = INDEX?.events.find(x => x.id === e.target.value); if(!entry) return;
  open(await loadJSON(entry.file));
  $("draftInfo").textContent = `Aperto "${entry.title}". Le modifiche restano in bozza finché non pubblichi il file.`;
});
$("newEv").addEventListener("click", () => { open(blank()); $("draftInfo").textContent = "Nuovo evento: parti dal nome e dalla data."; });
$("importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; if(!f) return;
  try{ open(JSON.parse(await f.text())); $("draftInfo").textContent = `Importato "${ev.title}".`; }
  catch(err){ $("draftInfo").textContent = "Il file non è un evento valido."; }
});

/* ---------- campi semplici ---------- */
document.querySelectorAll("[data-k]").forEach(inp => inp.addEventListener("input", () => {
  ev[inp.dataset.k] = inp.hasAttribute("data-lines") ? inp.value.split("\n").map(s => s.trim()).filter(Boolean) : inp.value;
  save();
}));
const pairs = (txt, a, b) => txt.split("\n").map(l => l.split("|").map(s => s.trim())).filter(x => x[0]).map(x => ({[a]: x[0], [b]: x[1] || ""}));
$("f-contacts").addEventListener("input", e => { ev.contacts = pairs(e.target.value, "label", "value"); save(); });
$("f-sponsors").addEventListener("input", e => { ev.sponsors = pairs(e.target.value, "name", "desc"); save(); });

/* ---------- mappa e punti ---------- */
function initMap(){
  if(amap){ amap.remove(); amarkers = {}; }
  amap = L.map("amap").setView(ev.center || DEFAULT_CENTER, ev.zoom || 17);
  osmLayer().addTo(amap);
  amap.on("click", e => addPoint(e.latlng.lat, e.latlng.lng));
  ev.points.forEach(addMarker);
}
function addMarker(p){
  const m = L.marker([p.lat, p.lon], {icon: pinIcon(p), draggable: true, title: p.name}).addTo(amap);
  m.on("dragend", () => { const ll = m.getLatLng(); p.lat = +ll.lat.toFixed(6); p.lon = +ll.lng.toFixed(6); p.approx = false; drawPoints(); save(); });
  m.on("click", () => { const row = document.querySelector(`[data-pid="${p.id}"]`); row?.scrollIntoView({block:"center"}); row?.querySelector("input")?.focus(); });
  amarkers[p.id] = m;
}
function refreshMarker(p){ amarkers[p.id]?.setIcon(pinIcon(p)); }
function addPoint(lat, lon){
  const p = {id: uid(), cat: "evento", name: "Nuovo punto", lat: +lat.toFixed(6), lon: +lon.toFixed(6), desc: "", approx: false};
  ev.points.push(p); addMarker(p); drawPoints(); save();
  const row = document.querySelector(`[data-pid="${p.id}"]`); row?.scrollIntoView({block:"center"}); row?.querySelector("input")?.select();
}
function drawPoints(){
  $("pointList").innerHTML = ev.points.length ? ev.points.map(p => `<li class="editrow" data-pid="${p.id}">
    <div class="head"><span class="badge" style="background:${catColor(p.cat)}">${esc(p.label || CATS[p.cat]?.icon || "•")}</span>
      <input type="text" id="pn-${p.id}" value="${esc(p.name)}" data-f="name" aria-label="Nome del punto" style="flex:1">
      <button class="btn danger small-btn" data-del="${p.id}" aria-label="Elimina ${esc(p.name)}">Elimina</button></div>
    <div class="grid2">
      <label for="pc-${p.id}">Tipo<select id="pc-${p.id}" data-f="cat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}"${k === p.cat ? " selected" : ""}>${c.label}</option>`).join("")}</select></label>
      <label for="pl-${p.id}">Simbolo (1-2 caratteri, facoltativo)<input type="text" id="pl-${p.id}" maxlength="2" value="${esc(p.label || "")}" data-f="label"></label>
    </div>
    <label for="pd-${p.id}">Descrizione<textarea id="pd-${p.id}" data-f="desc">${esc(p.desc || "")}</textarea></label>
    <label class="check" for="pa-${p.id}"><input type="checkbox" id="pa-${p.id}" data-f="approx"${p.approx ? " checked" : ""}> Posizione indicativa</label>
  </li>`).join("") : `<li class="editrow hint">Nessun punto. Tocca la mappa per aggiungerne uno.</li>`;
  $("u-point").innerHTML = `<option value="">— nessuno —</option>` + ev.points.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
}
$("pointList").addEventListener("input", e => {
  const row = e.target.closest("[data-pid]"); if(!row) return;
  const p = ev.points.find(x => x.id === row.dataset.pid), f = e.target.dataset.f;
  p[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  if(f !== "name" && f !== "desc"){ refreshMarker(p); row.querySelector(".badge").style.background = catColor(p.cat); row.querySelector(".badge").textContent = p.label || CATS[p.cat]?.icon || "•"; }
  if(f === "name") $("u-point").querySelector(`option[value="${p.id}"]`).textContent = p.name;
  save();
});
$("pointList").addEventListener("click", e => {
  const d = e.target.closest("[data-del]"); if(!d) return;
  const btn = d;
  if(btn.dataset.confirm !== "1"){ btn.dataset.confirm = "1"; btn.textContent = "Conferma"; setTimeout(() => { btn.dataset.confirm = ""; btn.textContent = "Elimina"; }, 3000); return; }
  const id = d.dataset.del; amap.removeLayer(amarkers[id]); delete amarkers[id];
  ev.points = ev.points.filter(p => p.id !== id);
  ev.program.forEach(it => { if(it.point === id) it.point = ""; });
  drawPoints(); drawProg(); save();
});
$("setCenter").addEventListener("click", () => {
  const c = amap.getCenter(); ev.center = [+c.lat.toFixed(6), +c.lng.toFixed(6)]; ev.zoom = amap.getZoom(); save();
  $("mapMsg").textContent = "Vista iniziale salvata.";
});
$("addHere").addEventListener("click", () => {
  if(!("geolocation" in navigator)){ $("mapMsg").textContent = "Posizione non disponibile su questo dispositivo."; return; }
  $("mapMsg").textContent = "Cerco la posizione…";
  navigator.geolocation.getCurrentPosition(pos => {
    addPoint(pos.coords.latitude, pos.coords.longitude); amap.setView([pos.coords.latitude, pos.coords.longitude], 18);
    $("mapMsg").textContent = `Punto aggiunto (precisione circa ${Math.round(pos.coords.accuracy)} m).`;
  }, () => { $("mapMsg").textContent = "Posizione non autorizzata: consenti l'accesso nelle impostazioni del browser."; }, {enableHighAccuracy: true, timeout: 20000});
});

/* ---------- programma ---------- */
function drawProg(){
  $("progList").innerHTML = ev.program.length ? ev.program.map((it, i) => `<li class="editrow" data-i="${i}">
    <div class="head"><input type="text" id="gw-${i}" value="${esc(it.what)}" data-f="what" aria-label="Attività" style="flex:1" placeholder="Attività">
      <button class="btn danger small-btn" data-pdel="${i}">Elimina</button></div>
    <input type="text" id="gd-${i}" value="${esc(it.desc || "")}" data-f="desc" aria-label="Dettagli" placeholder="Dettagli (facoltativo)">
    <div class="grid2">
      <label for="gs-${i}">Inizio<input type="time" id="gs-${i}" value="${esc(it.start || "")}" data-f="start"></label>
      <label for="ge-${i}">Fine<input type="time" id="ge-${i}" value="${esc(it.end || "")}" data-f="end"></label>
    </div>
    <div class="grid2">
      <label for="gt-${i}">Oppure orario a parole<input type="text" id="gt-${i}" value="${esc(it.whenText || "")}" data-f="whenText" placeholder="Es. fino a sera"></label>
      <label for="gp-${i}">Dove<select id="gp-${i}" data-f="point"><option value="">—</option>${ev.points.map(p => `<option value="${p.id}"${p.id === it.point ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
    </div>
    <label class="check" for="ga-${i}"><input type="checkbox" id="ga-${i}" data-f="allDay"${it.allDay ? " checked" : ""}> Tutto il giorno</label>
  </li>`).join("") : `<li class="editrow hint">Nessuna attività. Aggiungi la prima.</li>`;
}
$("addProg").addEventListener("click", () => { ev.program.push({what: "", desc: ""}); drawProg(); save(); $("gw-" + (ev.program.length - 1)).focus(); });
$("progList").addEventListener("input", e => {
  const row = e.target.closest("[data-i]"); if(!row) return;
  const it = ev.program[+row.dataset.i], f = e.target.dataset.f;
  it[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  if(f === "whenText") it.unknown = /non pubblicato|da definire/i.test(it.whenText);
  save();
});
$("progList").addEventListener("click", e => {
  const d = e.target.closest("[data-pdel]"); if(!d) return;
  ev.program.splice(+d.dataset.pdel, 1); drawProg(); save();
});

/* ---------- aggiornamenti ---------- */
let pendingPhoto = null;
$("u-photo").addEventListener("change", async e => {
  const f = e.target.files[0]; pendingPhoto = null; if(!f) return;
  try{ pendingPhoto = await resizeImage(f); }catch(err){ $("u-photo").value = ""; }
});
$("addUpd").addEventListener("click", () => {
  const text = $("u-text").value.trim(); if(!text){ $("u-text").focus(); return; }
  ev.updates.unshift({time: new Date().toTimeString().slice(0, 5), text, point: $("u-point").value || undefined, photo: pendingPhoto || undefined});
  $("u-text").value = ""; $("u-photo").value = ""; pendingPhoto = null;
  drawUpd(); save();
});
function drawUpd(){
  $("updList").innerHTML = ev.updates.map((u, i) => `<li><span class="upd"><time>${esc(u.time)}</time></span><span>${esc(u.text)}</span>
    ${u.photo ? `<img class="thumb" src="${u.photo}" alt="">` : ""}
    <button class="btn danger small-btn" data-udel="${i}" style="align-self:flex-start">Elimina</button></li>`).join("");
}
$("updList").addEventListener("click", e => { const d = e.target.closest("[data-udel]"); if(!d) return; ev.updates.splice(+d.dataset.udel, 1); drawUpd(); save(); });

/* ---------- pubblicazione ---------- */
function entry(){
  return {id: ev.id || slug(ev.title), title: ev.title, date: ev.date, place: ev.place, summary: ev.summary, file: `data/events/${ev.id || slug(ev.title)}.json`};
}
function drawEntry(){ if(ev) $("entryOut").value = JSON.stringify(entry(), null, 2); }
$("copyEntry").addEventListener("click", () => {
  const t = $("entryOut"); navigator.clipboard?.writeText(t.value).then(() => $("pubMsg").textContent = "Copiata.", () => { t.select(); $("pubMsg").textContent = "Testo selezionato: copialo."; });
});
$("download").addEventListener("click", () => {
  if(!ev.id) ev.id = slug(ev.title + "-" + (ev.date || "").slice(0, 4));
  const blob = new Blob([JSON.stringify(ev, null, 2)], {type: "application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = ev.id + ".json";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  $("saved").textContent = `File ${ev.id}.json scaricato.`;
});

init();
