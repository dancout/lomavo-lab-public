FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc

FROM node:20-alpine

# SSH client for mcp-docker remote commands, docker-cli for local container management
RUN apk add --no-cache openssh-client docker-cli

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/dist dist/

# Server entry point set via docker-compose command
CMD ["node", "dist/homelab/index.js"]
