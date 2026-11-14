# Strapi necesita un proceso persistente: despliégalo con este Dockerfile en
# Railway, Render, Fly.io, un VPS o similar (no en funciones serverless de Vercel).
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 1337
CMD ["npm", "run", "start"]
