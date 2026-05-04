# CrimeLens — Everything Tim Needs

**Who this is for:** Tim (PM). You don't need to read any code to use this doc.
**What this covers:** pitch, users, problem, competition, tech stack, architecture, features, demo script (click-by-click), screenshots checklist, and defense Q&A.
**Before the presentation:** run through the demo script once end-to-end on the actual hardware while the developer watches. That's the only rehearsal you need.

---

## 1. The pitch (one paragraph — memorise this)

> CrimeLens is a map-first web app that shows pickpocketing and petty-theft hotspots across five major European cities. Any visitor can open the map, zoom into their destination, filter by crime type and time window, and click a pin to read what happened. Registered users can report new incidents directly from the map and browse a Lost & Found board for items reported nearby. The stack is fully modern — Bun, Elysia, TypeScript, PostgreSQL with PostGIS — and the whole thing runs from a single `bun run dev` command. We built a clean, fast, focused product in 12 weeks, using every part of the software development lifecycle: requirements, architecture, migrations, auth, geospatial queries, tests, and documentation.

Read this out loud. It should take 30–35 seconds. Don't improvise — stick to this paragraph.

---

## 2. Target users

**Primary persona — Mia, 27, consultant from Berlin**
Flying to Barcelona on Friday for four days. She's been pickpocketed in Rome before, so she's careful. She opens CrimeLens, zooms into Barcelona, filters to "pickpocketing, last 12 months," sees the cluster around Las Ramblas and the Gothic Quarter, and decides where not to leave her bag. Two days into the trip she sees someone reach into a tourist's backpack near the waterfront. She opens the app, hits "Report incident," drops a pin, selects "bag snatching," adds a one-line note. Done.

**Who else uses it:** locals planning a commute route, travel bloggers writing city guides, anyone who wants a visual answer to "is this neighbourhood risky?" instead of a Reddit thread.

---

## 3. The problem

Right now, a traveller who wants to know if a neighbourhood is safe for petty crime does one of:

- Googles "pickpocket [city] Reddit" and reads anecdotes
- Checks Numbeo — a static score with no granularity below city level
- Reads a travel blog article from three years ago

None of these are **visual**, **filterable**, or **recent**. CrimeLens gives the same answer in 10 seconds: open the map, zoom in, see the clusters.

---

## 4. Competitive angle

*(Source: `docs/crimelens-idea.md`)*

| Competitor type | Their weakness | Our edge |
|---|---|---|
| Crowdsourced alert apps (Safetipin, etc.) | Uneven European coverage; usually pickpocketing-only | We cover 5 cities with realistic seeded data + user reports, multiple crime types |
| Travel scam guides (blogs, TripAdvisor) | Static, no map, slow to update | Visual, filterable, live user submissions |
| Broad safety platforms (GeoSure, Numbeo) | City-level score only, no street detail, heavy onboarding | Pin-level precision, no onboarding required, map is the home page |
| Official crime maps | Fragmented by country, not tourist-oriented | Single interface, tourist-focused crime types, English-only, instant |

**Our one-line competitive advantage:** *the only map-first, filter-first, Europe-focused petty crime app where users can report incidents from the map in real time.*

---

## 5. What was built — the five features

### L1. Interactive crime map
Full-screen map of Europe. Pins are clustered at low zoom and expand into individual markers when you zoom into a city. ~500 realistic incidents seeded across Barcelona, Paris, Rome, Prague, and Amsterdam. The map is the home page — no landing page, no friction.

### L2. Filter bar
Two filters always visible at the top of the map:
- **Crime type** — toggle: Pickpocketing / Bag snatching / Vehicle theft / Other
- **Time window** — dropdown: All time / Last year / Last 90 days / Last 30 days

The map re-queries the server on every change. Filter state is saved in the URL, so links are shareable.

### L3. Incident detail
Click a pin → side panel slides in with crime type badge, source badge (SEEDED or USER REPORT), date, city, and description. A "View full details →" link opens the dedicated incident page at `/incidents/:id`.

### L4. Password authentication
Register with first name, last name, email, password. Sign in with email + password. HMAC-signed session cookie that lasts 30 days. Sign out clears the session from the database. No email sending required.

