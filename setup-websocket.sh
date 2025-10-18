#!/bin/bash

# 🔌 Автоматическая настройка WebSocket сервера
# Запустите этот скрипт на сервере: bash setup-websocket.sh

set -e

echo "🚀 Начинаем настройку WebSocket сервера..."

# 1. Проверяем, что мы в директории проекта
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Ошибка: docker-compose.yml не найден!"
    echo "📁 Перейдите в директорию проекта и запустите скрипт снова"
    exit 1
fi

echo "✅ Директория проекта найдена"

# 2. Проверяем, открыт ли порт 8080
echo "🔍 Проверяем порт 8080..."
if netstat -tuln 2>/dev/null | grep -q ":8080 "; then
    echo "✅ Порт 8080 уже открыт"
else
    echo "🔓 Открываем порт 8080..."
    
    # Пробуем ufw
    if command -v ufw &> /dev/null; then
        ufw allow 8080/tcp
        ufw allow 8081/tcp
        ufw reload
        echo "✅ Порт 8080 открыт через ufw"
    else
        # Пробуем iptables
        if command -v iptables &> /dev/null; then
            iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
            iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
            echo "✅ Порт 8080 открыт через iptables"
        else
            echo "⚠️ Не удалось открыть порт автоматически"
            echo "📝 Откройте порт 8080 вручную в настройках firewall"
        fi
    fi
fi

# 3. Обновляем код
echo "📥 Обновляем код из Git..."
git pull origin main

# 4. Останавливаем старые контейнеры
echo "🛑 Останавливаем старые контейнеры..."
docker-compose down

# 5. Пересобираем образ
echo "🔨 Пересобираем Docker образ..."
docker-compose build --no-cache

# 6. Запускаем контейнеры
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# 7. Ждем 10 секунд, чтобы контейнеры запустились
echo "⏳ Ждем запуска контейнеров..."
sleep 10

# 8. Проверяем статус
echo "🔍 Проверяем статус контейнеров..."
docker-compose ps

# 9. Проверяем порты
echo "🔍 Проверяем открытые порты..."
netstat -tuln | grep -E '8080|8081' || ss -tuln | grep -E '8080|8081'

# 10. Проверяем логи WebSocket
echo "📋 Последние логи WebSocket сервера:"
docker-compose logs | grep -E 'WebSocket|8080' | tail -20

# 11. Проверяем health check
echo "🏥 Проверяем health check..."
sleep 5
curl -s http://localhost:8081/api/health || echo "⚠️ Health check не отвечает"

# 12. Проверяем WebSocket статистику
echo "📊 Проверяем WebSocket статистику..."
curl -s http://localhost:8080/api/ws/stats || echo "⚠️ WebSocket не отвечает"

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте логи: docker-compose logs -f"
echo "2. Откройте https://24dps.ru/ в браузере"
echo "3. Зайдите в админ панель и проверьте логи"
echo "4. Должно быть: '⚠️ WebSocket disabled - server not configured'"
echo ""
echo "🔧 Если WebSocket работает, включите его в коде:"
echo "   - hooks/useRealTimeUpdates.tsx: enabled: true"
echo "   - hooks/useNotifications.tsx: удалите строки с 'return'"
echo "   - git commit -m 'enable websocket'"
echo "   - git push origin main"
echo ""
echo "🆘 Если что-то не работает, проверьте логи:"
echo "   docker-compose logs -f | grep -E 'WebSocket|8080'"

