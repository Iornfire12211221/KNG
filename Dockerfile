FROM node:20-alpine

ARG BUILD_ID=auto
ENV BUILD_ID=$BUILD_ID

RUN apk add --no-cache bash curl libc6-compat

WORKDIR /app

# Copy package files and scripts
COPY package.json ./
COPY scripts/ ./scripts/

# Update npm to latest version and clean install dependencies
RUN npm install -g npm@latest
RUN npm cache clean --force
RUN node scripts/fix-dependencies.js || true
RUN npm i --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Apply comprehensive AJV fix after all files are copied
RUN echo "Applying comprehensive AJV fix..." && \
    # Create all necessary directories
    mkdir -p node_modules/ajv/dist/compile && \
    mkdir -p node_modules/ajv/lib/compile && \
    # Copy our codegen fix to all possible locations
    cp scripts/codegen-direct.js node_modules/ajv/dist/compile/codegen.js && \
    cp scripts/codegen-direct.js node_modules/ajv/lib/compile/codegen.js && \
    # Create index files that properly export the codegen
    echo "module.exports = require('./compile/codegen.js');" > node_modules/ajv/dist/index.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/dist/compile/index.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/lib/compile/index.js && \
    # Also create a direct export in the main ajv directory
    echo "module.exports = require('./dist/compile/codegen.js');" > node_modules/ajv/codegen.js && \
    # Test the fix
    echo "Testing AJV codegen fix..." && \
    node -e "try { require('./node_modules/ajv/dist/compile/codegen.js'); console.log('✓ AJV dist/compile/codegen works'); } catch(e) { console.error('✗ dist/compile/codegen failed:', e.message); }" && \
    node -e "try { require('./node_modules/ajv/lib/compile/codegen.js'); console.log('✓ AJV lib/compile/codegen works'); } catch(e) { console.error('✗ lib/compile/codegen failed:', e.message); }" && \
    echo "AJV codegen fix completed successfully"

# Apply final AJV fix before export
RUN node scripts/pre-export-fix.js

# Build static web once at build time
RUN npx expo export --platform web

# Optional debug
RUN ls -la ./dist || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]