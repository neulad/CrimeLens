\# CrimeLens



\## About

University project. CrimeLens is a map-first crime-awareness web app for major European cities: browse clustered incidents on an interactive map, filter by crime type and time, search by city, and (when signed in) report, edit, and delete incidents.



\## Team

\- Developer (me + Claude): writes all code. Maximum autonomy — make decisions yourself, do not ask for confirmation on technical choices unless they're irreversible or affect scope.

\- Tim (PM): presentation, market research, backlog management. Not a coder.

\- Tester: manually tests the app. Not a coder.



\## Operating rules for Claude

1\. You have full authority over stack, architecture, folder structure, libraries, and implementation details. Decide and move.

2\. Stack preference: modern but stable open-source. Lightweight. No huge enterprise frameworks. Fast local setup. Must support interactive maps and geospatial queries.

3\. Always optimize for what a university project is graded on: repo quality, clean commit history, working demo.

4\. Commit in small, frequent, well-messaged chunks. Never one giant commit per feature.

5\. Never ask "do you want me to…" — just do it and report what you did.



\## gstack

gstack is a set of skills installed at `~/.claude/skills/gstack`.

**Install (one-time per machine):**

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

**Web browsing:** Always use the `/browse` skill for web browsing. Never use `mcp__claude-in-chrome__*` tools directly.

**Available skills:**

`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`


