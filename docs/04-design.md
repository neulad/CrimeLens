# CrimeLens — Design Specification

**Status:** LOCKED  
**Owner:** solo developer (me + Claude)  
**Date locked:** 2026-04-11  
**Review:** 7-pass design review completed (gstack /plan-design-review)  
**Design score:** 3/10 → 9/10 after this document  
**Layout variant:** B — Top Filter Bar (chosen 2026-04-11, supersedes sidebar layout)  

This document is the UI/UX source of truth for all five locked features (L1–L5).
It specifies layout, hierarchy, interaction states, visual tokens, and anti-patterns.
Any implementation decision not covered here defaults to Pico.css semantics + system
font + plain HTML.

---

## 0. App type and design philosophy

**Classifier: APP UI.** CrimeLens is a task-focused, data-dense map application.
Not a marketing page. Not a dashboard. A tool.

The rules that follow are APP UI rules:
- Calm surface hierarchy, strong typography, few colors.
- Cards only where the card IS the interaction.
- Utility language in copy — orientation, status, action. No brand aspiration.
- Subtraction default: if a UI element doesn't earn its pixels, cut it.

**Guiding constraint:** Pico.css + ~100 lines of custom CSS. Write semantic HTML.
Override Pico's CSS variables for brand tokens. Do not fight Pico's defaults —
work with them.

---

## 1. Design tokens

Override these CSS variables in `public/css/app.css` at `:root`:

```css
:root {
  /* Pico.css overrides */
  --pico-primary:            #2563eb;
  --pico-primary-hover:      #1d4ed8;
  --pico-secondary:          #6b7280;
  --pico-border-radius:      0.375rem;   /* slightly tighter than Pico default */

  /* Layout */
  --nav-height:              56px;
  --filter-bar-height:       48px;
  --detail-panel-width:      320px;

  /* Badge geometry */
  --badge-radius:            0.25rem;
  --badge-padding:           0.2rem 0.5rem;
  --badge-font-size:         0.75rem;
  --badge-font-weight:       600;

  /* Crime type badges (muted tones, not fluorescent) */
  --badge-pickpocketing-bg:  #fef3c7;
  --badge-pickpocketing-fg:  #92400e;
  --badge-bag-bg:            #fee2e2;
  --badge-bag-fg:            #991b1b;
  --badge-vehicle-bg:        #dbeafe;
  --badge-vehicle-fg:        #1e40af;
  --badge-other-bg:          #f3f4f6;
  --badge-other-fg:          #374151;

  /* L&F status badges */
  --badge-lost-bg:           #fff7ed;
  --badge-lost-fg:           #9a3412;
  --badge-found-bg:          #f0fdf4;
  --badge-found-fg:          #166534;

  /* Source badges */
  --badge-seeded-bg:         #f3f4f6;
  --badge-seeded-fg:         #374151;
  --badge-user-bg:           #eff6ff;
  --badge-user-fg:           #1e40af;
}
```

**Typography:** system font stack. No web font load. Fast, no FOUT, works offline.
Pico's default (`system-ui, -apple-system, "Segoe UI", ...`) is fine. Do not
override `--pico-font-family`.

**Colors:** light mode only. No dark mode. Not in scope.

**Map marker icons:** `L.divIcon` with a teardrop/pin SVG shape. Fill color matches
crime type badge: amber / red / blue / gray for pickpocketing / bag / vehicle / other.
Inner circle at 50% white opacity gives a subtle highlight. Drop shadow via
`filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25))`. Size: 18×24px.

---

## 2. Global layout

**Target viewport:** desktop, minimum 1280px wide. Desktop-only per locked feature
list. No mobile breakpoints.

**Structure:**

```
+-- nav (position: sticky; top: 0; height: 56px; z-index: 1000) -----------+
| CrimeLens            [Lost & Found]       [user@email ▾ | Sign in]       |
+--------------------------------------------------------------------------+
| filter bar (height: 48px; background: #f3f4f6; border-bottom: 1px solid  |
| #e5e7eb; sticky; top: 56px; z-index: 999) — map page only               |
| [● Pickpocketing] [● Bag snatching] [● Vehicle theft] [● Other]  [▾ All] |
+--------------------------------------------------------------------------+
|                                                                           |
| map (100vw × calc(100vh - 56px - 48px))     | detail panel (320px,      |
|                                             | slides in from right       |
|                                             | on marker click,           |
|                                             | hidden by default)         |
+--------------------------------------------|---------------------------+
```

