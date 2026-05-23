# EZBassGrooves

Mobile-first PWA for jotting down bass grooves and riffs the easy way.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Features

- **Library** — multiple named grooves, rename, duplicate, delete, JSON import/export
- **Main view** — continuous 4-string staff (G, D, A, E top to bottom) like real sheet music; tap a bar to zoom in
- **Bar view** — full tab + rhythm notation; ◀ ▶ to move between bars
- **Edit mode** — tap **Edit**, append rhythm slots (♩ ♪ ♬ rest), tap a string cell to enter fret (0–24 or X), **Save** to commit or **Cancel** to discard
- **Root note** — set per bar in edit mode (top right)

Data is stored in `localStorage` under `ezbassgrooves.v1` (legacy `groovemaker.v1` data is migrated automatically on first load).
