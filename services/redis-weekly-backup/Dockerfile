# Weekly Redis backup only. This image does not include or start the MCP app.
FROM node:22-bookworm-slim

# redis-tools provides the redis-cli binary. The script logs `redis-cli --version` at start.
RUN apt-get update \
  && apt-get install -y --no-install-recommends redis-tools ca-certificates \
  && redis-cli --version \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/redis-weekly-backup/package.json services/redis-weekly-backup/package-lock.json ./
RUN npm ci --omit=dev

COPY bin/redis-weekly-backup.mjs /app/bin/redis-weekly-backup.mjs

USER node
CMD ["node", "bin/redis-weekly-backup.mjs"]
