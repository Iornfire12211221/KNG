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
ENV PORT=3000
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1
ENV DATABASE_URL="postgresql://gen_user:Dima122111@5b185a49c11b0959c8173153.twc1.net:5432/default_db"

# Build static web app (Expo exports to ./dist)
RUN bunx expo export --platform web

# Helpful debug output
RUN ls -la ./dist || true
RUN ls -la ./dist/_expo || true
RUN head -n 20 ./dist/index.html || true

# Ensure certs directory exists and is readable
RUN ls -la ./certs || echo "No certs directory"

EXPOSE 3000

# Start with database migration and then run the app
CMD ["sh", "-c", "bunx prisma db push --skip-generate && bun run backend/hono.ts"]