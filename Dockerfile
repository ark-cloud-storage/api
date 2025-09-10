# Build Image
FROM node:lts AS build

# Install required tools
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=build

# Use non-root user
USER node
WORKDIR /home/node

# Copy package files and prisma schema
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
COPY --chown=node:node ./prisma ./prisma

# Install deps and generate Prisma client
RUN npm clean-install
RUN npx prisma generate

# Copy source files
COPY --chown=node:node ./src ./src
COPY --chown=node:node ./tsconfig.json ./tsconfig.json
COPY --chown=node:node ./tsconfig.build.json ./tsconfig.build.json

# Build and prune dev deps
RUN npm run build && \
    npm prune --production

# Run Image
FROM node:lts

ENV NODE_ENV=production

USER node
WORKDIR /home/node

# Copy built artifacts and dependencies from build stage
COPY --from=build --chown=node:node /home/node/package*.json ./
COPY --from=build --chown=node:node /home/node/node_modules/ ./node_modules/
COPY --from=build --chown=node:node /home/node/dist ./dist/
COPY --from=build --chown=node:node /home/node/prisma ./prisma/

# Start the application
CMD ["node", "dist/main"]
