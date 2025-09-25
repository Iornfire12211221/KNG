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

# Apply AJV fix using our script
RUN node scripts/fix-dependencies.js

# Verify the fix works
RUN node -e "try { const ajv = require('./node_modules/ajv/dist/compile/codegen.js'); if (ajv.CodeGen) { console.log('✓ AJV codegen verified - CodeGen class found'); } else { throw new Error('CodeGen not found'); } } catch(e) { console.error('✗ AJV verification failed:', e.message); process.exit(1); }"

# Run pre-export fix and build
RUN node scripts/pre-export-fix.js && npx expo export --platform web

# Optional debug
RUN ls -la ./dist || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]