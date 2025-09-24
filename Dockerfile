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

# Fix AJV codegen issue immediately after install
RUN echo "Fixing AJV codegen issue..." && \
    mkdir -p node_modules/ajv/dist/compile && \
    cp scripts/codegen-direct.js node_modules/ajv/dist/compile/codegen.js && \
    echo "AJV codegen fix applied" && \
    ls -la node_modules/ajv/dist/compile/

# Copy the rest of the app
COPY . .

# Build static web once at build time
RUN npx expo export --platform web

# Optional debug
RUN ls -la ./dist || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]