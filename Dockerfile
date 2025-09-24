FROM node:20-alpine

ARG BUILD_ID=auto
ENV BUILD_ID=$BUILD_ID

RUN apk add --no-cache bash curl libc6-compat

WORKDIR /app

# Install only package manifest first
COPY package.json .npmrc ./
ENV npm_config_legacy_peer_deps=true
RUN npm i --no-audit --no-fund --legacy-peer-deps && \
    npm i --no-save ajv@^8.17.1 ajv-keywords@^5.1.0 schema-utils@^4.2.0 --legacy-peer-deps && \
    node -e "const fs=require('fs'),p=require('path').join(process.cwd(),'node_modules','ajv','dist','compile');fs.mkdirSync(p,{recursive:true});const f=require('path').join(p,'codegen.js');if(!fs.existsSync(f)){fs.writeFileSync(f,'module.exports = {};');console.log('Shim created at',f)}else{console.log('Shim exists at',f)}" && \
    node -e "try{console.log('AJV',require('ajv/package.json').version);console.log('AJV-KEYWORDS',require('ajv-keywords/package.json').version);console.log('SCHEMA-UTILS',require('schema-utils/package.json').version);}catch(e){console.error('Version check failed',e);process.exit(1);}"

# Copy rest of the app
COPY . .

ENV NODE_ENV=production
ENV EXPO_NON_INTERACTIVE=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_USE_FAST_RESOLVER=1
ENV CI=1

# Ensure Node can resolve the shim at runtime for any deep import
ENV NODE_OPTIONS="--max-old-space-size=4096 -r ./scripts/ajv-codegen-shim.js"

# Build web with explicit shim preload (works with older expo-router plugin)
RUN node -r ./scripts/ajv-codegen-shim.js ./node_modules/expo/bin/cli export --platform web --output-dir dist --clear --non-interactive || \
    (echo 'Retrying export with npx...' && NODE_OPTIONS="--max-old-space-size=4096 -r ./scripts/ajv-codegen-shim.js" npx expo export --platform web --output-dir dist --clear --non-interactive)

RUN ls -la ./dist || true && ls -la ./dist/_expo || true && head -n 20 ./dist/index.html || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]
