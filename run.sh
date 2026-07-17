#!/usr/bin/env bash
set -e

# Two ways to configure this container:
#  1. As a Home Assistant add-on: the Supervisor writes the options set in
#     the add-on's "Configuration" tab to /data/options.json.
#  2. As a plain `docker run`: pass ADMIN_EMAIL / ADMIN_PASSWORD / etc. as
#     regular -e environment variables instead.
# Explicit env vars always win if both are present.
if [ -f /data/options.json ]; then
  ADMIN_EMAIL="${ADMIN_EMAIL:-$(jq -r '.admin_email // empty' /data/options.json)}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(jq -r '.admin_password // empty' /data/options.json)}"
  ADMIN_NAME="${ADMIN_NAME:-$(jq -r '.admin_name // empty' /data/options.json)}"
  AUTH_SECRET="${AUTH_SECRET:-$(jq -r '.auth_secret // empty' /data/options.json)}"
fi

ADMIN_NAME="${ADMIN_NAME:-Admin}"
export DATABASE_URL="${DATABASE_URL:-file:/data/stable-manager.db}"

# Belt and suspenders alongside `trustHost: true` in src/auth.ts — this
# beta version of Auth.js has been inconsistent about which internal code
# path actually reads the code-level option, so set the env var it falls
# back to as well. Needed because this app is reached via a LAN IP that
# has no fixed canonical domain to validate the Host header against.
export AUTH_TRUST_HOST=true

mkdir -p /data

# Generate AUTH_SECRET once and persist it to /data, so sessions survive
# container restarts even if the add-on option is left blank. If the option
# (or env var) IS set explicitly, that always takes priority.
if [ -z "$AUTH_SECRET" ]; then
  if [ -f /data/.auth_secret ]; then
    AUTH_SECRET="$(cat /data/.auth_secret)"
  else
    AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
    echo -n "$AUTH_SECRET" > /data/.auth_secret
  fi
fi
export AUTH_SECRET

echo "Applying database migrations..."
npx prisma migrate deploy

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" ADMIN_NAME="$ADMIN_NAME" npx tsx prisma/bootstrap-admin.ts
else
  echo "No ADMIN_EMAIL/ADMIN_PASSWORD provided — skipping first-run admin bootstrap."
fi

echo "Starting Stable Manager on 0.0.0.0:3000..."
exec npx next start -H 0.0.0.0 -p 3000
