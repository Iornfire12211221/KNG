#!/bin/bash

echo "🚀 Запуск приложения локально..."

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

# Проверяем наличие Prisma клиента
if [ ! -d "lib/generated/prisma" ]; then
    echo "🗄️ Генерируем Prisma клиент..."
    npx prisma generate
fi

# Запускаем приложение
echo "🌐 Запускаем веб-версию..."
npm run start-web
