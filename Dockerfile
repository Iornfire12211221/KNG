FROM node:20-alpine

ARG BUILD_ID=auto
ENV BUILD_ID=$BUILD_ID

RUN apk add --no-cache bash curl libc6-compat

WORKDIR /app

# Copy package files and scripts first
COPY package.json ./
COPY scripts/ ./scripts/

# Update npm to latest version and clean install dependencies
RUN npm install -g npm@latest
RUN npm cache clean --force
RUN node scripts/fix-dependencies.js || true
RUN npm i --no-audit --no-fund --legacy-peer-deps

# Apply AJV fix immediately after npm install
RUN echo "Applying AJV fix after npm install..." && \
    mkdir -p node_modules/ajv/dist/compile && \
    mkdir -p node_modules/ajv/lib/compile && \
    cp scripts/codegen-direct.js node_modules/ajv/dist/compile/codegen.js && \
    cp scripts/codegen-direct.js node_modules/ajv/lib/compile/codegen.js && \
    echo "module.exports = require('./compile/codegen.js');" > node_modules/ajv/dist/index.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/dist/compile/index.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/lib/compile/index.js && \
    echo "module.exports = require('./dist/compile/codegen.js');" > node_modules/ajv/codegen.js && \
    echo "✓ AJV fix applied after npm install"

# Copy the rest of the app
COPY . .

# Verify AJV fix is still in place
RUN echo "Verifying AJV fix..." && \
    ls -la node_modules/ajv/dist/compile/codegen.js && \
    node -e "try { require('./node_modules/ajv/dist/compile/codegen.js'); console.log('✓ AJV codegen verified'); } catch(e) { console.error('✗ AJV codegen failed:', e.message); exit(1); }"

# Apply final AJV fix before export
RUN node scripts/pre-export-fix.js

# Build static web once at build time
RUN npx expo export --platform web

# Optional debug
RUN ls -la ./dist || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]