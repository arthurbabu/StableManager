# Stable Manager

A web app for running a horse stable's day-to-day operations: staff scheduling and
vacation requests, horse care planning, and competition entries. Built as a
responsive web app so it works from a phone (installable to the iPhone home
screen as a PWA) or a desktop browser — no app store install required.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Prisma** ORM — SQLite for local dev, swap to Postgres for production
- **NextAuth v5** — email/password login, JWT sessions, role-based access
- **next-intl** — French (default) and English, with a language switcher
- Server actions for all writes (no separate API layer to maintain)

## Roles

| Role    | Can do |
|---------|--------|
| STAFF   | View schedule/horses/competitions, request vacation, complete their own assigned care tasks |
| MANAGER | Everything STAFF can, plus create/edit shifts, horses, care tasks, competitions, and approve/reject vacation requests |
| ADMIN   | Everything MANAGER can, plus create staff accounts and change roles |

## Getting started

```bash
npm install
cp .env.example .env   # then fill in AUTH_SECRET (see below)
npx prisma migrate dev # creates the SQLite database and applies the schema
npm run db:seed        # loads demo staff, horses, and a couple of competitions
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Generate a real `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

### Demo logins (after seeding)

| Email | Password | Role |
|---|---|---|
| admin@stable.test | password123 | ADMIN |
| jamie@stable.test | password123 | STAFF |
| taylor@stable.test | password123 | STAFF |

Change these passwords (or deactivate the accounts) before using this with real data.
The MANAGER role still exists in the app (see Roles above) — promote any account to it
from Staff Accounts if you need that tier; the seed data just doesn't create one by default.

## Language

The app is in **French by default** (no URL prefix, e.g. `/horses`) with **English**
available via a switcher in the sidebar/header (prefixed, e.g. `/en/horses`). All UI
text, dates, and pluralization are localized; role names, task types, horse sex, and
vacation statuses are translated too. To add a third language: add its code to
`src/i18n/routing.ts` and add a matching `messages/<locale>.json` (copy `en.json`'s
key structure — every namespace/key must exist in every locale file).

## Project structure

```
prisma/schema.prisma       Data model (users, shifts, vacations, horses, care tasks, competitions)
prisma/seed.ts             Demo data (local dev only)
prisma/bootstrap-admin.ts  Creates one ADMIN account from env vars on first run (self-hosted deploys)
Dockerfile, run.sh          Container build + entrypoint, used by both plain Docker and the HA add-on below
config.yaml, DOCS.md        Home Assistant OS local add-on manifest + its in-UI documentation
repository.yaml              Marks this repo as a HA add-on repository (Settings → Add-ons → Repositories)
stable_manager/              The same add-on, packaged for the repository-install path (see below)
messages/fr.json           French strings (default locale)
messages/en.json           English strings
src/i18n/routing.ts        Locale list, default locale, URL prefix strategy
src/i18n/navigation.ts     Locale-aware Link/redirect/usePathname/useRouter
src/i18n/request.ts        Loads the message catalog per request
src/i18n/dateLocale.ts     Maps app locale -> date-fns locale for date formatting
src/auth.ts                NextAuth config (credentials provider, JWT, roles)
src/proxy.ts                Route protection + locale routing (combined middleware)
src/lib/                   Prisma client singleton + auth/role helper functions
src/app/[locale]/layout.tsx  Root layout (sets <html lang>, loads messages)
src/app/[locale]/login/     Login page
src/app/[locale]/(app)/     Everything behind login, wrapped in the app shell
  calendar/                Doctolib-style weekly time-grid view of everything, color-coded by type
  staff/                   Weekly shift schedule + shift creation
  staff/vacations/         Vacation requests + approval
  horses/                  Horse profiles + care task scheduling
  competitions/            Competitions + entries/results
  admin/users/             Staff account management (ADMIN only)
src/components/            Shared UI (nav, shell, buttons/inputs/cards, language switcher)
```

## Installing on an iPhone

Open the deployed URL in Safari, tap the Share icon, then **Add to Home Screen**.
The app has a manifest and icons configured so it opens full-screen like a native app.

## Deploying (cloud-hosted, accessible from anywhere)

