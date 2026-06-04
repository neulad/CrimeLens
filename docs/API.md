# CrimeLens — API Reference

All routes served by the Elysia process on `http://localhost:3000` (or `BASE_URL` in production).

**HTML routes** return full server-rendered pages.
**API routes** under `/api/` return JSON.

---

## Page routes (HTML)

### `GET /`
Returns the map page. If a valid session cookie is present, the user's display name appears in the nav and the "📍 Report incident" button is visible on the map.

**Auth:** public
**Response:** `200 text/html`

---

### `GET /incidents/:id`

Full crime incident detail page.

**Auth:** public
**Params:**
| Param | Type | Description |
|---|---|---|
| `id` | UUID | Incident ID |

**Responses:**
- `200 text/html` — incident detail page
- `404 text/html` — "Incident not found" page (also returned for non-UUID IDs)

---

### `POST /incidents/:id/edit`

Save inline edits to an incident you reported (crime type, description, date+time). Backs the inline edit form on the detail page.

**Auth:** required (owner only)
**Content-Type:** `application/x-www-form-urlencoded`
**Body fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `crimeType` | string | yes | One of the crime-type values (see bottom) |
| `description` | string | yes | |
| `occurredAtDate` | string | yes | `YYYY-MM-DD` |
| `occurredAtTime` | string | no | `HH:MM`; defaults to `00:00` |

**Responses:**
- `302` redirect to `/incidents/:id` on success
- `302` redirect to `/auth` if not signed in
- `403 text/plain` if you are not the reporter
- `404 text/html` if the incident does not exist (or non-UUID id)

---

### `POST /incidents/:id/delete`

Delete an incident you reported. Ownership is verified server-side.

**Auth:** required (owner only)
**Responses:**
- `302` redirect to `/` on success
- `302` redirect to `/auth` if not signed in
- `403 text/plain` if you are not the reporter

---

### `GET /auth`

Sign-in page (enter your email to receive a code). Redirects to `/` if already signed in. Accepts an optional `?email=` query to pre-fill the field.

**Auth:** public
**Response:** `200 text/html`

---

### `POST /auth/send-code`

Email a 6-digit sign-in code to the address. Rate-limited to one code per 60 seconds per email.

**Auth:** public
**Content-Type:** `application/x-www-form-urlencoded`
**Body fields:**

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |

**Responses:**
- `200 text/html` — the verify-code page (on success)
- `200 text/html` — sign-in page with an error (e.g. rate-limited or invalid email)

---

### `GET /auth/verify`

Enter-code page. Requires `?email=` (redirects to `/auth` if missing).

**Auth:** public
**Response:** `200 text/html`

---

### `POST /auth/verify`

Verify the code and sign in. The account is created on first successful verification. Wrong codes increment an attempt counter; after 5 failures the code locks.

**Auth:** public
**Content-Type:** `application/x-www-form-urlencoded`
**Body fields:**

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `code` | string | yes |

**Responses:**
- `302` redirect to `/` on success (sets `session` cookie)
- `200 text/html` re-renders the verify page with an error (wrong/expired/locked code)

---

### `POST /auth/logout`

Sign out. Deletes the session from the database and clears the cookie.

**Auth:** required (no-op if anonymous)
**Response:** `302` redirect to `/`

---

### `GET /api/avatar/:userId`

Returns the user's cached DiceBear avatar SVG.

**Auth:** public
**Responses:**
- `200 image/svg+xml` (cached one year)
- `404 text/plain` for a non-UUID id or a user with no stored avatar

---

### `GET /profile` · `POST /profile` · `POST /profile/change-email` · `POST /profile/confirm-email`

Profile page and its actions: edit name + public contact handles, and change the account email via an OTP sent to the new address. All require a session (anonymous requests redirect to `/auth`). The email change is confirmed with `POST /profile/confirm-email` (`{ code }`), which verifies the OTP for the pending address and then swaps the account email.

---

## API routes (JSON)

### `GET /api/incidents`

Viewport + filter query. Used by `map.js` to populate the map.

