FROM node:20-bullseye-slim AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 8000
CMD ["npm", "start"]
