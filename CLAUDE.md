# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make install   # npm install
make dev       # vite dev server at http://localhost:5173
make build     # tsc && vite build → dist/
make clean     # rm dist/ and node_modules/
```

No test suite exists.

## Architecture

React + TypeScript SPA served by Vite. Routing is handled by `react-router-dom`. There is **no separate backend**: all data comes from static JSON files under `public/data/` that are pre-fetched at build time.

**Pages:**
- `/` → `src/pages/Home.tsx` — hero landing with a CTA link to `/discografia`
- `/discografia` → `src/pages/Discography.tsx` — three-step drill-down (albums → tracks → track detail) driven by a local `step` state (`"albums" | "tracks" | "detail"`)
- `/ultima-misa` → `src/pages/UltimaMisa.tsx` — "La última misa" setlist game (three phases: `intro → game → results`)

**Data flow:**
1. `src/api.ts` exports typed fetch helpers (`fetchAlbums`, `fetchTracks`, `fetchTrack`, `fetchNormalization`) that load JSON from `/data/*.json`.
2. `Discography.tsx` owns all drill-down state and calls the API helpers directly. Filtering (singles, en-vivo) is applied client-side via `src/lib/filterAlbums.ts`.
3. `normalization.json` provides the global min/max popularity range used by `src/lib/normalizeTrack.ts` to render a popularity bar in `TrackDetail`, and by `src/lib/misaGame.ts` to normalize track popularities for scoring.

**Key files:**
- `vite.config.ts` — Vite config
- `src/api.ts` — TypeScript interfaces (`Album`, `Track`, `TrackFull`, `AlbumFilters`) + fetch helpers (read from `public/data/`)
- `src/App.tsx` — `BrowserRouter` + `Layout` (sticky navbar with active-link highlighting) + route definitions
- `src/pages/Home.tsx` — landing page
- `src/pages/Discography.tsx` — step state machine (albums → tracks → detail) with breadcrumb navigation
- `src/pages/UltimaMisa.tsx` — game page; owns all phase/spinner/setlist/score state
- `src/components/` — `AlbumGrid`, `TrackList`, `TrackDetail` (one component per discography step)
- `src/components/misa/` — game-specific components: `AlbumSpinner`, `TrackPicker`, `Setlist`, `Results`; shared styles in `misa.css`
- `src/lib/filterAlbums.ts` — `filterSingles` / `filterEnVivo` pure filter helpers
- `src/lib/normalizeTrack.ts` — popularity normalization helper
- `src/lib/misaGame.ts` — game logic: `loadGameAlbums`, `pickRandomAlbum`, `computeScore`, slot multipliers, scoring constants (`GameAlbum`, `GameTrack`, `Mode`, `ScoreResult`)
- `public/data/` — `albums.json`, `tracks.json`, `normalization.json` (static, pre-built)

## Navbar

The sticky header (`Layout` in `App.tsx`) shows the logo on the left and nav links (`Inicio`, `Discografía`, `La última misa`) on the right. The active route link is styled red (`var(--accent)`); inactive links are white. No back button — navigation within `/discografia` uses in-page breadcrumbs rendered by `Discography.tsx`.

## La última misa game

The game lives at `/ultima-misa` and walks the player through three phases:

1. **Intro** — mode selection (`easy` shows popularity hints; `hard` hides them). Calls `loadGameAlbums()` which fetches all studio albums (filtered via `filterSingles` + `filterEnVivo`), deduplicates by name, and builds `GameAlbum[]` with normalized track popularities.
2. **Game** — the player spins an album roulette wheel (`AlbumSpinner`) up to 5 times, picks one track per spin (`TrackPicker`), and assigns it to one of 5 setlist slots (`Setlist`). Slot 0 = Apertura (×1.5), slot 2 = Pogo (×2), slot 4 = Cierre (×1.5).
3. **Results** — `computeScore` sums `popularity × multiplier` across slots, scales to a max attendance of 400,000. A special win condition fires if the Pogo slot has "Ji Ji Ji" and the popularity sum exceeds 400.

Scoring constants and the winning track name are intentionally kept internal to `misaGame.ts` and must not be surfaced in the UI.

## Environment

No runtime environment variables are needed to run the app — data is served from static files. The `.env` / Spotify credentials were used during the data-fetch build step and are not required for the dev server.