**Auth:** public
**Query parameters:**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `bbox` | string | **yes** | — | `W,S,E,N` — four floats (lon/lat), comma-separated. Example: `-0.2,51.4,0.0,51.6` |
| `types` | string | no | all | Comma-separated crime types: `pickpocketing`, `bicycle_stolen`, `street_fight`, `robbery`, `street_scams` |
| `since` | string | no | `all` | One of: `30d`, `90d`, `1y`, `all` |
| `limit` | integer | no | `500` | Max `1000` |

**Example request:**
```
GET /api/incidents?bbox=-0.2,51.4,0.0,51.6&types=pickpocketing,robbery&since=90d
```

**Example response (`200 application/json`):**
```json
{
  "items": [
    {
      "id": "018f4b2e-1234-7abc-8def-000000000001",
      "crimeType": "pickpocketing",
      "occurredAt": "2025-11-14T18:32:00.000Z",
      "city": "London",
      "description": "Wallet lifted on a crowded Tube platform during rush hour.",
      "source": "SEEDED",
      "createdBy": null,
      "lat": 51.5079,
      "lng": -0.1283
    }
  ]
}
```

**Error responses:**
| Status | Body | Reason |
|---|---|---|
| `400` | `{ "message": "bbox must be W,S,E,N (four floats)" }` | Missing or malformed bbox |
| `400` | `{ "message": "bbox coordinates out of valid range" }` | Coordinates outside ±180/±90 |
| `400` | `{ "message": "limit must be a finite integer between 1 and 1000" }` | Invalid limit |
| `500` | `{ "message": "Internal server error" }` | Database error |

---

### `GET /api/incidents/feed`

City-filtered list for the sidebar feed (newest 50). Used when a city is selected.

**Auth:** public
**Query parameters:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `city` | string | **yes** | City name (case-insensitive match) |
| `types` | string | no | Same comma-separated crime types as above |
| `since` | string | no | `30d` / `90d` / `1y` / `all` |

**Response:** `200 application/json` — `{ "items": [ … ] }` (same item shape as `/api/incidents`). Returns `{ "items": [] }` when `city` is blank.

---

### `POST /api/incidents`

Report a new crime incident from the map. Requires an authenticated session.

**Auth:** required
**Content-Type:** `application/json`

**Request body:**
```json
{
  "lat": 51.5074,
  "lng": -0.1278,
  "crimeType": "robbery",
  "city": "London",
  "occurredAt": "2026-05-03T21:15:00+01:00",
  "description": "Phone snatched by a passing e-scooter rider near the station."
}
```

**Field validation:**

| Field | Type | Constraints |
|---|---|---|
| `lat` | number | −90 to 90 |
| `lng` | number | −180 to 180 |
| `crimeType` | string | One of: `pickpocketing`, `bicycle_stolen`, `street_fight`, `robbery`, `street_scams` |
| `city` | string | Any string (reverse-geocoded by Nominatim in the UI) |
| `occurredAt` | string | ISO datetime string (the UI sends date + time with the local UTC offset) |
| `description` | string | Non-empty after trimming |

**Success response (`200 application/json`):**
```json
{
  "id": "018f4b2e-abcd-7000-beef-000000000042"
}
```

**Error responses:**
| Status | Body | Reason |
|---|---|---|
| `401` | `{ "message": "Sign in to report incidents." }` | No valid session |
| `400` | `{ "message": "Description is required." }` | Empty description |
| `400` | `{ "message": "Invalid coordinates." }` | Lat/lng out of range |
| `400` | `{ "message": "Invalid crime type" }` | Unrecognised crime type |
| `500` | `{ "message": "Something went wrong." }` | Database error |

---

## Session cookie

All authenticated routes read the `session` cookie:

```
Cookie: session=<uuidv7-session-id>.<hmac-sha256-hex>
```

The HMAC is verified server-side using `SESSION_SECRET` from `.env` before the session row is looked up. An invalid or expired cookie is treated as anonymous (no error returned, just no user).

---

## Crime type values

| Value | Display label |
|---|---|
| `pickpocketing` | Pickpocketing |
| `bicycle_stolen` | Bicycle stolen |
| `street_fight` | Street fight |
| `robbery` | Robbery |
| `street_scams` | Street scam |

These are defined once in `src/modules/incidents/crime-types.ts` and enforced by the `crime_type_check` constraint in the database.
