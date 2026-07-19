# Build Image (all deps, compiles TS, generates Prisma client)
FROM node:lts-alpine AS build

RUN apk add --no-cache git

ENV NODE_ENV=build

USER node
WORKDIR /home/node

COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
COPY --chown=node:node ./prisma ./prisma
RUN npm clean-install
RUN npx prisma generate

COPY --chown=node:node ./src ./src
COPY --chown=node:node ./tsconfig.json ./tsconfig.json
COPY --chown=node:node ./tsconfig.build.json ./tsconfig.build.json
RUN npm run build

# Production-only dependency tree for the lean api image
FROM build AS prune
RUN npm prune --production

# Migrate Image: retains the full dependency tree (Prisma CLI + engines),
# migrations, and the compiled backfill script. One-shot; exits after running.
FROM node:lts-alpine AS migrate

ENV NODE_ENV=production

USER node
WORKDIR /home/node

COPY --from=build --chown=node:node /home/node/package*.json ./
COPY --from=build --chown=node:node /home/node/node_modules/ ./node_modules/
COPY --from=build --chown=node:node /home/node/prisma/ ./prisma/
COPY --from=build --chown=node:node /home/node/dist/ ./dist/

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/db/migrate-secrets.js"]

# Run Image (api) — MUST remain the final stage so the default build targets it
FROM node:lts-alpine AS api

ENV NODE_ENV=production

USER node
WORKDIR /home/node

COPY --from=prune --chown=node:node /home/node/package*.json ./
COPY --from=prune --chown=node:node /home/node/node_modules/ ./node_modules/
COPY --from=prune --chown=node:node /home/node/dist/ ./dist/
COPY --from=prune --chown=node:node /home/node/prisma/ ./prisma/

CMD ["node", "dist/main"]
