FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi \
  && npm rebuild
COPY . .
CMD ["npm", "start"]
