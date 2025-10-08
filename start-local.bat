@echo off
echo 🚀 Запуск приложения локально...

REM Проверяем наличие node_modules
if not exist "node_modules" (
    echo 📦 Устанавливаем зависимости...
    npm install
)

REM Проверяем наличие Prisma клиента
if not exist "lib\generated\prisma" (
    echo 🗄️ Генерируем Prisma клиент...
    npx prisma generate
)

REM Запускаем приложение
echo 🌐 Запускаем веб-версию...
npm run start-web
