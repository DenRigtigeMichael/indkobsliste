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

## Afdelinger (kategorier)

Afdelinger og farver gemmes i **SQLite** (på Railway i volume `/data`), så begge telefoner ser ændringer med det samme. I bunden af listen findes **Kategorier**, hvor I kan oprette, omdøbe, farvelægge og flytte afdelinger.

Første gang appen starter, seeds kataloget fra **`kategorier.ini`** (eller indbyggede standarder):

```
Grønt
Tørvare
Hygiejne
Mælkeprodukter
Animal
Drikkevare/Snacks
Husholdning
```

Gamle varer med `Vin` / `Kød/fisk` omdøbes automatisk til `Drikkevare/Snacks` / `Animal`.

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

## Sprog

- Standard: **dansk** på `indkoebsliste.dk` / Railway / localhost.
- Engelsk: vælg under **Indstillinger** (tandhjul), gemmes i `localStorage` på enheden.
- Fremtidigt engelsk domæne (fx `grocerylist.*`): hostname sætter standard til engelsk automatisk — intet domænekøb i denne release; bare skift i indstillinger eller peg et engelsk hostnavn på samme app.

## Kryptering (client-side)

- Varenavne krypteres i browseren med **AES-GCM** før de gemmes.
- Nøglen udledes med **PBKDF2** fra husstandskoden + et per-husstand `crypto_salt` (server) + app-pepper.
- SQLite gemmer ciphertext (`enc1.<iv>.<ciphertext>`); udvikler/host ser ikke plaintext varenavne i DB-dumps.
- Første load af gamle plaintext-lister migrerer automatisk (client encrypt + rewrite).
- Afdelingsnavne (fælles katalog) er stadig plaintext — de er ikke husstands-hemmeligheder.
- **Begrænsning:** alle med husstandskoden (inkl. koden i URL `/h/KODE`) kan dekryptere. Kryptering beskytter mod DB-adgang uden koden, ikke mod dem der har linket.

## Bemærkninger (v1-defaults)

- Ingen tung auth — adgang er kendskab til husstandskoden/linket.
- Data ligger i SQLite (lokalt eller på Railway Volume) — egnet til single-node.
- Frekvens kræver ≥2 køb før estimat; I kan altid tilføje varer manuelt.