No sidebar on the map page. The filter bar replaces it. All other pages
(`/lost-and-found`, `/auth`, `/incidents/:id`) use a full-width single-column
layout within a centered `<main>` container (max-width: 720px, padding: 2rem).
The filter bar and detail panel are map-page-only elements.

**Nav content:**
- Left: `CrimeLens` wordmark (bold, --pico-primary color)
- Center: empty on map page, `← Back to map` link on inner pages
- Right (unauthenticated): `Sign in` link → `/auth`
- Right (authenticated): `user@email.com ▾` → logout link inline

---

## 3. Screen: Home / Map view (`GET /`)

### 3.1 Information hierarchy

1. **Map** (primary) — fills `100vw` × `calc(100vh - 56px - 48px)`
2. **Filter bar** (secondary) — 48px, sticky below nav, always visible on map page
3. **Nav** (tertiary) — 56px, sticky at top
4. **Detail panel** (contextual) — 320px, hidden until marker clicked

### 3.2 Filter bar structure

The filter bar is a single horizontal strip. No vertical sidebar.

```
+-- filter bar (height: 48px; background: #f3f4f6) -------------------------+
| Show:  [● Pickpocketing] [● Bag snatching] [● Vehicle theft] [● Other]   |
|         │                                                  [▾ All time]   |
+--------------------------------------------------------------------------+
```

- `Show:` label: `font-size: 0.75rem; font-weight: 600; color: #6b7280`.
- Crime type controls: pill-shaped toggle buttons (`border-radius: 999px`).
  Each pill shows a colored dot + label. Active state: `border: 1.5px solid`
  matching the crime type color. Inactive: no border (badge background only).
  Colors: amber `#d97706` / red `#dc2626` / blue `#2563eb` / gray `#9ca3af`.
- Time window: native `<select>` (Pico styles), right of pills after a 1px divider.
  Options: All time / Last 30 days / Last 90 days / Last year. Default: All time.
- "Report an incident" button: **not** in the filter bar. Moved to the detail panel
  footer (shown only when authenticated and no incident is open).
- All crime types default to active. All incidents visible on load.
- Filter state reflected in URL: `/?types=pickpocketing,bag_snatching&since=all`
  Updated via `history.pushState` in `map.js` on filter change.
- HTMX: each input has `hx-get="/api/incidents"`, `hx-trigger="change"`,
  `hx-include=".filter-form"`, `hx-target="#map-data"`, `hx-indicator="#map-loading"`.

### 3.3 Map interaction states

