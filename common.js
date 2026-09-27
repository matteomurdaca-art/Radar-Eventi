/* RADAR EVENTI — funzioni condivise */
const CATS = {
  evento:    {label:"Eventi",     icon:"★", color:"--c-evento"},
  cibo:      {label:"Cibo",       icon:"🍴", color:"--c-cibo"},
  parcheggio:{label:"Parcheggi",  icon:"P", color:"--c-parcheggio"},
  servizi:   {label:"Servizi",    icon:"+", color:"--c-servizi"},
  ingresso:  {label:"Ingressi",   icon:"→", color:"--c-ingresso"},
  info:      {label:"Info",       icon:"i", color:"--c-info"},
  sponsor:   {label:"Sponsor",    icon:"€", color:"--c-sponsor"}
};

const RADAR_LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="var(--glow)" stroke-width="2" opacity=".35"/><circle cx="20" cy="20" r="12" fill="none" stroke="var(--glow)" stroke-width="2" opacity=".6"/><circle cx="20" cy="20" r="6" fill="none" stroke="var(--glow)" stroke-width="2"/><path d="M20 20 L34 9" stroke="var(--glow)" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="20" r="2.4" fill="var(--glow)"/></svg>`;

function topbar(active){
  return `<div class="topbar"><div class="in">
    <a class="brand" href="index.html">${RADAR_LOGO}<div><b>RADAR</b><br><span>Eventi</span></div></a>
    <nav class="toplinks">
      ${active!=="index"?`<a class="btn ghost small-btn" href="index.html">Eventi</a>`:""}
      ${active!=="admin"?`<a class="btn ghost small-btn" href="admin.html">Organizzatori</a>`:""}
    </nav></div></div>`;
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const catColor = cat => getComputedStyle(document.documentElement).getPropertyValue((CATS[cat]||CATS.info).color).trim();

async function loadJSON(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok) throw new Error("Impossibile leggere " + url);
  return r.json();
}

/* Date e orari */
const GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function dateLong(iso){const d=new Date(iso+"T12:00");return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;}
function dateRange(ev){
  if(!ev.dateEnd || ev.dateEnd===ev.date) return dateLong(ev.date);
  return `dal ${dateLong(ev.date)} al ${dateLong(ev.dateEnd)}`;
}
function itemStart(ev,it){return it.start ? new Date((it.day||ev.date)+"T"+it.start) : null;}
function itemEnd(ev,it){return it.end ? new Date((it.day||ev.date)+"T"+it.end) : null;}

/* Stato dell'evento rispetto a un momento t */
function eventStatus(ev,t){
  const today=ymd(t), last=ev.dateEnd||ev.date;
  if(today<ev.date) return "futuro";
  if(today>last) return "passato";
  return "oggi";
}

/* Link indicazioni */
const mapsLink = (lat,lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

/* Ridimensiona una foto caricata e la restituisce come data URL JPEG */
function resizeImage(file, maxSide=1280, quality=.78){
  return new Promise((resolve,reject)=>{
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      const k=Math.min(1,maxSide/Math.max(img.width,img.height));
      const c=document.createElement("canvas"); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg",quality));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Foto non leggibile"));};
    img.src=url;
  });
}

/* Icona Leaflet per un punto */
function pinIcon(p){
  const cat=CATS[p.cat]||CATS.info;
  return L.divIcon({className:"", iconSize:[34,34], iconAnchor:[17,34], popupAnchor:[0,-30],
    html:`<div class="pin${p.approx?" approx":""}" style="background:${catColor(p.cat)}"><i>${esc(p.label||cat.icon)}</i></div>`});
}

/* Livello mappa OpenStreetMap */
function osmLayer(){
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
}

/* App installabile: registra il service worker */
if ("serviceWorker" in navigator) { window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {})); }
