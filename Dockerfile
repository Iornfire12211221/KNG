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

# Fix AJV codegen issue with comprehensive approach
RUN echo "Fixing AJV codegen issue..." && \
    mkdir -p node_modules/ajv/dist/compile && \
    mkdir -p node_modules/ajv/dist && \
    cp scripts/codegen-direct.js node_modules/ajv/dist/compile/codegen.js && \
    echo "module.exports = require('./compile/codegen.js');" > node_modules/ajv/dist/index.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/dist/compile/index.js && \
    echo "AJV codegen fix applied" && \
    ls -la node_modules/ajv/dist/ && \
    ls -la node_modules/ajv/dist/compile/ && \
    echo "Testing ajv codegen import..." && \
    node -e "try { require('./node_modules/ajv/dist/compile/codegen.js'); console.log('✓ AJV codegen import successful'); } catch(e) { console.error('✗ AJV codegen import failed:', e.message); }"

# Copy the rest of the app
COPY . .

# Apply AJV fix again before export (in case of any overwrites)
RUN echo "Re-applying AJV fix before export..." && \
    cp scripts/codegen-direct.js node_modules/ajv/dist/compile/codegen.js && \
    node -e "try { require('./node_modules/ajv/dist/compile/codegen.js'); console.log('✓ AJV codegen ready for export'); } catch(e) { console.error('✗ AJV codegen failed:', e.message); process.exit(1); }"

# Build static web once at build time
RUN npx expo export --platform web

# Optional debug
RUN ls -la ./dist || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]