# CrimeLens — MVP Scope

**Status:** LOCKED
**Owner:** solo developer (me + Claude)
**Source docs:** `docs/team-project-plan.pdf` (rubric), `docs/crimelens-idea.md` (original idea)
**Date locked:** 2026-04-11

---

## 1. The North Star: the professor's rubric

This is a university project. The customer is the professor, not tourists. Every scope decision is judged against the rubric in `docs/team-project-plan.pdf`:

| Component | Points | What earns full marks |
|---|---|---|
| Project repository / environment | 10 | Clean structure, README, `.env.example`, one-command local setup, sensible folders, no dead code |
| Project management plan | 10 | GitHub Projects board with a populated backlog, user stories, iterations visible |
| Technical documentation | 10 | Architecture diagram, data model diagram, API / route map, install guide, stack justification |
| Team activity and commit history | 10 | Many small, well-messaged commits over 12 weeks. Never one mega-commit per feature |
| Final presentation | 10 | Working 10–15 min demo, clean happy path, explanation of architecture and decisions |
| **Total** | **50** | |

**Nothing in the rubric rewards novelty of idea, real users, validated demand, or feature count.** The MVP should therefore be the *smallest* product that credibly demonstrates the full SDLC across 12 weeks, with a demo that looks good on screen.

This scope is optimized accordingly. Features exist to earn rubric points, not to impress users.

---

## 2. Six forcing questions, answered

### Q1 — Demand reality
Who actually uses this? For grading purposes, **no one has to**. The only humans who will ever interact with the app are: the developer, Tim (PM), the tester, and the professor during the demo.

The *narrative* user — the one the demo talks about — is a 22–40 year old first-time visitor planning a 3-day trip to a major European city, who wants to know which districts and metro lines are highest-risk before they go. That's who the pitch talks about. That's who the happy path is designed for.

We do not pretend this is validated. We do not pretend anyone is waiting for it. The product is a credible vehicle for showing software engineering competence. Call it what it is.

### Q2 — Status quo
Right now, that tourist googles *"pickpocket Barcelona Reddit"*, reads a thread, maybe checks Numbeo or GeoSure, and guesses. Map-first is genuinely a nicer experience than prose threads. That's the story in the final presentation: "the current workaround is text on forums, we made it visual and filterable."

It's a legitimate-feeling narrative even though we have no users. That's enough for a university demo.

### Q3 — Desperate specificity
One user persona, written down so every feature decision can be tested against it:

> **Mia, 27, software consultant from Berlin, flying to Barcelona next Friday for a 4-day trip. She's staying near Las Ramblas. She's been pickpocketed once before in Rome and is now paranoid. She opens CrimeLens, zooms into Barcelona, filters to "pickpocketing, last 12 months," sees the cluster around Las Ramblas and the Gothic Quarter, and makes a mental note. Two days in, she sees someone near her drop a phone. She opens the app, hits "report an incident," drops a pin, selects "attempted theft," adds a one-line note. Logs out. Closes the tab.**

Every feature in this scope exists to support Mia's flow. Anything that doesn't, gets cut.

### Q4 — Narrowest wedge
Smallest version that still looks like a real product on demo day:

1. Interactive map of Europe, zoom/pan, marker clustering.
2. Pins for real-looking crime incidents in **5 hero cities** (Barcelona, Paris, Rome, Prague, Amsterdam).
3. Click a pin → detail view with type, date, location, short description, source badge.
4. Filter sidebar: crime type (checkboxes), time window (30d / 90d / 1y / all).
5. Register / login / logout.
6. Authenticated users can submit a new incident: pick a point on the map, type, date, description.
7. About page (data sources, methodology, disclaimer).
8. README + technical docs.

That's the product. Everything else in `crimelens-idea.md` is cut or deferred.

### Q5 — Observation and surprise
The biggest risk to the demo is a **dead-looking map**. If the professor opens the app and sees an empty Europe with three lonely pins, the demo is over regardless of how clean the code is. This is the single most important lesson to internalize:

> **An empty map kills the demo. Seeding realistic data is a load-bearing deliverable, not a nice-to-have.**

