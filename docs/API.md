# CrimeLens — API Reference

All routes served by the Elysia process on `http://localhost:3000` (or `BASE_URL` in production).

**HTML routes** return full pages or HTMX-swappable fragments.
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

### `GET /lost-and-found`

Reverse-chronological list of all lost and found item reports. Any logged-in user sees a "Delete" button on their own items.

**Auth:** public
**Response:** `200 text/html`

---

### `GET /lost-and-found/new`

Report a new lost or found item. Requires authentication.

**Auth:** required (redirects to sign-in wall if anonymous)
**Response:** `200 text/html` — submission form

---

### `POST /lost-and-found`

Submit a new lost or found item report.

**Auth:** required
**Content-Type:** `application/x-www-form-urlencoded`
**Body fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Max 120 chars |
| `category` | string | yes | One of: `phone`, `bag`, `wallet`, `keys`, `documents`, `other` |
| `status` | string | yes | `LOST` or `FOUND` |
| `city` | string | yes | Free text, max 100 chars |
| `occurredAt` | date string | yes | ISO date `YYYY-MM-DD` |
| `description` | string | yes | Max 1000 chars |

**Responses:**
- `302` redirect to `/lost-and-found` on success
- `200 text/html` re-renders the form with an error banner if validation fails

---

### `POST /lost-and-found/:id/delete`

Delete an item you own. Ownership is verified server-side; other users' IDs are silently ignored.

**Auth:** required
**Params:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Lost item ID |

**Responses:**
- `302` redirect to `/lost-and-found`
- `401 text/plain` if not signed in

---

### `GET /auth`

Login page with a link to the registration page.

**Auth:** public
**Response:** `200 text/html`

---

### `POST /auth/login`

Sign in with email and password.

**Auth:** public
**Content-Type:** `application/x-www-form-urlencoded`
**Body fields:**

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

**Responses:**
- `302` redirect to `/` on success (sets `session` cookie)
- `200 text/html` re-renders the login form with error on invalid credentials

---

### `GET /auth/register`

Registration form.

**Auth:** public
**Response:** `200 text/html`

---

### `POST /auth/register`

Create a new account and immediately sign in.

**Auth:** public
**Content-Type:** `application/x-www-form-urlencoded`
**Body fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `email` | string | yes | Must be unique |
| `password` | string | yes | Min 8 chars |

**Responses:**
- `302` redirect to `/` on success (sets `session` cookie, auto-login)
- `200 text/html` re-renders the register form with error on duplicate email or invalid input

---

### `POST /auth/logout`

Sign out. Deletes the session from the database and clears the cookie.

**Auth:** required (no-op if anonymous)
**Response:** `302` redirect to `/`

---

## API routes (JSON)

### `GET /api/incidents`

Viewport + filter query. Used by `map.js` to populate the map.

**Auth:** public
**Query parameters:**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `bbox` | string | **yes** | — | `W,S,E,N` — four floats (lon/lat), comma-separated. Example: `2.0,41.2,2.3,41.5` |
| `types` | string | no | all | Comma-separated crime types: `pickpocketing`, `bag_snatching`, `theft_from_vehicle`, `other` |
| `since` | string | no | `all` | One of: `30d`, `90d`, `1y`, `all` |
| `limit` | integer | no | `500` | Max `1000` |

**Example request:**
```
GET /api/incidents?bbox=2.0,41.2,2.3,41.5&types=pickpocketing,bag_snatching&since=90d
```

**Example response (`200 application/json`):**
```json
{
  "items": [
    {
      "id": "018f4b2e-1234-7abc-8def-000000000001",
      "crimeType": "pickpocketing",
      "occurredAt": "2025-11-14T18:32:00.000Z",
      "city": "Barcelona",
      "lat": 41.3809,
      "lng": 2.1228,
      "description": "Victim's wallet taken on Las Ramblas while distracted by a street performer.",
      "source": "SEEDED"
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

### `POST /api/incidents`

Report a new crime incident from the map. Requires an authenticated session.

**Auth:** required
**Content-Type:** `application/json`

**Request body:**
```json
{
  "lat": 41.3851,
  "lng": 2.1734,
  "crimeType": "bag_snatching",
  "city": "Barcelona",
  "occurredAt": "2026-05-03",
  "description": "Bag grabbed from chair outside a café near the waterfront."
}
```

**Field validation:**

| Field | Type | Constraints |
|---|---|---|
| `lat` | number | −90 to 90 |
| `lng` | number | −180 to 180 |
| `crimeType` | string | One of: `pickpocketing`, `bag_snatching`, `theft_from_vehicle`, `other` |
| `city` | string | Any string (auto-populated by Nominatim in the UI) |
| `occurredAt` | string | ISO date or datetime string |
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

| Value | Display label | UI badge color |
|---|---|---|
| `pickpocketing` | Pickpocketing | Amber |
| `bag_snatching` | Bag snatching | Red |
| `theft_from_vehicle` | Vehicle theft | Blue |
| `other` | Other | Gray |
