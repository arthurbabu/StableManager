# Stable Manager

Staff planning, vacations, competitions, and horse care — a self-contained
web app that runs entirely on your own NUC.

## Configuration

Set these under the **Configuration** tab before starting the add-on:

| Option | Required | Description |
|---|---|---|
| `admin_email` | Yes | Login email for your first (and only auto-created) account, with the ADMIN role. |
| `admin_password` | Yes | 8+ characters. |
| `admin_name` | No | Display name for that account. Defaults to "Admin". |
| `auth_secret` | No | Leave blank — a random one is generated and stored in the add-on's persistent storage on first start, and reused after that. Only set this yourself if you're restoring a backup and need sessions to remain valid across a reinstall. |

The admin account is created **once**, the first time the add-on starts with
an empty database. After that, use the app's own "Staff Accounts" page
(as that admin) to create real logins for the rest of your team — this
add-on does not seed any demo data.

## Accessing it

Once started, open `http://<your-nuc-ip-or-hostname>:3000` from any browser
on your home network — phone, tablet, or PC. On an iPhone, open it in Safari
and use Share → **Add to Home Screen** for an app-like icon.

## Data & backups

All data (the SQLite database, and the generated session secret) lives in
this add-on's persistent `/data` folder, which survives restarts and add-on
updates. The simplest way to back it up is Home Assistant's own backup
system — Settings → System → Backups — which includes every add-on's
persistent data automatically when you create a full or partial backup.