1. Push this project to a GitHub repo.
2. Create a free Postgres database (e.g. [Neon](https://neon.tech) or
   [Supabase](https://supabase.com)) and copy its connection string.
3. In `prisma/schema.prisma`, change the datasource provider from `sqlite` to
   `postgresql`.
4. Import the repo into [Vercel](https://vercel.com/new). Set environment
   variables:
   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — a fresh value from `openssl rand -base64 32`
5. Vercel will run `prisma generate` automatically via `postinstall`. After the
   first deploy, run `npx prisma migrate deploy` against the production
   database (via `vercel env pull` locally, or a one-off script) to create the
   tables, then run the seed script once if you want demo data — otherwise
   create your first ADMIN user directly in the database.

## Deploying on Home Assistant OS (NUC or similar)

Home Assistant OS isn't a general-purpose Linux box — it's built around the
Supervisor, which runs everything as Docker containers ("add-ons"). This
repo supports both ways of getting an add-on onto the Supervisor. Either
way, the app keeps everything (SQLite database, session secret) in the
add-on's own persistent storage, with its own port and its own login —
fully independent of Home Assistant's.

### Option A — add as a repository (recommended, no file copying)

This is what `repository.yaml` and the `stable_manager/` folder are for —
Home Assistant clones the repo itself and finds the add-on inside it.

1. In Home Assistant: **Settings → Add-ons → Add-on Store**, open the "⋮"
   menu (top right) → **Repositories**, and paste:
   `https://github.com/arthurbabu/StableManager` → **Add**.
2. Close that dialog; "Stable Manager" now appears as an installable add-on
   in the store (scroll down, it's under its own repository section, not
   "Local add-ons").
3. Continue at **Configure & start** below.

Pushing new commits to `main` doesn't auto-update installed add-ons —
click **Check for updates** in the store's "⋮" menu, then **Update** on the
add-on's page, whenever you want it to pick up changes.

### Option B — local add-on (no GitHub push required)

Useful if you're testing changes before pushing, or don't want the
Supervisor pulling from GitHub at all.

1. **Get filesystem access to the NUC.** Turn on "Advanced Mode" on your HA
   user profile (click your name, bottom left), then install either the
   **Samba share** add-on (drag-and-drop from your PC/Mac) or
   **Terminal & SSH** (command-line) from the Add-on Store.
2. Copy this whole repository to `/addons/stable_manager/` on the NUC (via
   the Samba share, or `git clone` / `scp` over SSH). `config.yaml` and
   `Dockerfile` at the repo root are what mark it as an add-on folder.
3. In the HA UI: **Settings → Add-ons → Add-on Store**, "⋮" menu →
   **Check for updates**. "Stable Manager" appears under **Local add-ons**.
4. Continue at **Configure & start** below.

### Configure & start (both options)

1. Open the add-on, go to **Install** (several minutes the first
   time — it's building the Docker image on the NUC).
2. Go to the **Configuration** tab and set `admin_email` and
   `admin_password` (8+ characters) — this creates your one and only
   auto-provisioned account, with the ADMIN role. Leave `auth_secret` blank;
   one is generated and persisted for you on first start. Save.
3. **Start** the add-on, and check the **Log** tab for
   "Starting Stable Manager on 0.0.0.0:3000...".
4. From any phone or PC on your home network, open
   `http://<nuc-ip-or-hostname>:3000` and log in with the admin account from
   step 2. From there, use **Staff Accounts** to create real logins for the
   rest of the team — neither path seeds any demo data.

This deploys for **home-network access only**. To also reach it away from
home, you'd need your own port-forward + dynamic DNS + TLS setup (there's no
built-in Ingress/remote-access wiring here) — worth doing only if you
specifically need that; it's a materially bigger setup than the above.

Under the hood, `stable_manager/Dockerfile` (used by Option A) builds by
cloning this same repo at build time, since Supervisor restricts a
repository add-on's build context to its own subfolder — it can't reach the
actual app source living at the repo root. `Dockerfile` at the repo root
(used by Option B, and for plain `docker build .` elsewhere) builds directly
from the checked-out files instead. Both produce the same app; keep them in
sync if you change the build steps.

See `DOCS.md` for the same instructions in the format Home Assistant shows
in the add-on's own Documentation tab, including backup notes.

## Notes

- Sessions use JWTs, so there's no session table — nothing to clean up.
- All mutations go through server actions in each feature's `actions.ts`,
  each of which re-checks the caller's role server-side (the UI hiding a
  button is not the security boundary).
