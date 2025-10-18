# 🚀 Инструкция по деплою на 24dps.ru

## 📋 Информация о сервере

- **Домен:** https://24dps.ru/
- **База данных:** 85.193.89.194:5432
- **Пользователь БД:** gen_user
- **Пароль БД:** Dima122111

## 🔧 Шаги для деплоя

### 1. Подключитесь к серверу

```bash
ssh root@24dps.ru
```

### 2. Перейдите в директорию проекта

```bash
cd /path/to/KNG-4
# или где у вас лежит проект
```

### 3. Обновите код

```bash
git pull origin main
```

### 4. Проверьте, что порты 8080 и 8081 открыты

```bash
# Проверка портов
netstat -tuln | grep -E '8080|8081'
# или
ss -tuln | grep -E '8080|8081'
```

**Ожидаемый результат:**
```
tcp  0  0  0.0.0.0:8080  0.0.0.0:*  LISTEN
tcp  0  0  0.0.0.0:8081  0.0.0.0:*  LISTEN
```

### 5. Если порты не открыты, откройте их

```bash
# Для ufw
ufw allow 8080/tcp
ufw allow 8081/tcp

# Или для iptables
iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
```

### 6. Пересоберите и запустите Docker

```bash
# Остановите старые контейнеры
docker-compose down

# Пересоберите образ
docker-compose build --no-cache

# Запустите контейнеры
docker-compose up -d

# Проверьте статус
docker-compose ps
```

### 7. Проверьте логи

```bash
# Смотрите логи в реальном времени
docker-compose logs -f

# Или только WebSocket логи
docker-compose logs -f | grep -E 'WebSocket|8080'
```

**Ожидаемый результат в логах:**
```
✅ Full server running at http://localhost:8081
🔌 WebSocket server running on port 8080
✅ WebSocket server started on port 8080
```

### 8. Проверьте, что WebSocket работает

```bash
# Проверка WebSocket статистики
curl http://localhost:8080/api/ws/stats

# Проверка health check
curl http://localhost:8081/api/health
```

### 9. Проверьте в браузере

Откройте https://24dps.ru/ в браузере и проверьте:

1. **Админ панель** → **Логи**
2. Должно быть: `✅ WebSocket подключен`
3. Не должно быть: `❌ WebSocket ошибка`

## 🔍 Диагностика проблем

### Проблема: WebSocket код 1006

**Причина:** Сервер не отвечает

**Решение:**
```bash
# Проверьте, запущен ли WebSocket сервер
docker-compose logs | grep "WebSocket server"

# Если не запущен, перезапустите
docker-compose restart
```

### Проблема: Порт 8080 не открыт

**Решение:**
```bash
# Проверьте firewall
ufw status

# Откройте порт
ufw allow 8080/tcp
ufw reload
```

### Проблема: Docker контейнер не запускается

**Решение:**
```bash
# Проверьте логи
docker-compose logs

# Пересоберите образ
docker-compose build --no-cache

# Запустите заново
docker-compose up -d
```

### Проблема: База данных не подключается

**Решение:**
```bash
# Проверьте DATABASE_URL в docker-compose.yml
# Должно быть:
DATABASE_URL=postgresql://gen_user:Dima122111@85.193.89.194:5432/default_db

# Проверьте подключение к БД
psql postgresql://gen_user:Dima122111@85.193.89.194:5432/default_db -c "SELECT 1;"
```

## 📊 Мониторинг

### Проверка статуса контейнеров

```bash
docker-compose ps
```

### Проверка использования ресурсов

```bash
docker stats
```

### Проверка WebSocket подключений

```bash
# В логах
docker-compose logs -f | grep "connected"

# Через API
curl http://localhost:8080/api/ws/stats
```

## 🔄 Обновление приложения

```bash
# 1. Обновите код
git pull origin main

# 2. Пересоберите и перезапустите
docker-compose down
docker-compose up --build -d

# 3. Проверьте логи
docker-compose logs -f
```

## ✅ Чек-лист после деплоя

- [ ] Порты 8080 и 8081 открыты
- [ ] Docker контейнеры запущены
- [ ] WebSocket сервер работает
- [ ] HTTP сервер работает
- [ ] База данных подключена
- [ ] Приложение открывается в браузере
- [ ] WebSocket подключается в админ панели
- [ ] Нет ошибок в логах

## 🆘 Контакты для поддержки

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус: `docker-compose ps`
3. Проверьте порты: `netstat -tuln | grep -E '8080|8081'`

