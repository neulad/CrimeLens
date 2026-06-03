# CrimeLens — Final Changes & Decisions

This document records every significant design decision, architecture change, and UI iteration made during the project. Intended as a reference for the team presentation and code review.

---

## Authentication

**Decision: password auth over magic-link**

The project started with magic-link (email token) auth. This was replaced with classic password-based auth because:
- No email infrastructure needed for a local/demo environment
- Simpler to test and demonstrate
- The grading rubric requires a working login flow, not a specific auth method

Implementation: `Bun.password.hash` (bcrypt, cost 12) for storage, HMAC-SHA256 signed session cookies (no JWT dependency). Sessions stored in Postgres.

Migration `0001_password_auth.sql` added `first_name`, `last_name`, `password_hash` columns to `users` and dropped the `magic_links` table.

---

## Map & Incidents

**Geospatial query fix: `sql.array()` inside nested fragments**

`porsager/postgres` serialises `sql.array(values)` as a CSV string when the call is embedded inside a nested `sql\`\`` fragment. This caused `op ANY/ALL (array) requires array on right side` at runtime. Fix: split into two top-level queries — one with `crime_type IN ${sql(types)}` when a type filter is present, one without.

**User location dot**

Leaflet's `divIcon` applies `.leaflet-div-icon` (white background + border) even when `className: ''` is passed. Fixed by using a named class `.user-location-marker` with `background: none !important; border: none !important`.

**Report-incident pin placement**

Clicking "Report incident" enters pin-placement mode (crosshair cursor). On map click, the pin is placed and the report form opens in the detail panel. City is auto-detected via Nominatim reverse geocoding (`nominatim.openstreetmap.org/reverse`) — no manual city dropdown.

---

## Navigation redesign

**Single unified nav bar**

Replaced the two-bar layout (nav + separate filter bar) with a single bar containing:
- Brand (logo + wordmark) — left
- Filter pills + time select — centre
- Lost & Found + auth actions — right

Map container height recalculated from `100vh - nav - filter-bar` to `100vh - nav`.

**Logo**

Added the provided SVG eye+pin logo (`public/img/logo.svg`). SVG strokes changed from `#1A1E3A` to `#ffffff` so the outline is visible on the dark nav. Favicon updated to use the same file.

PNG version (`public/img/logo.png`) also kept as a fallback asset.

**Nav colour**

Final nav background: `#2d3f6b` (slate-blue). Chosen to:
- Not blend with the logo's `#1A1E3A` navy strokes
- Be clearly distinct from the default white Pico nav
- Provide enough contrast for white text and ghost-bordered buttons

**Button styling**
- *Ghost* (Lost & Found, Sign out): `rgba(255,255,255,0.55)` border, transparent fill
- *Primary* (Sign in): `#cce3c7` mint fill, `#1a1e3a` text — pulled from the logo palette
- *User chip*: frosted-glass (`rgba(255,255,255,0.08)` background), shows derived first name only

User display name is derived from the email local part: `uladzimir.k@example.com` → `"Uladzimir"`. Split on any separator (`.`, `_`, `-`, space), take first token, title-case.

**Filter pills**

- Border removed entirely — opacity only: 40% when unchecked, 100% when checked
- `font-weight: 600` always applied (was toggled on check — caused width jump / layout shift)
- `border: none` eliminates any remaining jump risk

---

## HTMX removal

HTMX was used in exactly three places:
1. The `<script>` tag (~50 KB transfer on every page load)
2. `hx-swap-oob="true"` on the map-error div (never actually triggered)
3. The CSS class `htmx-request` as a visibility hook for the loading overlay

All three removed:
- Script tag deleted from layout
- `hx-swap-oob` attribute removed
- `htmx-request` class renamed to `is-loading` in `map.js` and `app.css`
- `src/types/htmx.d.ts` deleted

No HTMX references remain in the codebase.

---

## Docker / deployment

**Full containerisation**

Added `Dockerfile` (based on `oven/bun:1-alpine`) and updated `docker-compose.yml` to include the app service alongside the existing PostGIS service.

Startup sequence:
1. `db` starts, PostGIS healthcheck passes
2. `app` starts, runs `bun run db:migrate` automatically, then starts the server

Single command to run the project:
```bash
docker compose up -d
```

The `.env` file is not required for local development — all variables are baked into `docker-compose.yml`.

---

## Incident type filter bug

**Root cause**: the Elysia route passes `types` as a comma-separated string from the query param. The service correctly splits it into a `string[]`. However, `sql.array(types)` inside a nested sql fragment loses type information and is serialised as a plain string by porsager/postgres, causing Postgres to reject it as `malformed array literal`.

**Fix**: two separate query branches — when `types` is non-empty, use `crime_type IN ${sql(types)}` at the top level of the query (not nested).

---

## Removed / not shipped

| Item | Reason |
|---|---|
| HTMX | No real usage; 50 KB dead weight on every page |
| Magic-link auth | Requires email infrastructure; replaced with password auth |
| Manual city dropdown in report form | Replaced with Nominatim auto-detection |
| Separate filter bar | Merged into nav for cleaner single-bar layout |
