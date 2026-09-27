# Weekly Redis backup only. This image does not include or start the MCP app.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends redis-tools ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY bin/redis-weekly-backup.mjs /app/bin/redis-weekly-backup.mjs

USER node
CMD ["node", "bin/redis-weekly-backup.mjs"]
