# CrimeLens — Architecture (Presentation Guide)

> **For the presenter:** this doc is written to be read out loud. Each section
> starts with a plain-English summary you can say, followed by the detail if
> someone asks. You don't need to be a developer to explain it.

---

## 1. What CrimeLens is — in one sentence

> 🎤 *"CrimeLens is a web app that shows where petty crimes happen across European cities on an interactive map. You open it, zoom into a city, and see pins for incidents like pickpocketing or bike theft. Signed-in users can report new incidents themselves."*

---

## 2. The big picture

CrimeLens has three parts that talk to each other: the **browser** (what the user sees), the **server** (the brains), and the **database** (where everything is stored).

```
        ┌─────────────────────────────┐
        │          BROWSER            │   What the user sees:
        │   • The map (Leaflet)       │   a full-screen map with
        │   • Sidebar, filters, forms │   clickable crime pins.
        └──────────────┬──────────────┘
                       │  asks for pages and data
                       │  (over the internet)
                       ▼
        ┌─────────────────────────────┐
        │      SERVER (Bun + Elysia)  │   The brains:
        │   • Builds the web pages    │   decides what to show,
        │   • Answers data requests   │   checks who is logged in,
        │   • Checks logins           │   saves new reports.
        └──────────────┬──────────────┘
                       │  reads / writes records
                       ▼
        ┌─────────────────────────────┐
        │   DATABASE (PostgreSQL +    │   The filing cabinet:
        │   PostGIS for map data)     │   stores users, incidents,
        │   • users, incidents, …     │   and their map locations.
        └─────────────────────────────┘
```

> 🎤 *"It's the classic three-layer setup: the browser shows things, the server makes decisions, and the database remembers everything. They run together in Docker, so the whole thing starts with one command."*

---

## 3. How a request flows (walk-through)

A good thing to demo live. Example: **opening the map and seeing pins.**

1. The user opens the site → the **server** builds the map page and sends it to the browser.
2. The map loads and asks: *"what incidents are inside the area I'm currently looking at?"*
3. The **server** receives that request with the map's coordinates, asks the **database** for matching incidents, and sends them back as data.
4. The map draws a **pin** for each one, grouping nearby pins into **clusters** so it stays readable.
5. Click a pin → the detail panel opens with the crime type, date, and description.

> 🎤 *"As you pan or zoom, the map keeps asking the server only for the incidents in the current view — so it stays fast even with hundreds of records."*

**Reporting an incident** follows the same idea in reverse: a signed-in user clicks the map to drop a pin, fills a short form, and the server saves it to the database. It also instantly pushes the new incident to anyone else who has the map open (a live "real-time" update).

---

## 4. The building blocks (how the code is organized)

The server is split into clear sections, each responsible for one thing:

| Section | Plain-English job |
|---|---|
| **pages** | The home/map page itself. |
| **incidents** | Everything about crime reports: list them for the map, show one in detail, create / edit / delete, and the live feed. |
| **auth** | Signing in and staying signed in (the email-code login). |
| **profile** | The user's profile: name, contact details, changing email. |

> 🎤 *"We kept the code organized by feature — one folder for the map data, one for logins, one for profiles — so it's easy to find things and easy to explain."*

---

## 5. Technology choices — and why (the "explain your decisions" slide)

| Area | What we used | Why we chose it |
|---|---|---|
| **Language / server** | TypeScript on **Bun + Elysia** | Modern, fast, lightweight; no heavy enterprise framework to set up. |
| **Map** | **Leaflet** + marker clustering + OpenStreetMap | The standard open-source mapping library; free, no API key. |
| **Database** | **PostgreSQL + PostGIS** | Postgres is rock-solid; the PostGIS add-on understands *map locations*, which is the heart of this app. |
| **Pages** | Server-rendered HTML (JSX templates) | Simple and fast — no separate front-end app or build step to manage. |
| **Login** | **Email one-time codes (OTP)** | No passwords to store or leak; you just get a 6-digit code by email. |
| **City search** | **Photon** (search) + **Nominatim** (pin → city) | Free map-search services; integrating external services is part of the brief. |
| **Packaging** | **Docker Compose** | The whole app + database start with one command on any machine. |

> 🎤 *"Our guiding principle was 'modern but stable, and lightweight.' Every choice is open-source, free, and quick to run locally — which matters for a 12-week team project."*

---

## 6. Things examiners might ask

- **"Is it actually working?"** Yes — it runs in Docker, loads ~450 seeded incidents across 40 cities, and you can report, edit, and delete live in the demo.
- **"How do logins work without passwords?"** You enter your email, we send a 6-digit code, you type it back. The code expires in 15 minutes and locks after 5 wrong tries.
- **"What's the 'real-time' part?"** When one user reports an incident, it appears on everyone else's map instantly, using a live WebSocket connection.
- **"What external systems does it integrate with?"** Map tiles (OpenStreetMap), two geocoding services (Photon + Nominatim), and email sending (for the login codes).

---

*See `DATA-MODEL.md` for what the database actually stores.*
