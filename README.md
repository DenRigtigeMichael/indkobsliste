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
| `npm run test:admin` | Sammentællinger og admin-adgangskode       |

## Deploy på Railway (Hobby)

Ingen separat database-service — SQLite på et Volume er nok.

1. Push projektet til **GitHub** og opret et nyt projekt i [Railway](https://railway.app) → **Deploy from GitHub**.
2. Railway bygger med Nixpacks (`npm ci --include=dev --include=optional` → `npm run build` = `next build --webpack`) og starter med `npm start` (lytter på `PORT`). Production build bruger PostCSS (`@tailwindcss/postcss`) i stedet for Turbopack CSS — undgår `lightningcss.linux-x64-gnu.node` module-not-found når optional native deps mangler/fejler.
3. Tilføj et **Volume** og mount det på **`/data`** (persistens mellem deploys).
4. Valgfri env (anbefalet eksplicit):
   - `DATABASE_PATH=/data/indkobsliste.sqlite`  
   Hvis `/data` findes (eller `RAILWAY_ENVIRONMENT` er sat), bruges `/data/indkobsliste.sqlite` automatisk uden env.
   - `ADMIN_PASSWORD` — lang tilfældig adgangskode til ejersiden `/admin`. Uden den er siden lukket. Se [Admin](#admin-ejer).
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

- Standard efter hostnavn (første besøg / ingen override):
  - **engelsk** på `householdlist.eu` / `www.householdlist.eu`
  - **dansk** på `indkoebsliste.dk` / `www.indkoebsliste.dk`, Railway (`*.railway.app`) og localhost
- Override: vælg under **Indstillinger** (tandhjul) — gemmes i `localStorage` på enheden og vinder over hostname.

## Kryptering (client-side)

- Varenavne krypteres i browseren med **AES-GCM** før de gemmes.
- Nøglen udledes med **PBKDF2** fra husstandskoden + et per-husstand `crypto_salt` (server) + app-pepper.
- SQLite gemmer ciphertext (`enc1.<iv>.<ciphertext>`); udvikler/host ser ikke plaintext varenavne i DB-dumps.
- Første load af gamle plaintext-lister migrerer automatisk (client encrypt + rewrite).
- Afdelingsnavne (fælles katalog) er stadig plaintext — de er ikke husstands-hemmeligheder.
- **Begrænsning:** alle med husstandskoden (inkl. koden i URL `/h/KODE`) kan dekryptere. Kryptering beskytter mod DB-adgang uden koden, ikke mod dem der har linket.

## Admin (ejer)

`/admin` viser kun sammentællinger af **husstande** (ikke enheder eller personer):

- **Husstande i alt**
- **Aktive seneste 7 dage** — rullende vindue på 7 døgn, UTC. En husstand tæller, når dens liste er blevet åbnet (`GET /api/households/:code`), også uden ændringer.
- **Aktive denne ISO-uge** — mandag 00:00 UTC til næste mandag. Samme åbning tæller.
- **Nye denne ISO-uge** — husstande oprettet i den uge.
- **Seneste 8 ISO-uger** — antal forskellige husstande med aktivitet pr. uge.

Tidspunktet gemmes i `households.last_seen_at` og i `household_weeks` (én række pr. husstand pr. ISO-uge), højst hvert 15. minut, så polling ikke skriver ved hvert kald. Et ugeskifte gemmes med det samme.

Eksisterende husstande udfyldes én gang ud fra `households.created_at`, `items.created_at` / `items.updated_at` og `purchases.purchased_at`. Siden og `GET /api/admin/stats` viser ingen husstandskoder og ingen varenavne.

Adgang kræver env-variablen **`ADMIN_PASSWORD`** (lang tilfældig streng). Sæt den under Railway → Variables. Mellemrum omkring værdien ignoreres. Uden variablen (eller hvis den er tom) er `/admin` og `/api/admin/*` lukket — der er intet login, og stats kan ikke hentes. Med variablen sættes et **httpOnly**-cookie (12 timer, `SameSite=Lax`) efter login. Skift adgangskoden for at ugyldiggøre gamle sessions.

Lokalt:

```bash
ADMIN_PASSWORD='en-lang-tilfaeldig-kode' npm run dev
```

Åbn `/admin`. Uden variablen står der, at admin er slået fra, og `/api/admin/stats` svarer 404.

## Bemærkninger (v1-defaults)

- Ingen tung auth — adgang er kendskab til husstandskoden/linket.
- Data ligger i SQLite (lokalt eller på Railway Volume) — egnet til single-node.
- Frekvens kræver ≥2 køb før estimat; I kan altid tilføje varer manuelt.
