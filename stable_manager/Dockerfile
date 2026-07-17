# This is the "install via repository" variant of the root Dockerfile.
# Home Assistant's Supervisor builds a repository add-on using only the
# contents of its own subfolder as the Docker build context — it can't
# COPY files from the parent repo. So instead of COPY, this clones a fresh
# checkout of the app at build time and builds that. Keep this in sync with
# the root Dockerfile if that one changes (same base image, same build
# steps) — the only structural difference is this clone step.
FROM node:20-bookworm-slim

# openssl: required by Prisma's query engine on Debian.
# jq: used by run.sh to read Home Assistant's /data/options.json.
# git: to pull the actual app source (see comment above).
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates jq git \
  && rm -rf /var/lib/apt/lists/*

ARG REPO_URL=https://github.com/arthurbabu/StableManager.git
ARG REPO_REF=main

WORKDIR /app

# Docker caches `RUN git clone ...` by the command *text*, not by what it
# actually fetches — so without this, every rebuild (even after bumping
# config.yaml's version) would silently reuse the very first clone forever,
# never picking up new commits. Fetching the branch's latest commit SHA into
# a file first forces a cache miss whenever it's actually changed, since
# that's a genuinely different preceding layer.
ADD https://api.github.com/repos/arthurbabu/StableManager/commits/main /tmp/cache_bust.json
RUN git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" .

# `npm install` rather than `npm ci`: the lockfile was last generated with a
# newer npm than the one bundled in this image, and different npm majors can
# resolve transitive deps (e.g. @swc/helpers) slightly differently — `npm ci`
# fails hard on that drift, `npm install` reconciles it. No downside here
# since the resulting lockfile changes stay inside this ephemeral build.
RUN npm install

# `next build` doesn't connect to the database (every route in this app is
# dynamic — none are statically prerendered) but Prisma's schema loader still
# wants DATABASE_URL *defined* to validate the schema. These are passed
# inline to only the commands that need them, NOT via `ENV` — `ENV` persists
# into the running container's environment too, which would make run.sh's
# `${DATABASE_URL:-...}` / `${AUTH_SECRET:-...}` fallbacks never trigger
# (they only apply when a variable is unset, and ENV would leave it set to
# these placeholders) — silently pointing the app at a throwaway database
# outside the persistent /data volume, and worse, running with a hardcoded,
# publicly-known session secret.
RUN DATABASE_URL="file:./build-placeholder.db" npx prisma generate
RUN DATABASE_URL="file:./build-placeholder.db" AUTH_SECRET="build-time-placeholder-not-used-at-runtime" npm run build

ENV NODE_ENV=production
RUN chmod +x run.sh

EXPOSE 3000
VOLUME ["/data"]

CMD ["./run.sh"]
