FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy only the minimal server
COPY backend/minimal-server.js ./

# No dependencies needed for minimal server

# Set production environment variables
ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1

# Skip Expo build for simple server
# RUN npx expo export --platform web --output-dir dist

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

# Start the application
CMD ["node", "minimal-server.js"]