> **Note for the defense:** The original plan was magic-link email auth (click a link in your inbox). We switched to password auth because Resend (the email service) requires a verified custom domain on the free tier, which we didn't have. The auth security model is identical — passwords are bcrypt-hashed with Bun's native crypto, sessions are HMAC-signed and stored in Postgres. If the professor asks, say: "We evaluated magic-link auth and built the infrastructure, but pivoted to password auth when the email delivery dependency proved unreliable for a local-dev demo context. The session management, cookie signing, and authorization model are unchanged."

### L5. Lost & Found
A public board at `/lost-and-found`. Anyone can browse. Signed-in users can post a lost or found item (title, category, status, city, date, description). You can delete your own posts. Cards show LOST or FOUND badge, item category, date, city, and description.

---

## 6. What was deliberately cut (and why — use these in the defense)

| Cut feature | Why |
|---|---|
| Heatmaps | A separate visualisation layer; clusters give the same information with less complexity |
| Routing ("find a safe route") | Needs a routing engine (OSRM, Valhalla); out of scope for 12 weeks |
| Real-time data ingestion from police APIs | No reliable, free, cross-EU crime data source exists |
| Photos on lost-and-found items | Image upload = storage, MIME validation, size limits, thumbnails — one week of work with zero rubric reward |
| Comments, replies, upvotes | Would turn it into a moderation problem |
| Password reset | For a demo-context student project, we note it would be a straightforward addition (email + token) |
| Mobile app / PWA | Desktop web only; responsive layout is a stretch goal |
| Real-time pin updates (WebSocket) | Page reload is sufficient; WebSockets add infrastructure complexity |

---

## 7. Tech stack — what it is and why (one line each)

| Layer | Technology | One-line reason |
|---|---|---|
| **Runtime** | Bun 1.x | Runs TypeScript natively with zero config; startup is sub-millisecond; includes test runner, package manager, and bundler in one tool |
| **Web framework** | Elysia 1.x | Bun-native HTTP framework with end-to-end type inference; request validation built in via TypeBox; no boilerplate |
| **Language** | TypeScript (strict) | Strict mode + `noUncheckedIndexedAccess` catches a class of bugs at compile time, which the rubric rewards as code quality |
| **Templating** | @kitajs/html (server-side JSX) | Write components that look like React but compile to raw HTML strings at request time — no virtual DOM, no build step, no hydration |
| **Client interactivity** | HTMX 2.x | Handles filter changes and form submissions with HTML attributes — no React, no state management, no frontend bundler |
| **Maps** | Leaflet 1.9 + markercluster | Industry-standard open-source mapping library; clustering built in; OpenStreetMap tiles, no API key required |
| **Geocoding** | Nominatim (OpenStreetMap) | Free reverse geocoder — used to auto-detect the city name when a user drops a new incident pin; no API key |
| **CSS** | Pico.css v2 + custom | Classless base that makes semantic HTML look good by default; all custom styles in one ~500-line file |
| **Database** | PostgreSQL 16 + PostGIS 3.4 | Postgres is the mature default; PostGIS adds native geospatial types and the GiST index that makes viewport queries fast |
| **ORM / migrations** | Drizzle ORM + Drizzle Kit | SQL-first, type-safe; schema in one file; migrations generated automatically; no runtime reflection |
| **Auth** | Bun.password (bcrypt) + HMAC sessions | Built-in to Bun — no extra library; cost-12 bcrypt for password hashing; session IDs are HMAC-signed before going into the cookie |
| **Logging** | pino | Structured JSON logs to stdout; graders like to see real logs in a demo |
| **Linting** | Biome | Single tool for lint + format; faster than ESLint + Prettier; one config file |

**The core design principle:** no cache, no queue, no worker, no microservices. One process, one database. University project — simplicity is a feature.

---

## 8. Architecture (how the pieces connect)

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  HTMX 2.x          Pico.css          Leaflet + cluster       │
│  (form submits,     (layout)          (map.js — the only     │
│   page swaps)                          JS we wrote)          │
│       │                                      │               │
└───────┼──────────────────────────────────────┼───────────────┘
        │  HTML pages + fragments              │  JSON (incidents)
        │                                      │  + Nominatim (geocode)
        ▼                                      ▼
