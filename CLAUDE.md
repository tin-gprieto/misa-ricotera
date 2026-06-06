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

**Data flow:**
1. `src/api.ts` exports typed fetch helpers (`fetchAlbums`, `fetchTracks`, `fetchTrack`, `fetchNormalization`) that load JSON from `/data/*.json`.
2. `Discography.tsx` owns all drill-down state and calls the API helpers directly. Filtering (singles, en-vivo) is applied client-side via `src/lib/filterAlbums.ts`.
3. `normalization.json` provides the global min/max popularity range used by `src/lib/normalizeTrack.ts` to render a popularity bar in `TrackDetail`.

**Key files:**
- `vite.config.ts` — Vite config
- `src/api.ts` — TypeScript interfaces (`Album`, `Track`, `TrackFull`, `AlbumFilters`) + fetch helpers (read from `public/data/`)
- `src/App.tsx` — `BrowserRouter` + `Layout` (sticky navbar with active-link highlighting) + route definitions
- `src/pages/Home.tsx` — landing page
- `src/pages/Discography.tsx` — step state machine (albums → tracks → detail) with breadcrumb navigation
- `src/components/` — `AlbumGrid`, `TrackList`, `TrackDetail` (one component per step)
- `src/lib/filterAlbums.ts` — `filterSingles` / `filterEnVivo` pure filter helpers
- `src/lib/normalizeTrack.ts` — popularity normalization helper
- `public/data/` — `albums.json`, `tracks.json`, `normalization.json` (static, pre-built)

## Navbar

The sticky header (`Layout` in `App.tsx`) shows the logo on the left and nav links (`Inicio`, `Discografía`) on the right. The active route link is styled red (`var(--accent)`); inactive links are white. No back button — navigation within `/discografia` uses in-page breadcrumbs rendered by `Discography.tsx`.

## Environment

No runtime environment variables are needed to run the app — data is served from static files. The `.env` / Spotify credentials were used during the data-fetch build step and are not required for the dev server.