This means: one full sprint week is dedicated to building a seed dataset of ~500 realistic incidents across the 5 hero cities, with plausible timestamps, locations, and descriptions. This is not optional. Week 5 (Data Model Design) or Week 6 (Core Logic) will absorb this work.

### Q6 — Future-fit
The rubric doesn't reward ambition. It rewards a clean, well-documented, well-committed, well-demoed finished thing. So every architectural choice prefers **boring and clear over clever**. The code is a vehicle for demonstrating software engineering fundamentals, not a platform for future scale. Scalability, real-time ingestion, multi-country aggregation, offline support, mobile apps — all of that is explicitly NOT future-fit for this project. They are distractions.

---

## 3. Premises (must hold for this scope to work)

1. The grader will not verify real-world data accuracy. A credible-looking seed dataset with a clear disclaimer ("this is a student project, data is representative / partly synthetic, see About page") is acceptable.
2. Solo developer working ~12 weeks (per the timeline in `team-project-plan.pdf`). No code contribution from Tim or the tester.
3. The presentation demo will be run on the developer's laptop, not a public URL. Local hosting with seeded data is fine. Deployment is a bonus, not a requirement.
4. The professor cares more about *evidence of process* (commits, board, docs) than about the product itself.
5. "Modern but stable open-source, lightweight, supports interactive maps and geospatial queries" is a hard constraint from the project CLAUDE.md. Stack selection happens in a separate doc during Week 3.

If any of these premises break, this scope must be revisited.

---

## 4. In scope — the locked MVP feature list

### 4.1 Public, unauthenticated
- **F1. Interactive map** — pan, zoom, centered on Europe on load.
- **F2. Marker clustering** — clusters at low zoom, individual pins at high zoom.
- **F3. Incident pin popup** — click a pin, see short info (type, date, location label) with a "View details" link.
- **F4. Incident detail page** — full description, coordinates, timestamp, crime type, source badge (`SEEDED`, `USER_REPORTED`, `OFFICIAL`).
- **F5. Filter sidebar** — filter map by crime type (checkbox list: pickpocketing, bag snatching, theft from vehicle, other) and by time window (30d / 90d / 1y / all).
- **F6. About page** — what this is, who built it, data sources, methodology, disclaimer.
- **F7. Landing / home page** — map is the home page. No separate marketing landing.

### 4.2 Authenticated
- **F8. Register** — email, password, display name.
- **F9. Login / logout** — standard session-based auth.
- **F10. Submit an incident** — logged-in users can drop a pin on the map, pick crime type, pick date, add a short description, submit. Pin appears on map after submission.
- **F11. "My reports"** — a simple list of incidents submitted by the logged-in user (rubric: proves multi-user data model and authorization, not just auth).

### 4.3 Data
- **F12. Seed dataset** — ~500 incidents across Barcelona, Paris, Rome, Prague, Amsterdam. Loaded via a reproducible seed script in the repo. Timestamps distributed across the last 18 months. Source field set to `SEEDED`. Dataset construction methodology documented in About page and in `docs/`.

### 4.4 Documentation deliverables (rubric-critical)
- **D1.** `README.md` — what it is, how to run locally, env vars, screenshots.
- **D2.** `docs/02-architecture.md` — system architecture description and diagram.
- **D3.** `docs/03-data-model.md` — ER diagram and table descriptions.
- **D4.** `docs/04-api.md` — route / endpoint map with request/response shapes.
- **D5.** `docs/05-stack-justification.md` — why each technology was picked, with rubric references.
- **D6.** `docs/06-install-guide.md` — step-by-step local setup from a fresh clone.
- **D7.** `docs/07-demo-script.md` — the scripted happy path for the Week 12 presentation.
- **D8.** GitHub Projects board populated with user stories derived from §4.1–§4.3, grouped by sprint.

---

## 5. Explicitly OUT of scope

Every item below appeared in `docs/crimelens-idea.md` or is an obvious temptation. They are cut with reasons so they stay cut.

