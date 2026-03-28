FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Configure npm for better network reliability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set registry https://registry.npmjs.org/

# Install dependencies with retry logic
# Retry up to 3 times with exponential backoff
RUN for i in 1 2 3; do \
      echo "Attempt $i: Installing npm packages..." && \
      npm install --legacy-peer-deps --no-audit --no-fund && \
      break || \
      (echo "Attempt $i failed, waiting before retry..." && sleep $((i * 10))); \
    done

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set production environment variables
ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1

# Build static web app for production
RUN npx expo export --platform web --output-dir dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/ || exit 1

# Start the Hono server
CMD ["npx", "tsx", "backend/full-server.ts"]