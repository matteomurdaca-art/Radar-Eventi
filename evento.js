/* RADAR EVENTI — pagina pubblica di un evento */
document.getElementById("top").innerHTML = topbar("evento");

const params = new URLSearchParams(location.search);
const eventId = params.get("id");
const isPreview = params.has("preview");
let EV = null, map = null, markers = {}, meMarker = null, filter = "all";

async function getEvent(){
  if(isPreview){
    try{ const d = localStorage.getItem("radar-eventi-bozza"); if(d) return JSON.parse(d); }catch(e){}
    throw new Error("Nessuna bozza da mostrare. Aprila dal pannello organizzatori.");
  }
  const index = await loadJSON("events.json");
  const entry = index.events.find(e => e.id === eventId) || (!eventId && index.events[0]);
  if(!entry) throw new Error("Evento non trovato. Controlla il link o torna all'elenco degli eventi.");
  return loadJSON(entry.file);
}

function point(id){ return EV.points.find(p => p.id === id); }

function render(){
  document.title = `${EV.title} · Radar Eventi`;
  const app = document.getElementById("app");
  const usedCats = [...new Set(EV.points.map(p => p.cat))];
  app.innerHTML = `
    <header style="display:flex;flex-direction:column;gap:6px;padding-top:18px">
      <span class="eyebrow">${esc(dateRange(EV))}</span>
      <h1>${esc(EV.title)}</h1>
      <span class="muted">${esc(EV.place)}${EV.address ? " · " + esc(EV.address) : ""}</span>
      ${EV.facts?.length ? `<div class="facts">${EV.facts.map(f => `<span class="fact">${esc(f)}</span>`).join("")}</div>` : ""}
      ${EV.notice ? `<div class="note">${isPreview ? "<strong>Anteprima della bozza.</strong> " : ""}${esc(EV.notice)}</div>` : ""}
    </header>

    <section class="card" aria-live="polite" id="now"></section>

    <section>
      <h2>Mappa</h2>
      ${usedCats.length > 1 ? `<div class="chips" role="group" aria-label="Filtra i punti">
        <button class="chip" data-f="all" aria-pressed="true">Tutto</button>
        ${usedCats.map(c => `<button class="chip" data-f="${c}" aria-pressed="false"><span class="dot" style="background:${catColor(c)}"></span>${CATS[c]?.label || c}</button>`).join("")}
      </div>` : ""}
      <div id="map" class="map" role="region" aria-label="Mappa dell'evento"></div>
      <div class="map-tools">
        <button class="btn" id="locate">📍 Dove sono</button>
        <button class="btn ghost" id="recenter">Centra sull'evento</button>
        <span class="small" id="gpsMsg" aria-live="polite"></span>
      </div>
      ${EV.points.some(p => p.approx) ? `<span class="small">I punti con il bordo tratteggiato hanno una posizione indicativa.</span>` : ""}
      <ul class="list" id="points"></ul>
    </section>

    ${EV.updates?.length ? `<section>
      <h2>Aggiornamenti dal posto</h2>
      <ul class="list feed">${EV.updates.map(u => `<li>
        <span class="upd"><time>${esc(u.time)}</time></span>
        <span>${esc(u.text)}</span>
        ${u.photo ? `<img src="${u.photo}" alt="${esc(u.text)}" loading="lazy">` : ""}
        ${u.point && point(u.point) ? `<button class="btn ghost small-btn" data-goto="${u.point}" style="align-self:flex-start">Vedi sulla mappa</button>` : ""}
      </li>`).join("")}</ul>
    </section>` : ""}

    <section>
      <h2>Programma</h2>
      <ul class="list prog" id="prog"></ul>
    </section>

    ${EV.todo?.length ? `<section class="card" style="border-style:dashed">
      <span class="eyebrow">Informazioni in arrivo</span>
      <ul style="margin:0;padding-left:1.1em">${EV.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    </section>` : ""}

    ${EV.contacts?.length ? `<section class="card">
      <h2>Contatti</h2>
      ${EV.contacts.map((c,i) => `<div class="row" style="justify-content:space-between">
        <span>${esc(c.label)}<br><strong id="ct${i}" style="user-select:all">${esc(c.value)}</strong></span>
        <button class="btn ghost small-btn" data-copy="ct${i}">Copia</button></div>`).join("")}
      <span class="small" id="copyMsg" aria-live="polite"></span>
    </section>` : ""}

    <section class="sponsor">
      <span class="eyebrow">Sponsor</span>
      ${EV.sponsors?.length
        ? EV.sponsors.map(s => `<div><strong>${esc(s.name)}</strong> <span class="small">${esc(s.desc || "")}</span></div>`).join("")
        : `<strong>Il tuo bar o negozio qui</strong><span class="small">Le attività della zona possono comparire sulla mappa e sostenere l'evento.</span>`}
    </section>

    <section class="card">
      <h2>Condividi l'evento</h2>
      <span class="small">Inquadra il codice o stampalo sui manifesti.</span>
      <div class="qr" id="qr"></div>
      <div class="row"><strong id="shareUrl" style="user-select:all;word-break:break-all">${esc(location.href.replace(/[?&]preview\b/, ""))}</strong>
        <button class="btn ghost small-btn" data-copy="shareUrl">Copia link</button></div>
    </section>

    <footer>
      ${EV.organizer ? `<span>Organizza: ${esc(EV.organizer)}</span>` : ""}
      ${EV.source ? `<span>Fonte: <a href="${esc(EV.source.url)}" target="_blank" rel="noopener">${esc(EV.source.label)}</a></span>` : ""}
      <span>Mappa © OpenStreetMap. Indicazioni con Google Maps. Radar Eventi.</span>
    </footer>`;

  drawMap(); drawPoints(); drawProgram(); drawNow(); drawQR(); wire();
}

function drawMap(){
  map = L.map("map", {zoomControl:true}).setView(EV.center, EV.zoom || 17);
  osmLayer().addTo(map);
  EV.points.forEach(p => {
    const m = L.marker([p.lat, p.lon], {icon: pinIcon(p), title: p.name}).addTo(map);
    m.bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.desc || "")}${p.approx ? "<br><i>Posizione indicativa</i>" : ""}<br><a href="${mapsLink(p.lat,p.lon)}" target="_blank" rel="noopener">Portami qui</a>`);
    markers[p.id] = m;
  });
}

