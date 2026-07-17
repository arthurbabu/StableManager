# Single-stage build: keeps the full node_modules (including devDependencies
# like `tsx`, used by the admin-bootstrap script, and `typescript`, needed to
# read next.config.ts at runtime) rather than Next's trace-based "standalone"
# output. That output mode needs extra care to correctly bundle Prisma's
# native query-engine binaries; the plain full-install approach avoids that
# whole class of packaging bugs at the cost of a larger image — a reasonable
# trade for a NUC with normal disk space.
FROM node:20-bookworm-slim

# openssl: required by Prisma's query engine on Debian.
# jq: used by run.sh to read Home Assistant's /data/options.json.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates jq \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# `npm install` rather than `npm ci`: the lockfile was last generated with a
# newer npm than the one bundled in this image, and different npm majors can
# resolve transitive deps (e.g. @swc/helpers) slightly differently — `npm ci`
# fails hard on that drift, `npm install` reconciles it. No downside here
# since the resulting lockfile changes stay inside this ephemeral build.
RUN npm install

COPY . .

# `next build` doesn't connect to the database (every route in this app is
# dynamic — none are statically prerendered) but sets placeholders anyway in
# case anything reads these at import time. The real values are supplied by
# run.sh at container start.
ENV DATABASE_URL="file:./build-placeholder.db"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
RUN chmod +x run.sh

EXPOSE 3000
VOLUME ["/data"]

CMD ["./run.sh"]
