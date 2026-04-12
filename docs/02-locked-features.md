# CrimeLens — Locked Feature List

**Status:** LOCKED (supersedes `docs/01-mvp-scope.md` §4 for feature scope)
**Owner:** solo developer (me + Claude)
**Date locked:** 2026-04-11
**Source docs:** `docs/team-project-plan.pdf` (rubric), `docs/crimelens-idea.md` (original idea), `docs/01-mvp-scope.md` (process context, forcing questions, timeline, risks)

---

## 0. Why this doc exists

`docs/01-mvp-scope.md` ran the six forcing questions and produced an MVP. During CEO review the scope was re-cut tighter and two features came back in that the earlier pass had dropped: **magic-link auth** and **lost-and-found**. This document is the new source of truth for *what ships*. Anything in §4 of `01-mvp-scope.md` that conflicts with this doc is overridden here.

Process context (rubric north star, persona, 12-week plan, risks, architecture shape) in `01-mvp-scope.md` still applies. Only the feature list is replaced.

---

## 1. The five locked features

Exactly five things ship. Nothing else.

### L1. Interactive crime map
- Full-screen map of Europe, pan and zoom, centered on the five hero cities on load.
- Marker clustering at low zoom, individual pins at high zoom.
- Pins are fetched for the current viewport only (bounding-box query).
- Five hero cities seeded with ~500 realistic incidents: Barcelona, Paris, Rome, Prague, Amsterdam.
- Map is the home page. No separate landing.

### L2. Filters
- Sidebar or top bar with two filter groups:
  - **Crime type** — checkboxes: pickpocketing, bag snatching, theft from vehicle, other.
  - **Time window** — radio: 30d / 90d / 1y / all.
- Filter state is reflected in the URL (shareable, reload-safe).
- Map re-queries on filter change. No client-side filtering of a pre-fetched blob.

### L3. Crime detail popups
- Click a pin → popup with type, date, short location label, one-line description, source badge (`SEEDED` | `USER_REPORTED`).
- Popup has a "View full details" link to a dedicated detail page with the full description, coordinates, timestamp, and source.

### L4. Magic-link authentication
- Email-only sign in. Enter email → receive a signed link → click it → logged in.
- Link is single-use, short TTL (15 minutes), hashed at rest.
- Server-side session cookie (HttpOnly, SameSite=Lax, signed).
- Logout clears the session.
- Local development: link is printed to the server console instead of sent by email. Production: Resend HTTP API.
- No passwords. No email verification flow beyond the magic link itself. No password reset (nothing to reset).

**Authenticated users can:** submit crime incidents (L1 pins), submit and browse lost-and-found items (L5). Submissions from authenticated users carry their user id.

### L5. Lost-and-found submission + browse
- **Browse:** a dedicated `/lost-and-found` page showing a reverse-chronological list of lost/found items. Each card shows title, category (phone / bag / wallet / keys / documents / other), status (LOST | FOUND), city, date, short description.
- **Submit:** authenticated users can create a lost or found item. Form fields: title, category, status, city (dropdown of the 5 hero cities), date, short description, optional lat/lng dropped on a small map picker.
- Items are public-read. Only the submitter sees an edit/delete action on their own items.
- No photos, no messaging, no replies, no claim workflow. That's the cut.

---

## 2. Explicitly OUT of scope

Everything in `01-mvp-scope.md` §5 remains out (lost-and-found infrastructure, heatmaps, routing, reviews, notifications, etc.) except where explicitly brought back in §1 above. On top of that, the CEO cut removes the following things that §1 might tempt us to add:

| Item | Cut reason |
|---|---|
| "My reports" page (was F11 in scope doc) | Not in the five. Authorization on write endpoints still exists; visibility of *your own* content is not a ship-blocker for the demo. |
| Separate register / login / logout pages | Folded into a single `/auth` flow for magic link. One form, one email, one click. |
| Photos on lost-and-found items | Image upload story is a week of work (storage, MIME validation, size limits, thumbnails). Out. |
| Messaging between finder and loser | Turns it into a chat app. Out. |
| Claim workflow / dispute resolution | Out. |
| Categorizing lost items by map location heatmap | Out. It's a list, not a map. |
| Email verification separate from magic link | Clicking the magic link *is* the verification. |
| Password-based auth as a fallback | No. Magic-link only. |
| Admin / moderation panel | Out. |
| User profiles, avatars | Out. |
| Analytics, charts, trend lines | Out. |
| Real-time updates | Out. Page refresh. |
| i18n | English only. |
| Mobile app / PWA | Desktop web only. |