| Feature | Cut reason |
|---|---|
| Lost-and-found module | A separate product bolted on. Doubles the schema, doubles the UI, adds photo uploads and messaging. Zero marginal rubric points. |
| Magic-link authentication | Replaced with standard email+password. Magic-link adds email deliverability, token expiry, and edge cases. Week 9 rubric auth requirement is satisfied by regular auth at 1/10 the cost. |
| Email sending (Resend, Nodemailer) | Not needed if no magic link, no password reset, no notifications. Defer entirely. |
| Europe-wide data coverage | Replaced with 5 hero cities. Wide coverage equals empty map equals dead demo. |
| Real-time data ingestion from external sources | Static seeded dataset + user reports only. Real ingestion is weeks of work with no reliable public data source. |
| Crime heatmaps, trend charts, analytics dashboards | Clusters + filters are sufficient for the demo story. Charts are a separate feature class. |
| Route safety suggestions ("pick a safer walk") | Requires routing engine, graph queries, significant UX work. Out. |
| Reviews, comments, upvotes on incidents | No moderation story. Turns it into a social product. Out. |
| User profiles, avatars, follows | Completely out. |
| Email verification, password reset | Out for MVP. Note in About page: "student project, do not use real passwords." |
| Mobile app, PWA install, offline mode | Desktop web only. Responsive layout is a stretch goal, not a commitment. |
| Multi-language / i18n | English only. |
| Admin panel, moderation queue | Out. No admin user class. |
| Real-time updates (WebSocket push of new reports) | Out. Page refresh is fine. |
| Notifications | Out. |
| Deployment to production | Bonus, not required. Local run is acceptable for the demo. |
| Automated test suite beyond a smoke test | Optional. The rubric's Week 10 "testing" is satisfied by manual QA + a small set of route-level tests. Full TDD is not a rubric item. |

**Rule:** if a feature is not in §4, it does not exist. Adding anything from §5 requires explicitly updating this doc and re-locking scope.

---

## 6. Mapping scope to the 12-week timeline

Aligning §4 deliverables to the professor's weekly plan from `docs/team-project-plan.pdf`. This is the slicing that feeds the GitHub Projects board.

| Week | Rubric theme | MVP work |
|---|---|---|
| 1 | Project kick-off | Repo created, initial README, this MVP scope doc, idea statement. Backlog seeded on GitHub Projects. |
| 2 | Requirements analysis | User stories derived from F1–F12, acceptance criteria, sprint plan. |
| 3 | Architecture design | Stack selection doc (`docs/05-stack-justification.md`), architecture diagram, route map. |
| 4 | Technical setup | Project skeleton: framework bootstrapped, DB running locally, one placeholder page served, empty map rendering, CI minimal. First commits with small increments. |
| 5 | Data model | ER diagram, migrations, incident table with geo column, users table, sessions. `docs/03-data-model.md`. Seed script scaffolding. |
| 6 | Core logic | CRUD for incidents (server-side), geo query to fetch within a viewport + filter by type/time, auth endpoints. Seed data generated and loaded. |
| 7 | UI | Map page with clustering, filter sidebar, detail popup and page, register/login/logout pages, submit-incident form, about page, "my reports" page. |
| 8 | System integration | End-to-end wire-up. Session state across pages. Filter state reflected in map. Polish the happy path. |
| 9 | Advanced features | Auth hardening (password hashing, CSRF, session expiry), authorization on write endpoints, 404/403 handling. This is where the rubric's "authentication" box gets formally ticked. |
| 10 | Testing | Manual test plan executed by the tester. Fix bugs. Add a small route-level smoke test suite. Record test results in `docs/`. |
| 11 | Documentation | Finalize D1–D7. Screenshots. Architecture diagram cleanup. Install guide verified from a fresh clone. |
| 12 | Final presentation | Rehearse demo script, prepare slides, run-through on presentation hardware. |

If any week slips, the first thing cut is **test suite depth** (stay manual), the second is **deployment** (stay local). Feature scope (§4) does not shrink — if a feature is at risk, fix it, don't cut it. Scope is locked.

---

## 7. Architecture shape (stack-agnostic)

Stack selection is intentionally deferred per the project CLAUDE.md ("don't pick the stack yet"). But the *shape* is locked now because it constrains the stack choice in Week 3.

