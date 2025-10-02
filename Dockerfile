FROM oven/bun:1-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock* ./
RUN bun install --ci

# Copy the rest of the source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1

# Build static web app (Expo exports to ./dist)
RUN bunx expo export --platform web

# Helpful debug output
RUN ls -la ./dist || true
RUN ls -la ./dist/_expo || true
RUN head -n 20 ./dist/index.html || true

EXPOSE 8081

CMD ["bun", "run", "backend/hono.ts"]