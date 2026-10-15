# Indkøbsliste

Fælles indkøbsliste til et par — dansk UI, afdelinger, live afkrydsning via polling, og frekvensfremhævning når det er tid at købe igen.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- SQLite (`better-sqlite3`) — lokalt `data/indkobsliste.db`, på Railway typisk `/data/indkobsliste.sqlite`
- PWA-klar (web manifest + Apple touch icon)

## Kør lokalt

```bash
npm install
npm run dev
```

Åbn [http://127.0.0.1:43145](http://127.0.0.1:43145).

## Sådan virker det

1. **Opret fælles liste** på forsiden — I får en husstandskode (fx `7K2M9P`).
2. Del **koden eller linket** `/h/KODE` med din partner.
3. Begge ser samme liste. Afkrydsninger synkroniseres ca. hvert 2. sekund.
4. Træk-og-slip for at sortere inden for afdelingen, tryk på navnet for at rette/skifte afdeling, eller fjern med skraldespanden — rækkefølgen gemmes og synces.
5. Når en vare markeres købt, gemmes tidspunktet. Efter mindst to køb estimeres typisk interval (median). Når tiden er gået, **fremhæves varen med farve** (gul ≈ snart, koral ≈ bør købes). Afkryds/fjern flueben pr. vare via checkbox — varerne bliver på listen.

## Afdelinger (rediger selv)

Afdelinger læses fra filen **`kategorier.ini`** i projektets rodmappe (én linje pr. afdeling, rækkefølge = butiksrækkefølge).

Standardindhold:

```
Grønt
Tørvare
Hygiejne
Mælkeprodukter
Animal
Drikkevare/Snacks
Husholdning
```

**Sådan ændrer du dem**

1. Åbn `kategorier.ini` i en teksteditor.
2. Tilføj, omdøb eller flyt linjer (linjer med `#` er kommentarer).
3. Gem filen og **genstart** appen:
   ```bash
   # Stop med Ctrl+C, start igen:
   npm run dev
   ```

Gamle varer med afdelingen `Vin` omdøbes automatisk til `Drikkevare/Snacks`.
Gamle varer med afdelingen `Kød/fisk` omdøbes automatisk til `Animal`.

## Scripts

| Script          | Beskrivelse                                      |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | Dev-server på port **43145**                     |
| `npm run build` | Production build                                 |
| `npm run start` | Production (`0.0.0.0`, port fra `PORT` eller 43145) |
| `npm run lint`  | ESLint                                           |

## Deploy på Railway (Hobby)

Ingen separat database-service — SQLite på et Volume er nok.

1. Push projektet til **GitHub** og opret et nyt projekt i [Railway](https://railway.app) → **Deploy from GitHub**.
2. Railway bygger med Nixpacks (`npm ci --include=dev --include=optional` → `npm run build` = `next build --webpack`) og starter med `npm start` (lytter på `PORT`). Production build bruger PostCSS (`@tailwindcss/postcss`) i stedet for Turbopack CSS — undgår `lightningcss.linux-x64-gnu.node` module-not-found når optional native deps mangler/fejler.
3. Tilføj et **Volume** og mount det på **`/data`** (persistens mellem deploys).
4. Valgfri env (anbefalet eksplicit):
   - `DATABASE_PATH=/data/indkobsliste.sqlite`  
   Hvis `/data` findes (eller `RAILWAY_ENVIRONMENT` er sat), bruges `/data/indkobsliste.sqlite` automatisk uden env.
5. Deploy. Åbn den offentlige Railway-URL. Opret husstand → del linket `/h/KODE` med din partner.

**Bemærk:** Ét app-instans (single replica) — SQLite tåler ikke flere samtidige writere på tværs af containere. Hold **replicas = 1**.

Lokalt uden Railway:

```bash
npm run build
npm start
# eller med custom sti:
DATABASE_PATH=./data/indkobsliste.db npm start
```

## Bemærkninger (v1-defaults)

- Ingen tung auth — adgang er kendskab til husstandskoden/linket.
- Data ligger i SQLite (lokalt eller på Railway Volume) — egnet til single-node.
- Frekvens kræver ≥2 køb før estimat; I kan altid tilføje varer manuelt.
