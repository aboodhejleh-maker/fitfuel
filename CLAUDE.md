# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FitFuel: a Hebrew, RTL, mobile-first nutrition tracker MVP for students who train at the gym. Client-server: a vanilla JS single-page frontend, a Flask JSON API (`app.py`), and Supabase (PostgreSQL + Auth) for data, deployed on Railway. The UI follows the "Kinetic Fuel" design system exported from Stitch (reference HTML, screenshots and `DESIGN.md` are in `../stitch_reference/`). `../fitfuel-static-backup/` is the earlier localStorage-only version.

## Running

Python 3.12 is installed per-user (`%LOCALAPPDATA%\Programs\Python\Python312`, not on the Git Bash PATH); use the project venv. Node/npm are not installed, so do not introduce tooling that needs them without asking. There is no build step, linter or test suite.

- `.venv/Scripts/python app.py` serves the app on http://localhost:5000.
- The Claude preview config named `fitfuel` in `C:\Users\ASUS\.claude\launch.json` runs the same command. Use forward slashes for paths inside that file; backslashes get stripped.
- Without `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (see `.env.example`) the server uses `local.db` (SQLite) with the same tables. Delete `local.db` and restart for a clean state. The `SupabaseStore` path has not been run against a real project yet.

Tailwind (Play CDN) and the Rubik / Material Symbols fonts load from the network, so the app needs an internet connection to render correctly.

Verification is manual: register → onboarding → goals → meals filter → meal detail → log → dashboard → logout/login at a 375px-wide viewport, and check the console.

## Architecture

### Backend

- `db.py`: `LocalStore` (SQLite) and `SupabaseStore` share one interface; `get_store()` picks by env. Keep them in sync, and mirror any column change in `supabase/schema.sql` and `LOCAL_SCHEMA`. Supabase is accessed only from the server with the service_role key; tables have RLS enabled with no policies.
- `app.py`: serves `index.html`, `/css`, `/js` (nothing else in the folder is exposed) and the `/api/*` routes listed in `README.md`. Auth is a signed Flask session cookie holding the user id. It converts between DB rows and the frontend's object shapes and validates every write.
- `data/seed.json`: source of truth for meals and foods; loaded into the `meals` / `foods` tables only when `meals` is empty. A meal's `kcal` and `cost` are **derived** in `load_seed()` from its macros (`4p + 4c + 9f`, rounded to 5) and the sum of ingredient costs; never hand-write them. Foods are per 100 g with an optional `unit: { l, g }`. To change the catalog on an existing database, edit the tables or empty `meals` and `foods` and restart.

### Frontend

Classic `<script>` tags, not ES modules. Everything is a global and **load order in `index.html` matters**: `data.js` → `store.js` → `nutrition.js` → `ui.js` → `Views = {}` → `views/*.js` → `app.js`. `app.js` stays last; it calls `Store.init()` and renders once the state has loaded.

- `js/data.js`: declares the `MEALS` and `FOODS` globals, filled by `Store.init()`.
- `js/store.js`: `Store`, the only code that talks to the API. It keeps an in-memory copy `{ user, profile, goals, log: { 'YYYY-MM-DD': [entry] }, favorites: [mealId] }` that views read synchronously; writes update the copy at once and are sent in the background, and a failed write toasts and reloads from the server. Log entries snapshot their macros and cost at logging time.
- `js/nutrition.js`: `Nutrition`, pure calculations. Suggested goals use Mifflin-St Jeor × 1.55 with a per-goal calorie offset and protein-per-kg factor (`GOAL_RULES`); fat is 25% of calories and carbs are the remainder (`macrosFor`). Also date keys (browser local time), weekly logged-day count (week starts Sunday) and streak.
- `js/ui.js`: `UI`, shared HTML-string helpers, class-string constants, label maps (`TYPES`, `GOALS`), and the profile/goal form fields plus their validation, which are shared by onboarding and the profile screen. `app.py` repeats the same ranges.
- `js/app.js`: `App`, the hash router (`#/dashboard`, `#/meals`, `#/meal/:id`, `#/log`, `#/profile`), header, bottom-nav state and `App.toast`. Not logged in: every route renders `auth`. Logged in without profile and goals: every route renders onboarding.

### View contract

Each view registers itself as `Views.<routeName> = { nav, back, title, render(arg, isNew), mount(box, arg) }`.

- `render` returns an HTML string; `mount` attaches listeners.
- `App.render()` builds a **fresh wrapper element on every render** and passes it to `mount`. Attach delegated listeners to that `box`, never to `#app` or `document`, or they accumulate across renders.
- `isNew` is true only when the route changed. Views that hold draft state in a closure (`quickLog.js`, `onboarding.js`, the filter state in `meals.js`) use it to decide whether to reset.
- Calling `App.render()` replaces the whole view and drops input focus. For anything that updates while the user types (meal search, food search, gram inputs, manual macros), re-render only the affected container, as `quickLog.js` and `meals.js` do.

## Conventions

- All user-visible text is Hebrew. Any user-entered string must go through `UI.esc()` before being placed in an HTML string.
- Mixed-direction tokens (`₪12`, `35g`) must be wrapped via `UI.nis()` / `UI.g()` so they do not flip inside Hebrew text.
- Use the design tokens defined in the `tailwind.config` block in `index.html` (`primary`, `secondary`, `surface-container*`, `text-label-macro`, …). Macro colours are fixed: calories `primary`, protein `secondary`, carbs `carb`, fat `tertiary`. Tailwind classes are picked up from dynamically inserted HTML by the Play CDN, so no safelist is needed.
- Interactive targets are at least 44px tall.
- Icons are Material Symbols ligature names. An unknown name renders as literal text, so check that a new name exists.

## Product scope

The MVP is defined by the Phase 1 Discovery document and the product spec: email/password accounts, profile, nutrition goals, meal database, meal matching by goal/time/budget, meal logging, daily summary. Deliberately excluded and removed from the Stitch designs: workouts tab, barcode scanning, shopping list, Google/biometric login, and anything resembling medical nutrition advice. Do not add these back without being asked.