function applyFilter(){
  EV.points.forEach(p => {
    const show = filter === "all" || p.cat === filter;
    const m = markers[p.id];
    if(show && !map.hasLayer(m)) m.addTo(map);
    if(!show && map.hasLayer(m)) map.removeLayer(m);
  });
  document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.f === filter));
  document.querySelectorAll("#points li").forEach(li => li.hidden = !(filter === "all" || li.dataset.cat === filter));
}

function drawPoints(){
  document.getElementById("points").innerHTML = EV.points.map(p => `<li data-cat="${p.cat}">
    <div class="row" style="padding:12px 14px;flex-wrap:nowrap;align-items:flex-start">
      <span class="badge" style="background:${catColor(p.cat)}">${esc(p.label || CATS[p.cat]?.icon || "•")}</span>
      <div style="flex:1;min-width:0"><strong>${esc(p.name)}</strong>${p.approx ? ` <span class="small">(indicativo)</span>` : ""}<br><span class="small">${esc(p.desc || "")}</span>
        <div class="row" style="margin-top:6px"><button class="btn ghost small-btn" data-goto="${p.id}">Sulla mappa</button>
        <a class="btn small-btn" href="${mapsLink(p.lat,p.lon)}" target="_blank" rel="noopener">Portami qui</a></div></div>
    </div></li>`).join("");
}

function whenLabel(it){
  if(it.allDay) return {t:"Tutto il giorno", unk:false};
  if(it.start) return {t: it.start + (it.end ? "–" + it.end : ""), unk:false};
  return {t: it.whenText || "Orario da definire", unk: !!it.unknown};
}

function drawProgram(t = new Date()){
  const status = eventStatus(EV, t);
  document.getElementById("prog").innerHTML = EV.program.map(it => {
    const w = whenLabel(it), end = itemEnd(EV,it);
    const past = status === "passato" || (end && end <= t);
    const p = it.point && point(it.point);
    return `<li class="${past ? "past" : ""}">
      <span class="when${w.unk ? " unk" : ""}">${esc(w.t)}</span>
      <span class="what">${esc(it.what)}</span>
      <span class="desc">${esc(it.desc || "")}${p ? ` · <a href="#" data-goto="${p.id}">${esc(p.name)}</a>` : ""}</span>
    </li>`;
  }).join("");
}