- **Web app, server-rendered.** Map-first page. SPA is not required.
- **Relational database with geospatial support.** Postgres with PostGIS is the obvious default but the formal choice happens in `docs/05-stack-justification.md`.
- **Three database entities:** `users`, `incidents`, `sessions` (or equivalent auth mechanism).
- **Public read, authenticated write.** Incidents table is publicly readable via filtered queries, writes require a valid session.
- **Seed script** — separate executable that wipes and repopulates the incidents table from a fixture file under version control.
- **One process, one database.** No message queue, no cache layer, no microservices. This is a university demo.
- **Local development first.** Production deployment is a stretch goal.

The Week 3 architecture document will translate this shape into a concrete stack.

---

## 8. Definition of done for the MVP

The MVP is "done" when all of the following are true:

1. A fresh clone of the repo can be brought up locally by following `docs/06-install-guide.md` without improvisation.
2. The seed script loads ~500 incidents across the 5 hero cities.
3. A new visitor can land on the home page, see a populated Europe-wide map, zoom into any of the 5 cities, filter by crime type and time, click a pin, and read the detail page.
4. A new visitor can register, log in, submit an incident, see it appear on the map, view it in "my reports," and log out.
5. All 8 documentation deliverables (D1–D8) are in the repo and accurate.
6. The GitHub Projects board shows completed user stories across 6 sprints.
7. Commit history shows small, incremental commits distributed over the 12 weeks (not a single-weekend panic push).
8. The Week 12 demo script can be executed end-to-end without the presenter touching code.

When all 8 are true, stop building. Don't add features. Polish docs, rehearse the demo, ship.

---

## 9. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Empty / sparse map on demo day | **Critical** | Seed dataset is a first-class deliverable (F12). Week 6 does not close until the map looks populated in all 5 cities. |
| Auth implementation burns a week | High | Use a well-known auth library for the chosen stack. Do not roll custom crypto. Single-session model, no password reset, no email. |
| PostGIS / geospatial query unfamiliarity | Medium | Keep queries to a single pattern: "all incidents inside this bounding box, filtered by type and date." One query template, reused. |
| Commit history looks lumpy (late cramming) | High for the rubric | Commit daily or near-daily. Every closed user story is at least 2–5 commits. Never squash before pushing. |
| Documentation left until Week 11 | Medium | Write the doc for each feature in the same sprint the feature ships. Week 11 is editing, not writing from scratch. |
| Scope creep from "wouldn't it be cool if…" | High | This doc exists specifically to refuse scope creep. Any addition requires re-locking this file in a commit. |
| Solo developer getting sick / blocked | Medium | The 12-week plan has slack built into Weeks 10–11. No new features after Week 9. |

---

## 10. What happens next (concrete actions)

In order:

1. Commit this file as the first artifact of the design phase.
2. Create the GitHub repo (if not already done) with this `docs/` folder as the initial commit tree.
3. Set up GitHub Projects board. Create an Epic per §4 section. Create user stories per feature (F1–F12) with acceptance criteria. This becomes the Week 2 deliverable.
4. Week 3: write `docs/05-stack-justification.md`, pick the stack, write `docs/02-architecture.md`, write the route map.
5. Week 4: bootstrap the skeleton. First runnable page. First five commits.

Step 1 happens immediately in this session. Steps 2–5 happen in subsequent sessions, each ending with a new markdown file in `docs/` per the project's operating rules.

---

## 11. What was cut vs. what was kept — the one-paragraph summary for the demo

> CrimeLens is a map-first web app that shows pickpocketing and petty-theft hotspots in five European cities, lets anyone filter by crime type and time, and lets registered users report new incidents. We deliberately cut lost-and-found, magic-link auth, email, Europe-wide live ingestion, heatmaps, and routing to keep the MVP honest for a solo 12-week build. What we kept is the interaction a traveller actually cares about: open the map, zoom into your city, see the cluster, click a pin, trust or distrust the data. The point of the project is to show a full SDLC done cleanly, and the scope is sized to let that happen without shortcuts in the final two weeks.

Use this paragraph as the opening of the Week 12 presentation.
