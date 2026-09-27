# RADAR Eventi

Modulo della famiglia **RADAR**: mappa, programma e indicazioni per feste, sagre e mercati di paese.
Prima prova sul campo: **Market della Vendemmia, Castello di Montecavallo (Vigliano Biellese), 27 settembre 2026**.

## Cosa contiene

| File | A cosa serve |
|---|---|
| `index.html` | Elenco degli eventi del paese (oggi, in arrivo, passati) |
| `evento.html?id=...` | Pagina pubblica di un evento: mappa OpenStreetMap, "Dove sono" con GPS, cosa c'è adesso, programma, aggiornamenti dal posto con foto, contatti, sponsor, QR code |
| `admin.html` | Pannello organizzatori: dati evento, punti sulla mappa (tocca per aggiungere, trascina per spostare, "Aggiungi dove sono"), programma, aggiornamenti con foto, anteprima, scarica il file evento |
| `data/events.json` | Elenco degli eventi |
| `data/events/*.json` | Un file per evento |
| `css/`, `js/` | Stile e codice condivisi |

Nessuna installazione, nessun server: sono file statici, come Radar V2.

## Pubblicare su GitHub Pages
1. Su GitHub crea un repository nuovo, per esempio `Radar-Eventi` (account `matteomurdaca-art`).
2. Carica tutto il contenuto di questa cartella (Add file → Upload files), mantenendo le sottocartelle.
3. Settings → Pages → Branch `main`, cartella `/ (root)` → Save.
4. Dopo un paio di minuti il sito è su `https://matteomurdaca-art.github.io/Radar-Eventi/`.
5. Link diretto all'evento di prova: `…/Radar-Eventi/evento.html?id=montecavallo-vendemmia-2026`

## Aggiungere o modificare un evento (versione 1)
1. Apri `admin.html`, scegli l'evento o creane uno nuovo.
2. Compila, metti i punti sulla mappa, controlla con **Anteprima**.
3. **Scarica file evento** → caricalo nella cartella `data/events/` del repository.
4. Se l'evento è nuovo, copia la riga proposta in fondo al pannello dentro `data/events.json`.

La bozza resta salvata sul dispositivo in cui la stai scrivendo.

## Limiti di questa versione e prossimi passi
- **Pubblicazione manuale** (carica il file su GitHub). Prossimo passo: database **Supabase**, lo stesso scelto per Radar V2, così l'organizzatore pubblica con un tasto e gli aggiornamenti dal posto compaiono subito a tutti.
- **Accesso al pannello libero**: chiunque apra `admin.html` può preparare una bozza, ma non può pubblicarla senza accesso al repository. Con Supabase serviranno login per gli organizzatori.
- **Foto**: vengono ridotte e salvate dentro il file evento. Evitare foto in cui si riconoscono persone, soprattutto bambini.
- **Dati dell'evento di prova**: programma dal sito del castello; le posizioni dentro la tenuta sono indicative (bordo tratteggiato) e vanno sistemate trascinando i punti.

## Integrazione con RADAR
- Stesso marchio e stessa logica (foto + posizione + dashboard).
- Il Comune vede tutti gli eventi del paese in un unico elenco; in futuro nella stessa dashboard delle segnalazioni.
- Possibile fonte di ricavi: spazi sponsor per le attività locali sulla mappa dell'evento.