function drawNow(){
  const t = new Date(), status = eventStatus(EV, t), el = document.getElementById("now");
  let html = "";
  if(status === "futuro"){
    const days = Math.round((new Date(EV.date+"T00:00") - new Date(ymd(t)+"T00:00")) / 86400000);
    html = `<div class="row"><span class="pill next">${days === 1 ? "Domani" : "Tra " + days + " giorni"}</span><strong>${esc(EV.title)}</strong></div><span class="small">${esc(dateRange(EV))}</span>`;
  } else if(status === "passato"){
    html = `<strong>L'evento è terminato</strong><span class="small">Grazie a chi c'era. Guarda gli altri eventi in programma.</span>`;
  } else {
    const timed = EV.program.filter(it => it.start);
    const live = timed.filter(it => itemStart(EV,it) <= t && (!itemEnd(EV,it) || t < itemEnd(EV,it)));
    const next = timed.filter(it => itemStart(EV,it) > t).sort((a,b) => itemStart(EV,a) - itemStart(EV,b))[0];
    const allDay = EV.program.filter(it => it.allDay || (!it.start && !it.unknown));
    html = `<div class="row"><span class="pill live">Oggi</span><strong>${esc(EV.title)} è in corso</strong></div>`;
    live.forEach(it => html += `<div class="row"><span class="pill live">Ora</span><span><strong>${esc(it.what)}</strong> <span class="small">fino alle ${esc(it.end || "—")}</span></span></div>`);
    if(next){ const m = Math.round((itemStart(EV,next) - t) / 60000);
      html += `<div class="row"><span class="pill next">Prossimo</span><span><strong>${esc(next.what)}</strong> <span class="small">${m < 60 ? "tra " + m + " min" : "alle " + esc(next.start)}</span></span></div>`; }
    if(allDay.length) html += `<span class="small">Durante la giornata: ${allDay.map(it => esc(it.what) + (it.whenText ? " (" + esc(it.whenText.toLowerCase()) + ")" : "")).join(" · ")}</span>`;
  }
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">${html}</div>`;
  drawProgram(t);
}

function drawQR(){
  const el = document.getElementById("qr");
  if(typeof QRCode === "undefined"){ el.hidden = true; return; }
  new QRCode(el, {text: location.href.replace(/[?&]preview\b/, ""), width: 160, height: 160, colorDark: "#0A0F14", colorLight: "#FFFFFF"});
}

function goto(id){
  const p = point(id); if(!p) return;
  if(filter !== "all" && p.cat !== filter){ filter = "all"; applyFilter(); }
  document.getElementById("map").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center"});
  map.setView([p.lat, p.lon], Math.max(map.getZoom(), 18));
  markers[p.id].openPopup();
}

function distance(a, b){
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dLat = toR(b[0]-a[0]), dLon = toR(b[1]-a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function locate(){
  const msg = document.getElementById("gpsMsg");
  if(!("geolocation" in navigator)){ msg.textContent = "Il telefono non permette di leggere la posizione."; return; }
  msg.textContent = "Cerco la tua posizione…";
  navigator.geolocation.watchPosition(pos => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if(!meMarker){
      meMarker = L.marker(ll, {icon: L.divIcon({className:"", html:'<div class="me"></div>', iconSize:[18,18], iconAnchor:[9,9]}), title:"Sei qui"}).addTo(map);
      map.setView(ll, Math.max(map.getZoom(), 17));
    } else meMarker.setLatLng(ll);
    const d = distance(ll, EV.center);
    msg.textContent = d < 150 ? "Sei nell'area dell'evento." : `Sei a ${d < 1000 ? Math.round(d/10)*10 + " m" : (d/1000).toFixed(1).replace(".", ",") + " km"} dall'evento.`;
  }, err => {
    msg.textContent = err.code === 1 ? "Posizione non autorizzata: consenti l'accesso nelle impostazioni del browser." : "Posizione non disponibile, riprova tra poco.";
  }, {enableHighAccuracy: true, maximumAge: 10000, timeout: 20000});
}

function wire(){
  document.getElementById("locate").addEventListener("click", locate);
  document.getElementById("recenter").addEventListener("click", () => map.setView(EV.center, EV.zoom || 17));
  document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => { filter = c.dataset.f; applyFilter(); }));
  document.getElementById("app").addEventListener("click", e => {
    const g = e.target.closest("[data-goto]"); if(g){ e.preventDefault(); goto(g.dataset.goto); }
    const c = e.target.closest("[data-copy]");
    if(c){
      const el = document.getElementById(c.dataset.copy), txt = el.textContent, msg = document.getElementById("copyMsg");
      const done = m => { if(msg) msg.textContent = m; else c.textContent = "Copiato"; };
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done("Testo selezionato: copialo dal menu del telefono."); };
      try{ navigator.clipboard.writeText(txt).then(() => done("Copiato: " + txt), fallback); }catch(err){ fallback(); }
    }
  });
  setInterval(drawNow, 60000);
}

getEvent().then(ev => { EV = ev; render(); })
  .catch(err => { document.getElementById("app").innerHTML = `<div class="note" style="margin-top:24px">${esc(err.message)}</div><a class="btn" href="index.html">Tutti gli eventi</a>`; });
