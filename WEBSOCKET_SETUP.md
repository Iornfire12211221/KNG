# 🔌 Настройка WebSocket Сервера

## 📋 Текущая ситуация

WebSocket **отключен** в приложении до настройки сервера. Приложение будет работать без real-time уведомлений.

## 🔧 Что нужно сделать на сервере

### 1. Проверьте, запущен ли WebSocket сервер

```bash
# Подключитесь к серверу
ssh root@24dps.ru

# Перейдите в директорию проекта
cd /path/to/KNG-4

# Проверьте, запущен ли WebSocket сервер на порту 8080
netstat -tuln | grep 8080
# или
ss -tuln | grep 8080
```

### 2. Проверьте docker-compose.yml

Убедитесь, что WebSocket сервер запускается вместе с основным приложением:

```yaml
services:
  app:
    build: .
    ports:
      - "8081:8081"  # HTTP сервер
      - "8080:8080"  # WebSocket сервер
    environment:
      - NODE_ENV=production
```

### 3. Проверьте backend/full-server.ts

Убедитесь, что WebSocket сервер инициализируется:

```typescript
import { wsManager } from './websocket-server';

// После создания HTTP сервера
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Запускаем WebSocket сервер
  wsManager.start(server, 8080);
});
```

### 4. Перезапустите Docker контейнеры

```bash
cd /path/to/KNG-4
docker-compose down
docker-compose up --build -d
docker-compose logs -f
```

### 5. Проверьте логи

Вы должны увидеть:

```
✅ WebSocket server started on port 8080
🔌 User user_6014412239 connected. Total users: 1
```

### 6. Проверьте подключение

Откройте приложение в браузере и проверьте логи:

```
🔌 Attempting WebSocket connection to: wss://24dps.ru/ws?userId=user_6014412239&token=user_6014412239
✅ WebSocket подключен
```

## ✅ Включение WebSocket в приложении

После настройки сервера, включите WebSocket:

### 1. hooks/useRealTimeUpdates.tsx

```typescript
const DEFAULT_SETTINGS: WebSocketSettings = {
  enabled: true, // ВКЛЮЧИТЬ
  url: 'wss://24dps.ru/ws',
  // ...
};
```

### 2. hooks/useNotifications.tsx

```typescript
// Удалите эти строки:
console.log('⚠️ WebSocket отключен - сервер не настроен');
return;

// Оставьте:
const wsUrl = 'wss://24dps.ru/ws';
const ws = new WebSocket(`${wsUrl}?userId=${currentUser.id}`);
```

### 3. Задеплойте изменения

```bash
git add hooks/useRealTimeUpdates.tsx hooks/useNotifications.tsx
git commit -m "feat: enable WebSocket after server setup"
git push origin main
```

## 🔍 Диагностика проблем

### Проблема: WebSocket код 1006 (Abnormal Closure)

**Причина:** Сервер не отвечает или не запущен

**Решение:**
1. Проверьте, запущен ли WebSocket сервер: `netstat -tuln | grep 8080`
2. Проверьте логи Docker: `docker-compose logs -f`
3. Проверьте, открыт ли порт 8080 в firewall

### Проблема: WebSocket код 1008 (Policy Violation)

**Причина:** Неверный токен или userId

**Решение:**
1. Проверьте, что токен совпадает с userId
2. Проверьте логи сервера на наличие ошибок аутентификации

### Проблема: Connection refused

**Причина:** Порт 8080 не открыт или сервер не запущен

**Решение:**
1. Проверьте firewall: `ufw status`
2. Откройте порт: `ufw allow 8080/tcp`
3. Перезапустите Docker: `docker-compose restart`

## 📊 Мониторинг WebSocket

### Проверка подключенных пользователей

```bash
# В логах Docker
docker-compose logs -f | grep "WebSocket"
```

### Проверка статистики

WebSocket сервер автоматически логирует:
- Количество подключенных пользователей
- Время последнего ping
- Ошибки подключения

## 🚀 Production рекомендации

1. **Используйте Nginx** для проксирования WebSocket:
   ```nginx
   location /ws {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

2. **Настройте SSL** для WebSocket:
   ```nginx
   location /ws {
       proxy_pass wss://24dps.ru:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

3. **Мониторинг** WebSocket соединений:
   - Используйте `wsManager.getStats()` для получения статистики
   - Настройте алерты при превышении лимита подключений

## 📝 Примечания

- WebSocket работает на порту **8080**
- HTTP сервер работает на порту **8081**
- WebSocket использует путь `/ws`
- Токен должен совпадать с userId для безопасности

