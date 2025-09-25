FROM node:20-alpine

ARG BUILD_ID=auto
ENV BUILD_ID=$BUILD_ID

RUN apk add --no-cache bash curl libc6-compat

WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies
RUN npm i --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Fix AJV dependencies before any expo commands
RUN node scripts/fix-dependencies.js

# Try to build web export, but don't fail if it doesn't work
RUN npx expo export --platform web || echo "Expo export failed, continuing with API-only mode"

ENV NODE_ENV=production

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]