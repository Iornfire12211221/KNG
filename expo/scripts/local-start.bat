@echo off
echo Starting local development...

if not exist "node_modules" (
    echo Installing dependencies...
    npm install --legacy-peer-deps
)

if not exist "lib\generated\prisma" (
    echo Generating Prisma client...
    npx prisma generate
)

echo Starting web version...
npm run start-web