| State | What the user sees |
|---|---|
| **Initial load** | Map renders immediately (Leaflet init). `hx-get` fires on page load to fetch pins. While in-flight: map container overlaid with a subtle spinner (#map-loading, `visibility: hidden` by default, shown while HTMX request is in flight via `htmx-request` class). Opacity of map reduced to 0.7. |
| **Filter change** | Same spinner behavior as initial load. Map opacity 0.7 while re-fetching. Filter inputs get `disabled` attribute during request (via `htmx:beforeRequest` / `htmx:afterRequest` event handlers in map.js). |
| **Data loaded** | Pins render, clusters form. Spinner hidden. Inputs re-enabled. |
| **Empty result** | Zero pins returned. Centered on map: a `<div>` with gray text "No incidents found for these filters." Disappears when filter changes. |
| **Network error** | Toast at top of map area: "Could not load incidents. Check your connection and try again." (rendered as HTMX out-of-band swap into `#map-error`). |

### 3.4 Pin and cluster appearance

- Clusters: `leaflet.markercluster` default with custom `iconCreateFunction` that
  uses the same color scheme as the single-pin markers. Cluster badge shows count.
- Single pins: `L.divIcon` with a teardrop SVG (see §1 for shape spec). Fill color
  per crime type.
- Hover: pin scales to 1.25× via CSS transition.
- Click: opens detail panel (see §4). No Leaflet popup.

---

## 4. Screen: Incident detail panel (L3)

No Leaflet popup. Clicking a marker opens a 320px slide-in panel from the right
edge of the map. The panel overlays the map — it does not shrink the map area.

### 4.1 Structure

```
+-- detail panel (320px, position: absolute; right: 0; top: 0; bottom: 0) --+
|  [✕]                                                                       |
|                                                                            |
|  [PICKPOCKETING badge]  [SEEDED badge]                                     |
|                                                                            |
|  Nov 14, 2025                                                              |
|  Barcelona                                                                 |
|                                                                            |
|  Victim reported wallet stolen from jacket pocket while on Las            |
|  Ramblas near La Boqueria market.                                          |
|                                                                            |
|  View full details →                                                       |
|                                                                            |
|  ─────────────────────────────────────                                     |
|  [Report an incident]   ← only if authenticated                           |
+----------------------------------------------------------------------------+
```

- `position: absolute; right: 0; top: 0; bottom: 0; width: 320px`.
- `background: #fff; border-left: 1px solid #e5e7eb`.
- `box-shadow: -4px 0 16px rgba(0,0,0,0.08)`.
- Hidden by default (`transform: translateX(100%)`). Slides in on marker click
  via CSS transition (`transform 0.2s ease`).
- Close button (✕): top-right corner, `color: #9ca3af`, no background.
  Clicking closes the panel (slides out). Clicking the map outside also closes it.
- Badges: same tokens as §1. Stack horizontally, wrap if needed.
- Date + city: two lines, `font-size: 0.8rem; color: #6b7280`.
- Description: full text (no line clamp — panel has scroll if needed).
- "View full details →": `<a>` link to `/incidents/:id`. Not a button.
- "Report an incident": shown only when user is authenticated and at panel bottom.
  Uses Pico primary button style.

### 4.2 Detail panel interaction states

| State | What the user sees |
|---|---|
| **Closed** | Panel off-screen (`translateX(100%)`). Map fills full width visually. |
| **Opening** | Marker clicked. Panel slides in from right (0.2s ease). Clicked marker scales to 1.25×. |
| **Open** | Panel visible. User can scroll panel content independently. Map remains interactive. |
| **Close** | ✕ clicked or map background clicked. Panel slides out (`translateX(100%)`). Marker returns to normal scale. |

---

## 5. Screen: Incident detail page (`GET /incidents/:id`)

Full-width single-column (max-width: 720px, centered).

```
← Back to map

[PICKPOCKETING badge]  [SEEDED badge]

November 14, 2025
Barcelona, Spain

Victim reported wallet stolen from jacket pocket while on Las Ramblas
near La Boqueria market. Incident occurred approximately 18:30 local time.

──────────────────────
Coordinates      41.3809° N, 2.1228° E
Reported         Nov 14, 2025 at 18:32 UTC
Source           Seeded dataset
```

- "← Back to map" uses `history.back()` or a link to `/` if no history exists.
- Coordinates shown in degrees notation (not decimal only).
- Source row: "Seeded dataset" for SEEDED, "User report" for USER_REPORTED.
- No edit/delete actions — incidents are not editable in L1–L3 scope.

---

## 6. Screen: Lost & Found list (`GET /lost-and-found`)

### 6.1 Information hierarchy

1. Page header + post CTA (primary action)
2. Item cards (content)
3. Pagination / load-more if list grows (stretch, not in MVP)

### 6.2 Layout

```
Lost & Found                          [Post item]  ← button, only if authenticated
                                      [Sign in to post]  ← link, if not authenticated

+--card--------------------------------------------------+
| [LOST] [PHONE]                                        |
| iPhone 14 Pro Max, Space Black                        |
| Barcelona · Nov 10, 2025                              |
| Lost near Sagrada Família, around 14:00.              |
|                                           [Delete]    |
+--------------------------------------------------------+

+--card--------------------------------------------------+
| [FOUND] [WALLET]                                      |
| Brown leather wallet, no cards inside                 |
| Paris · Nov 8, 2025                                   |
| Found at Gare du Nord, left at info desk.             |
+--------------------------------------------------------+
```

- Cards use Pico's `<article>` element for automatic border and padding.
- Badge row: status badge first (LOST/FOUND), then category badge.
- Title: `<strong>`, 1rem, `--pico-color`.
- Meta line (city + date): small, `--pico-secondary`.
- Description: 2-line clamp, `--pico-color`.
- Delete button: visible only to the item's owner. Right-aligned. Pico secondary
  button style (outline, not filled).

### 6.3 Interaction states

| State | What the user sees |
|---|---|
| **Loading** | 3 skeleton cards — gray placeholder blocks at the same height as a real card. CSS `@keyframes pulse` opacity animation. Rendered server-side as a fragment and swapped by HTMX. |
| **Empty** | "No items posted yet." in muted text, centered. If authenticated: `[Post the first item]` button. If not: `[Sign in to post]` link. No emoji, no rocket ships. |
| **Delete confirm** | Inline within the card. The [Delete] button is replaced (via HTMX `hx-confirm` attribute) with a "Delete this item?" / [Cancel] [Yes, delete] inline row. No modal. |
| **Delete success** | Card fades out and is removed from DOM via HTMX `hx-swap="outerHTML"` + empty response. |
| **Error** | Toast: "Could not load items. Try refreshing." |

---

## 7. Screen: Lost & Found submission form (`GET /lost-and-found/new`)

Auth-gated. If not logged in, `GET /lost-and-found/new` redirects to `/auth` with
`?next=/lost-and-found/new` so user lands back after login.

### 7.1 Layout

Single column, max-width 520px, centered.

```
Post a lost or found item

Title *
[________________________________]

Category *
[dropdown ▾]   Phone / Bag / Wallet / Keys / Documents / Other

Status *
(o) I lost this     ( ) I found this

City *
[dropdown ▾]   Barcelona / Paris / Rome / Prague / Amsterdam

Date *
[date input]

Description *
[________________________________________]
[________________________________________]

Location (optional)
Mark the approximate location on the map.
+--small map (300px tall)-------------------+
|  [Leaflet map, click to drop a pin]       |
+-------------------------------------------+
[Clear pin]   ← only shown after pin is dropped

[Cancel]                        [Post item]
```

- Dropdowns use native `<select>` — Pico styles these well by default.
- Status is a radio group, not a dropdown. Two choices, visible without interaction.
- Map picker: Leaflet instance at 300px tall, same tile source as main map. Click sets
  lat/lng hidden inputs. No search/geocoding — user drops pin manually.
- "Location" section is optional. Do not mark it with an asterisk.
- Form `action="POST /lost-and-found"`, standard HTML form + HTMX progressive
  enhancement.

### 7.2 Validation and error states

Server-side validation only (Elysia TypeBox). On validation failure, server returns
the full form fragment with errors injected. HTMX swaps it.

```
Title *
[________________________________]  ← field retains entered value
Title is required.                  ← red, small, below field
```

- Per-field error messages appear directly below the field in `--pico-del-color`
  (Pico's red).
- Summary at top of form: "Please fix the errors below." — shown only if any errors
  exist. Not shown on initial render.
- Required fields marked with `*` in the label.
- Submit button: disabled during submission, shows `Posting...` text while HTMX
  request is in flight.

### 7.3 Success state

Redirect to `GET /lost-and-found` after successful POST. The new item will appear
at the top (reverse-chronological). No success toast needed — the item's presence
is the confirmation.

---

## 8. Screen: Magic-link login (`GET /auth`)

### 8.1 Layout

Single column, max-width 400px, centered vertically and horizontally.

```
Sign in to CrimeLens

No passwords. Enter your email and we'll send you a link.
(In local dev, the link appears in the server console.)

Email address *
[________________________________]

[Send magic link]
```

After submit, HTMX swaps the form for a success fragment:

```
Check your inbox.

We sent a link to user@example.com.
It expires in 15 minutes and can only be used once.

Wrong email? [Try again]
```

"Try again" link re-renders the form (client-side, no round-trip needed — just
toggle visibility via HTMX or simple link to `/auth`).

### 8.2 Error states

| Error | What the user sees |
|---|---|
| **Invalid email format** | Below field: "Enter a valid email address." Inline, no page reload. TypeBox validates client-side via HTMX before POST. |
| **Rate limited** | Below field: "Too many attempts. Wait a few minutes and try again." |
| **Server error** | Below button: "Something went wrong. Try again." |

### 8.3 Auth verify error page (`GET /auth/verify?token=...`)

When the token is expired or already used, the verify endpoint returns a full-page
error (not a redirect to `/auth`):

```
This link has expired.

Magic links are single-use and expire after 15 minutes.

[Request a new link]  → links to /auth
```

If the token is malformed (not a valid UUID-looking string), return HTTP 400 with:

```
Invalid link.

This link is not valid. It may have been truncated or copied incorrectly.

[Request a new link]  → links to /auth
```

---

## 9. Interaction state master table

For reference during implementation. Every state that must be handled before a feature
is considered complete.

| Screen | Feature | Loading | Empty | Error | Success |
|---|---|---|---|---|---|
| Map | Marker fetch | Spinner overlay + map opacity 0.7 | "No incidents found." on map | "Could not load incidents." toast | Pins render |
| Map | Filter change | Same as above | Same | Same | Map updates |
| Map | Pin click → detail panel | Instant (data in payload) | N/A | N/A | Panel slides in from right |
| L&F list | Page load | 3 skeleton cards | "No items posted yet." + CTA | "Could not load items." toast | Cards render |
| L&F list | Delete | [Delete] button spinner | N/A | Inline "Delete failed." | Card removed from DOM |
| L&F form | Submit | Button disabled + "Posting..." | N/A | Per-field errors + summary | Redirect to list |
| Auth | Magic link request | Button disabled + spinner | N/A | Inline error below field | "Check your inbox" fragment |
| Auth | Link verify | N/A | N/A | Full-page error (expired/used/invalid) | Redirect to `/` logged in |

---

## 10. Anti-patterns — do not implement these

These are the most likely failure modes given the Pico.css + HTMX + Leaflet stack.
Treat each as a hard constraint.

| Anti-pattern | Correct alternative |
|---|---|
| `border-left: 3px solid <color>` on L&F cards | Use badge system (§1) for visual differentiation |
| Center-aligned nav (logo in center) | Left-aligned logo, right-aligned auth state |
| Icons-in-circles as crime type indicators | Plain text badges with colored backgrounds |
| Circle map markers | Teardrop/pin SVG markers (see §1 and §3.4) |
| Leaflet popup on marker click | Slide-in detail panel from right edge (see §4) |
| 240px sidebar for filters | 48px horizontal filter bar below nav (see §3.2) |
| Full-page reload on filter change | HTMX `hx-get` + `hx-target="#map-data"` |
| Generic empty state: "Nothing here yet! 🚀" | "No items posted yet." — plain, honest |
| Generic success copy: "Welcome to CrimeLens!" | "Sign in to CrimeLens." — direct |
| Modal for delete confirmation | Inline confirm within the card (§6.3) |
| Decoration on auth page (hero image, gradient) | Single column, no decoration |
| Same blue accent for LOST and FOUND badges | Amber/orange for LOST, green for FOUND (§1) |
| Custom map tile skin in local dev | OSM default tiles for dev, Stadia Alidade Smooth if deployed |
| Purple/indigo gradient anywhere | No gradients. Flat backgrounds. |
| Three-column feature grid on any page | This is not a marketing site |

---

## 11. Accessibility

Desktop-only, but baseline accessibility is not optional.

- All form elements have associated `<label>` (via `for`/`id` or wrapping).
- Error messages are linked to their fields via `aria-describedby`.
- Badges use `aria-label` where the color alone conveys meaning:
  `<span class="badge badge-lost" aria-label="Status: Lost">LOST</span>`
- Map is not keyboard-navigatable (Leaflet limitation). That is acceptable for this
  scope. Keyboard users can access all non-map functionality.
- Popup close button (Leaflet's default ×) is focusable.
- Minimum touch target: 44px for buttons. Not needed (desktop-only) but Pico's
  default button height is 44px so this is satisfied for free.
- Color contrast: all badge color pairs in §1 were chosen to meet WCAG AA (4.5:1
  minimum for normal text). Do not change badge colors without re-checking contrast.

---

## 12. Page titles

| Route | `<title>` |
|---|---|
| `/` | `CrimeLens — Crime Map` |
| `/incidents/:id` | `Incident — CrimeLens` |
| `/lost-and-found` | `Lost & Found — CrimeLens` |
| `/lost-and-found/new` | `Post an Item — CrimeLens` |
| `/lost-and-found/:id` | `[Item title] — CrimeLens` |
| `/auth` | `Sign In — CrimeLens` |
| `/about` | `About — CrimeLens` |

---

## 13. NOT in scope (design decisions explicitly deferred)

| Item | Reason deferred |
|---|---|
| Dark mode | Not in 5 locked features. Pico supports it trivially but it's a polish item, not a demo requirement. |
| Mobile / responsive layout | Locked features doc: "Desktop web only." |
| Custom map tile skin | Stadia free tier only needed if deployed. Local dev uses OSM. |
| Skeleton loading on map (vs spinner) | Skeleton would need static placeholder geometry. Spinner is sufficient. |
| "My reports" page (user's own incidents) | Explicitly cut per locked features §2. |
| Pagination on L&F list | List is short in demo. Browser scroll is fine. |
| Toast notification system | Per-page inline error states are sufficient. No toast library. |
| Animation / transitions beyond badge hover | Not needed for a university demo. |

---

## 14. What already exists

- **Pico.css:** handles base typography, form elements, `<article>` cards, `<button>`,
  `<nav>`, `<footer>`. Work with it.
- **Leaflet 1.9.x + leaflet.markercluster:** handles map, pins, clustering, popup DOM.
  Override via CSS and `L.divIcon`, do not replace.
- **HTMX 2.x:** handles all page fragment swaps, loading states via `htmx-request`
  class on the indicator element, out-of-band swaps for toasts.
- **Pico's color variables:** already defined. Override only what needs to change (§1).

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 3/10 → 9/10, 0 decisions deferred |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** Design review CLEAR. Eng review required before implementation.
