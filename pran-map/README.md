# Pran Execution Map

Standalone map app showing every outlet visited by "pran"-role reps (from the
main Fieldlenz/CamTag app), as points on a MapTiler map. Click an outlet to
see its captured POSM/category/SKU photos, execution verdict (good/bad), and
other details, with a toggle to switch between Pran's own display and the
competitor's at the same outlet.

Deployed as its **own Vercel project**, separate from the main app. It never
talks to the database or Google Drive directly — its server routes proxy the
main app's `/api/pran-map/*` endpoints using a shared secret, so that secret
and the main app's credentials never reach the browser.

## How it fits together

```
Browser  ──>  pran-map app (this project)
                 │  /api/outlets   ─┐
                 │  /api/photo/:id ─┤  server-side fetch, x-pran-map-key header
                 ▼                  ▼
          Main app (camtag):  /api/pran-map/outlets
                               /api/pran-map/photo/:id
                                 │
                                 ▼
                           Postgres + Google Drive
```

A password gate (`MAP_PASSWORD`) protects every page and API route here
except `/login` and `/api/login` — see `src/middleware.ts`.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in MAIN_APP_URL, PRAN_MAP_API_KEY, MAP_PASSWORD, COOKIE_SECRET
npm run dev
```

`PRAN_MAP_API_KEY` must match the main app's own `PRAN_MAP_API_KEY` env var.
`MAIN_APP_URL` must be a URL this app's server can reach the main app at
(its Vercel production URL in production; `http://localhost:3000` if running
the main app locally too).

## Deploying to Vercel

This folder is its own Vercel project, rooted here (not at the repo root):

```bash
npm install --global vercel@latest   # if not already installed
vercel login
cd pran-map
vercel link        # creates/links a new Vercel project for this folder
vercel env add MAIN_APP_URL production
vercel env add PRAN_MAP_API_KEY production
vercel env add MAP_PASSWORD production
vercel env add COOKIE_SECRET production
vercel --prod
```

Also set the same four env vars for the `preview`/`development` targets if
you want preview deployments to work. In the main app's own Vercel project,
set `PRAN_MAP_API_KEY` to the same value used above.
