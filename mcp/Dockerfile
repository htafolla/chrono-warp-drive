FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi \
  && npm rebuild
COPY . .
# Railway runs `tsx` from the service start command. Nixpacks put
# node_modules/.bin on PATH. This image does not, so the process never starts.
ENV PATH="/app/node_modules/.bin:${PATH}"
CMD ["npm", "start"]
