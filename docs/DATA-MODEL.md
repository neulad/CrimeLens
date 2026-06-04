# CrimeLens — Data Model (Presentation Guide)

> **For the presenter:** this explains what the app stores and how it all
> connects. Each section has a line you can say out loud, then the detail.

---

## 1. In one sentence

> 🎤 *"The database has four main tables: people who use the app (users), their login sessions, the one-time email codes we send them, and the crime incidents that show up on the map. Everything else builds on those."*

---

## 2. The four tables at a glance

```
   users  ───────────────┐  a person who uses the app
     │                   │
     │ owns              │ reports
     ▼                   ▼
 sessions            incidents  ────►  shown as pins on the map
 (who is logged       (one row = one
  in right now)        reported crime)

 email_otps  ──►  the 6-digit codes we email for sign-in
                  (not tied to one user — a code can be sent
                   before the account even exists)
```

> 🎤 *"A user can have several login sessions and can report many incidents. Each incident remembers who reported it — or marks it as sample data."*

---

## 3. Each table, in plain English

### 👤 `users` — the people
Stores one row per person: their **email**, **name**, an optional **profile picture**, and optional **contact details** (WhatsApp, Telegram, Facebook, phone) so others could reach them. Accounts are created automatically the first time someone signs in.

### 🔑 `sessions` — who's currently logged in
When you sign in, we create a session that lasts **30 days**. The browser holds a secure token that points to it, so you stay logged in between visits. Signing out deletes the session.

### 📧 `email_otps` — the login codes
Each time someone requests a sign-in code, we store it here (in **scrambled/hashed** form, never plain text) with a **15-minute expiry**. We also count wrong guesses and **lock the code after 5 failed attempts** to stop guessing.

### 📍 `incidents` — the crimes on the map
The heart of the app. Each row is one reported incident:
- **what** happened — the crime type (pickpocketing, bicycle stolen, street fight, robbery, street scam)
- **when** it happened
- **where** it happened — an exact map location (longitude/latitude)
- the **city**, a short **description**
- whether it's **sample data** or a **real user report**, and **who** reported it

> 🎤 *"The location isn't just text — it's a real geographic point, which is what lets us ask the database 'give me everything inside this part of the map' instantly."*

---

## 4. The diagram (ERD)

```
┌────────────────────────────┐
│           users            │
│  id            (unique)    │
│  email         (unique)    │
│  first_name, last_name     │
│  avatar (profile picture)  │
│  contact_* (whatsapp,…)    │
│  created_at                │
└───────┬───────────────┬────┘
        │ 1-to-many     │ 1-to-many
        ▼               ▼
┌───────────────┐   ┌────────────────────────────┐
│   sessions    │   │         incidents          │
│  id           │   │  id                         │
│  user_id  ───►│   │  crime_type                 │
│  expires_at   │   │  occurred_at  (when)        │
│  created_at   │   │  location     (map point) ★ │
└───────────────┘   │  city                       │
                    │  description                │
┌────────────────┐  │  source (sample / real)     │
│   email_otps   │  │  created_by ──► users.id    │
│  email         │  │  created_at                 │
│  code (hashed) │  └────────────────────────────┘
│  expires_at    │
│  attempts      │   ★ stored with PostGIS so the map
└────────────────┘     can search by area, fast.
```

> 🎤 *"Lines mean 'belongs to': a session and an incident each belong to a user. The star on `location` is the special map-aware column."*

---

## 5. Why a special database for the map?

Normal databases store text and numbers. A crime map needs to answer *"what's inside this rectangle of the map?"* thousands of times as the user pans around. **PostGIS** (the map add-on for PostgreSQL) stores real geographic points and has a special index that makes those "what's in this area" questions near-instant — even with hundreds of incidents.

> 🎤 *"That's the one genuinely clever piece: we use a geographic database so the map stays fast as you move around."*

---

## 6. How the data is set up and kept consistent

- The structure is defined in a series of ordered **`.sql` migration files**. Running them in order builds the database from scratch — so anyone on the team gets the exact same setup.
- The app **seeds ~450 sample incidents across 40 cities** so the map looks alive in the demo.
- Sample rows are marked `SEEDED`; anything a real user reports is marked `USER_REPORTED` — so we can always tell them apart.

> 🎤 *"To set up a teammate's machine, the database rebuilds itself from these files automatically — no manual steps."*