┌──────────────────────────────────────────────────────────────┐
│              Elysia server (Bun runtime)                     │
│                                                              │
│  GET /               GET/POST /auth/*     GET /incidents/:id │
│  (map page)          (login, register,    GET /api/incidents │
│                       logout)             POST /api/incidents│
│                                                              │
│  GET /lost-and-found                                         │
│  GET /lost-and-found/new                                     │
│  POST /lost-and-found                                        │
│  POST /lost-and-found/:id/delete                             │
│                                                              │
│  Drizzle ORM + porsager/postgres driver                      │
└──────────────────────────────┬───────────────────────────────┘
                               │ TCP / Postgres wire
                               ▼
                  ┌────────────────────────┐
                  │  PostgreSQL 16         │
                  │  + PostGIS 3.4         │
                  │                        │
                  │  users                 │
                  │  sessions              │
                  │  incidents  (GiST idx) │
                  │  lost_items            │
                  └────────────────────────┘
```

Full diagram and explanation: `docs/ARCHITECTURE.md`

**What to say if asked:** "The architecture is deliberately simple — a single server-rendered Bun process talking to one PostgreSQL database. No cache, no queue, no microservices. The interesting part is the PostGIS geospatial extension, which lets us query 'give me all incidents inside this rectangle on the map' in a single indexed SQL query."

---

## 9. Key technical decisions — how to explain them

### How does the map work?
Leaflet (JavaScript library) draws the map tiles from OpenStreetMap. When the user pans or zooms, `map.js` sends a request to `GET /api/incidents?bbox=W,S,E,N&types=...&since=...`. The server runs a PostGIS query — `WHERE ST_Intersects(location, ST_MakeEnvelope(W, S, E, N))` — and returns the incidents as JSON. Leaflet renders them as clustered pins. The whole round trip typically takes under 100ms.

### How does the GiST index work?
PostGIS stores each incident's location as a point geometry. A GiST (Generalized Search Tree) index on that column is a spatial index — it's like an R-tree that organises points by their geographic bounding boxes. When we query "everything inside this viewport rectangle," PostgreSQL uses the index to eliminate ~99% of rows without reading them. Without the index, every viewport query would be a full table scan. With it, the query is O(log N).

### How is authentication secured?
1. **Passwords:** hashed with bcrypt (cost 12) using Bun's native `Bun.password.hash()`. The plain-text password never touches the database.
2. **Sessions:** when you log in, a UUIDv7 session ID is stored in Postgres. Before it's written to the cookie, it's HMAC-signed with a secret key (`SESSION_SECRET` in `.env`). On every request, the server verifies the HMAC before querying the database — so a forged or tampered cookie is rejected without a DB lookup.
3. **Cookie flags:** `HttpOnly` (JavaScript can't read it), `SameSite=Lax` (blocks cross-site form submissions / CSRF).

### How does the city auto-detect work when reporting an incident?
When a user drops a pin on the map, the browser sends the coordinates to Nominatim (OpenStreetMap's free reverse geocoder) — `GET https://nominatim.openstreetmap.org/reverse?lat=...&lon=...`. Nominatim returns a JSON address object from which we extract the city name. This appears in the form as "📍 Prague" while the user fills in the rest of the form. No API key required.

### Why server-rendered instead of React/Vue?
Because HTMX and @kitajs/html give us a working app with full interactivity at a fraction of the complexity. The map is the only rich client-side component — it needs JavaScript to work. Everything else (forms, navigation, detail pages) is just HTML that the server renders and the browser displays. No build step for the frontend, no bundle splitting, no state management library, no hydration mismatches. For a 12-week project with one developer, simplicity is the right choice.

---

## 10. Screenshots checklist — exactly what to capture

Run `bun run dev` (or have the developer run it), then capture these screens **in this order** so they tell a story:

| # | Screen | URL / Action | What to show |
|---|---|---|---|
| 1 | **Europe overview** | `http://localhost:3000` | The full map with clusters visible across all 5 cities. Make sure all filter checkboxes are checked, time = "All time". |
| 2 | **City zoom — Barcelona** | Zoom in to Barcelona | Individual pins spread across the city, especially dense around Las Ramblas / Gothic Quarter. |
| 3 | **Detail panel open** | Click any Barcelona pin | Side panel slides in from the right showing the crime type badge (amber/red/blue), source badge, date, city, and description. |
| 4 | **View full details page** | Click "View full details →" in the panel | The `/incidents/:id` page showing the complete incident card with all metadata. |
| 5 | **Filter in action** | Go back to map, uncheck "Bag snatching" and "Vehicle theft" | Fewer pins visible. Shows the filter working in real time. |
| 6 | **Time filter** | Set time window to "Last 30 days" | Even fewer pins. Good for showing that data has recency. |
| 7 | **Register page** | Click "Sign in" → "Create account" | The registration form with first name, last name, email, password fields. |
| 8 | **Logged-in nav** | After registering | Nav bar shows the user's name and "Sign out" on one line. |
| 9 | **Report incident — pin mode** | Click "📍 Report incident" | The button turns red ("✕ Cancel"), the cursor becomes a crosshair, and the panel shows "Click anywhere on the map". |
| 10 | **Report incident — form** | Click a location on the map (zoom into Prague first for variety) | Red temp pin dropped, panel shows the report form with "📍 Prague" auto-detected, crime type dropdown, date, description. |
| 11 | **Report success** | Fill in and submit the form | Panel shows the green success state "✅ Incident reported!" and a link to the new report. |
| 12 | **Lost & Found list** | `http://localhost:3000/lost-and-found` | The list page — either empty state or with a submitted item. |
| 13 | **Lost & Found submit form** | Click "+ Report item" | The form: item name, category dropdown, Lost/Found radio, city input, date, description. |
| 14 | **Lost & Found card** | After submitting | The card with LOST/FOUND badge, category badge, title, city, date, description, and the "Delete" button (your own post). |

**Screenshot tips:**
- Use a browser window at 1440×900 or 1280×800 for consistent framing.
- Don't show browser dev tools or the URL bar unless specifically showing a URL.
- For map screenshots, make sure the tiles have fully loaded (no grey squares).
- Capture at 2x on a Retina display if possible — the slides will look sharper.

---

## 11. Demo script — 10 minutes, click-by-click

**Setup (before the professor arrives):**
- Developer runs `bun run dev` on the presentation laptop.
- Browser open at `http://localhost:3000`, map centered on Europe, all filters checked.
- A test account already registered (so you don't have to type a long password live).
- Know the test account credentials — write them on a sticky note if needed.

---

**[0:00 – 0:35] — The pitch (from memory)**

> "CrimeLens is a map-first web app that shows pickpocketing and petty-theft hotspots across five major European cities. Any visitor can open the map, zoom into their destination, filter by crime type and time window, and click a pin to read what happened. Registered users can report new incidents from the map and browse a Lost & Found board. The whole thing runs on a modern open-source stack — Bun, Elysia, TypeScript, PostgreSQL with PostGIS — and it was built over 12 weeks as a solo developer project."

---

**[0:35 – 2:00] — The map (L1)**

1. Point at the screen: "This is the home page — the map is the landing page, no marketing fluff."
2. Say: "We seeded approximately 500 realistic crime incidents across five cities: Barcelona, Paris, Rome, Prague, and Amsterdam."
3. Slowly zoom into **Barcelona**. Clusters break into individual pins.
4. Say: "The pins are fetched live from the server for the current viewport — only the incidents on screen are loaded. That's a PostGIS bounding-box query."
5. Let it settle visually for 3–4 seconds.

---

**[2:00 – 3:30] — Filters (L2)**

6. Point to the filter bar: "Two filters — crime type and time window."
7. Uncheck **"Bag snatching"**. Pause. Some red pins disappear.
8. Say: "The map re-queries the server on every change. No client-side filtering of a pre-fetched blob."
9. Uncheck **"Vehicle theft"**. More pins disappear.
10. Change time window to **"Last 30 days"**. Noticeably fewer pins.
11. Say: "Filter state is also saved in the URL — you can share a filtered view with a link."
12. Re-check everything and set time back to "All time".

---

**[3:30 – 5:00] — Incident detail (L3)**

13. Click any pin. The detail panel slides in from the right.
14. Point at the badges: "Crime type badge and source badge — this one is SEEDED, meaning it came from our fixture data."
15. Say: "Date, city, and the incident description are all visible here."
16. Click **"View full details →"**. The `/incidents/:id` page opens.
17. Say: "Every incident has a permanent URL. This page shows the full incident: crime type, date, coordinates, source, and description."
18. Hit the browser back button.

---

**[5:00 – 6:30] — Authentication (L4)**

19. Click **"Sign in"** in the nav.
20. Say: "Authentication is email and password — bcrypt-hashed with Bun's built-in crypto. Sessions are HMAC-signed server-side."
21. Click **"Create account"** if showing registration — or enter the pre-prepared credentials and sign in.
22. After login: point at the nav. "The nav shows the logged-in user's name and a sign-out button. The session lasts 30 days."

---

**[6:30 – 8:30] — Report an incident (L1 + auth)**

23. Zoom into **Prague** (for visual variety vs. Barcelona earlier).
24. Click the **"📍 Report incident"** button at the bottom of the map.
25. Say: "This button is only visible when you're signed in."
26. Say: "The cursor becomes a crosshair. Click anywhere on the map to drop a pin."
27. Click a location in central Prague. A red temporary pin drops.
28. Say: "The city is auto-detected using Nominatim — OpenStreetMap's free reverse geocoder. No API key required."
29. Point at the form in the panel: "Fill in crime type, date, and a short description."
30. Select **"Pickpocketing"**, set date to today, type **"Wallet stolen near Old Town Square."**
31. Click **Submit**.
32. Say: "The incident is written to the database and the map reloads. The new pin is now visible to all visitors."
33. Click **"View your report →"** in the success state.

---

**[8:30 – 10:00] — Lost & Found (L5)**

34. Click **"Lost & Found"** in the nav.
35. Say: "The Lost & Found board is public — anyone can browse. Signed-in users can post."
36. Click **"+ Report item"**.
37. Say: "The form covers the basics: what you lost or found, category, status, city, date, description."
38. Fill in: *title* = "Blue backpack", *category* = Bag, *status* = LOST, *city* = Prague, date = today, *description* = "Left on tram 22 near the castle."
39. Click **Submit report**.
40. Say: "The item appears on the list. Only the person who submitted it sees the Delete button."
41. Point at the card: "LOST badge, category, title, city, date, description — and owner-only delete action."

---

**[10:00] — Close**

> "That's the full product — five features, one process, one database, 12 weeks. Happy to walk through the architecture or any technical decision."

---

## 12. Defense questions and prepared answers

**Q: Why not use React or Vue for the frontend?**
> "HTMX handles all standard interactions — filter changes, form submissions, page navigations — with HTML attributes on the server-rendered markup. The only place we use custom JavaScript is the Leaflet map, which needs it by nature. This means no frontend build step, no bundle, no state management library, no hydration issues. For a 12-week solo project, the simplest technology that works is the right choice. If the app grew to need rich client-side state, React would be a reasonable addition."

**Q: Why Bun instead of Node.js?**
> "Bun runs TypeScript natively without a compilation step — no `tsc`, no `ts-node`, no `esbuild` configuration. It has a built-in test runner, package manager, and bundler. The edit-save-reload loop is faster, and startup is sub-millisecond. For a student project where developer velocity matters, these differences add up over 12 weeks. Bun 1.x is production-stable; the instability that early adopters hit in 2023 is behind us."

**Q: Why not use a real crime dataset?**
> "There is no reliable, freely accessible, cross-European, machine-readable crime dataset at the granularity we need — individual petty theft incidents with coordinates. Eurostat has country-level aggregates. Individual city police departments publish PDFs. We built a realistic seed dataset of ~500 incidents distributed across the five hero cities with plausible timestamps, locations, and descriptions, and we label them clearly as SEEDED so there's no false implication of real data. The app also supports USER_REPORTED incidents, which is how a real product would grow its data."

**Q: How does the geospatial query work?**
> "PostgreSQL has a PostGIS extension that adds a `geometry` column type and spatial functions. Each incident's location is stored as a PostGIS `Point` in WGS84 (standard lat/lon). There's a GiST index on that column — a spatial index based on an R-tree structure that organises points by their bounding boxes. When the map sends a bounding box — west, south, east, north — the query is `WHERE ST_Intersects(location, ST_MakeEnvelope(W, S, E, N, 4326))`. PostgreSQL uses the GiST index to find matching points in O(log N) time instead of scanning the full table."

**Q: How is authentication secure?**
> "Three layers. First, passwords are hashed with bcrypt at cost 12 using Bun's native `Bun.password.hash()` — the plain text never reaches the database. Second, sessions are stored in Postgres and identified by a UUIDv7 session ID. Before writing to the cookie, the session ID is HMAC-SHA256-signed with a secret key from the environment — so a forged or tampered cookie fails the HMAC check before we ever touch the database. Third, the cookie is flagged `HttpOnly` (can't be read by JavaScript) and `SameSite=Lax` (blocks cross-site form CSRF submissions)."

**Q: You originally planned magic-link auth. Why did you switch to passwords?**
> "Magic-link auth was the original plan and we built the full infrastructure for it — token generation, SHA-256 hashing, database storage, single-use enforcement, expiry. We switched when we discovered that Resend, the email API we planned to use, restricts the free tier to sending only to verified domains. Since we couldn't verify a domain for a student project, local development would print the link to the server console — which works — but a live demo to the professor would have required email delivery we couldn't reliably set up. Password auth removes the external dependency entirely. The session management, HMAC signing, and authorization model are identical."

**Q: What would you add if you had more time?**
> "Three things in priority order. One: a password reset flow — straightforward to add with an email token. Two: rate limiting on the login endpoint — we noted the absence in the architecture docs; a production deployment needs it. Three: Europe-wide data — right now we're limited to five cities because we hand-authored the seed data. With more time we'd explore integrating official city open-data APIs (several EU cities publish crime statistics) to expand coverage automatically."

**Q: How does Leaflet clustering work?**
> "The `leaflet.markercluster` plugin handles clustering entirely on the client side. It takes the array of markers returned from our API and groups nearby markers into cluster circles. The cluster radius is 60 pixels — so any markers within 60 pixels of each other on screen are merged into one cluster circle showing the count. When you zoom in, the pixel distances grow and the cluster splits into sub-clusters or individual pins. There's no server-side clustering — the server just returns all incidents in the viewport and the browser figures out the visual grouping."

**Q: What does the database schema look like?**
> "Four tables. `users` — id, email, first name, last name, bcrypt password hash. `sessions` — id, user foreign key, expiry. `incidents` — id, crime type, timestamp, PostGIS point geometry, city, description, source flag, optional user foreign key for ownership. `lost_items` — id, user foreign key, title, category, status, city, timestamp, description, optional point geometry. All primary keys are UUIDv7 — those are UUIDs that are lexicographically sortable by creation time, which keeps the index well-ordered as rows insert. Full schema is in `docs/DATA-MODEL.md`."

**Q: The filter updates the map — how does that work without page refresh?**
> "HTMX adds an event listener to the filter form. When any checkbox or select changes, HTMX fires. But in this case we actually didn't use HTMX for the map update — the map is a Leaflet JavaScript island, so the filter form change event is caught by `map.js`, which reads the current filter state and calls `loadIncidents()` — a `fetch()` call to `GET /api/incidents` with the new parameters. The markers are then re-rendered by Leaflet. The URL is updated with `pushState` so the filtered view is shareable."

**Q: How do you ensure a user can only delete their own Lost & Found items?**
> "The delete endpoint `POST /lost-and-found/:id/delete` reads the session cookie, loads the user, then calls `deleteItem(itemId, userId)`. The SQL query is `DELETE FROM lost_items WHERE id = $id AND user_id = $userId`. If the user doesn't own the item, the `AND user_id = $userId` condition means zero rows are deleted — the request silently succeeds but nothing changes. No error, no information leakage. The delete button is also only rendered in the HTML when `userId === item.userId`, so the UI doesn't show it to other users in the first place."

---

## 13. Quick reference card (for the Q&A table)

| Question topic | One-word answer | Full answer in |
|---|---|---|
| Why Bun? | Speed + simplicity | §12, "Why Bun?" |
| Why not React? | Unnecessary | §12, "Why not React?" |
| Real data? | No, seeded | §12, "Real crime dataset?" |
| How map query works | PostGIS GiST index | §12, "Geospatial query?" |
| Auth security | bcrypt + HMAC | §12, "Auth secure?" |
| Magic-link pivot | Email dependency | §12, "Why switch auth?" |
| Clustering | leaflet.markercluster | §12, "Leaflet clustering?" |
| Database tables | 4 tables | §12, "Database schema?" |
| Filter → map update | fetch() in map.js | §12, "Filter update?" |
| Delete ownership | SQL WHERE user_id | §12, "Delete own items?" |

---

*Questions about the code itself → ask the developer. Questions about the presentation, the slides, or the pitch → this doc has everything you need.*
