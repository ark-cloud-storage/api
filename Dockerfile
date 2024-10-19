# Build Image
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
RUN npm run build && \
    npm prune --production

# Run Image
FROM node:lts-alpine

ENV NODE_ENV=production

USER node
WORKDIR /home/node

COPY --from=build --chown=node:node /home/node/package*.json ./
COPY --from=build --chown=node:node /home/node/node_modules/ ./node_modules/
COPY --from=build --chown=node:node /home/node/dist ./dist/

CMD ["node", "dist/main"]
