#!/bin/bash

# Скрипт для деплоя Telegram WebApp на Timeweb

echo "🚀 Начинаем деплой Telegram WebApp на Timeweb..."

# 1. Сборка приложения
echo "📦 Собираем приложение..."
npm run build-prod

# 2. Копируем кастомный HTML для Telegram WebApp
echo "📄 Копируем кастомный HTML..."
cp web/index.html dist/index.html

# 3. Сборка Docker образа
echo "🐳 Собираем Docker образ..."
docker build -t telegram-dps-app .

# 4. Запуск через docker-compose
echo "🚀 Запускаем приложение..."
docker-compose up -d --build

echo "✅ Деплой завершен!"
echo "📱 Приложение доступно по адресу: http://localhost:8081"
echo "🔗 Для Telegram WebApp используйте ваш домен Timeweb"

# Показать логи
echo "📋 Логи приложения:"
docker-compose logs -f app