**Rule:** if a feature is not listed in §1, it does not ship. Adding anything from §2 requires re-locking this file in a commit.

---

## 3. Demo story, one paragraph

> CrimeLens is a map-first web app that shows pickpocketing and petty-theft hotspots in five European cities. Anyone can open the map, filter by crime type and time window, and click a pin to read the incident details. Signing in is a single click on a magic link sent to your email. Once signed in, you can browse a lost-and-found board and post your own lost or found items. We cut everything else to keep the MVP honest for a solo 12-week build: no passwords, no photos, no messaging, no heatmaps, no routing, no admin. The map, the filters, the popups, the magic link, and the lost-and-found board. Five things, done cleanly.

This is the opening of the Week 12 presentation. It replaces the equivalent paragraph in `01-mvp-scope.md` §11.

---

## 4. Definition of done

The MVP is done when all of the following are true:

1. A fresh clone can be brought up locally by following `docs/06-install-guide.md` without improvisation.
2. The seed script loads ~500 incidents across the 5 hero cities.
3. A visitor can land on the map, zoom into any hero city, filter by crime type and time, click a pin, and read the detail page. (L1 + L2 + L3)
4. A visitor can enter an email, receive a magic link (printed to console in local dev), click it, and land logged in. Logout works. (L4)
5. A logged-in user can open `/lost-and-found`, browse items, and submit a new lost or found item that appears on the list. (L5)
6. A logged-in user can drop a new crime incident pin on the map and see it rendered to all visitors. (L1 + auth)
7. The five GitHub Projects epics (one per L1–L5) are fully populated and all user stories are closed.
8. `docs/` contains: README, architecture, data model, API map, stack justification, install guide, demo script.
9. Commit history shows small, incremental commits distributed across the 12 weeks.

When 1–9 are true, stop building. Polish, rehearse, ship.

---

## 5. Epic → feature map (for GitHub Projects)

One epic per locked feature, so the board mirrors this document exactly.

| Epic | Maps to | Rough story count |
|---|---|---|
| E1. Interactive crime map | L1 | 6–8 stories (map bootstrap, clustering, bbox query, seed data, hero-city view, pin render, loading state, viewport URL sync) |
| E2. Filters | L2 | 3–4 stories (filter UI, URL state, server-side query params, empty state) |
| E3. Crime detail popups | L3 | 2–3 stories (popup content, detail page route, source badge) |
| E4. Magic-link auth | L4 | 5–6 stories (request-link form, token generate + hash + persist, email delivery, consume endpoint, session cookie, logout, rate limit on request-link) |
| E5. Lost-and-found | L5 | 5–6 stories (data model + migration, list page, submit form, city dropdown, mine-only edit/delete, small map picker) |

Total: ~21–27 stories across 5 epics. This is the Week 2 deliverable for `team-project-plan.pdf` "Project management plan."

---

## 6. Consequences for already-written docs

- **`docs/01-mvp-scope.md`** — keep as the process artifact (forcing questions, persona, timeline, risks, definition of done, architecture shape). Add a one-line note at the top pointing to this file as the authoritative feature list. Do **not** delete it; the rubric's "project management plan" component benefits from showing the iteration.
- **`docs/03-architecture.md`** — written against the earlier, narrower feature list. It already includes magic-link auth. It does **not** include lost-and-found. It needs a follow-up revision to add: a `lost_items` table, routes for browsing and submitting lost items, and a `/lost-and-found` page in the build order. That revision is a separate task and lands in a separate commit.
- **`docs/crimelens-idea.md`** — source of the original idea. No change. The lost-and-found feature from the original idea is now partially back in, in the thin form described in L5.

---

## 7. What happens next

1. Commit this file.
2. Update `docs/01-mvp-scope.md` with a one-line "superseded by 02-locked-features.md" banner for the feature-list section.
3. Revise `docs/03-architecture.md` to add the lost-and-found data model, routes, and build-order slot.
4. Create the five GitHub Projects epics (E1–E5) and start decomposing into stories per §5 above. That work is the Week 2 deliverable.

Steps 2 and 3 happen in subsequent focused sessions, each ending with a new or updated markdown file in `docs/`.
