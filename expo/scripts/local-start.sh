#!/bin/bash
echo "Starting local development..."

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

if [ ! -d "lib/generated/prisma" ]; then
    echo "Generating Prisma client..."
    npx prisma generate
fi

echo "Starting web version..."
npm run start-web
