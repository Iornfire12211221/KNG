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

# Do NOT run Expo export (avoids ajv/expo toolchain entirely)
# We serve only API unless a prebuilt ./dist is present at runtime

ENV NODE_ENV=production

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]