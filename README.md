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
| manager@stable.test | password123 | MANAGER |
| jamie@stable.test | password123 | STAFF |
| taylor@stable.test | password123 | STAFF |

Change these passwords (or deactivate the accounts) before using this with real data.

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
prisma/seed.ts             Demo data
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

## Notes

- Sessions use JWTs, so there's no session table — nothing to clean up.
- All mutations go through server actions in each feature's `actions.ts`,
  each of which re-checks the caller's role server-side (the UI hiding a
  button is not the security boundary).
