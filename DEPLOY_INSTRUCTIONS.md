# 🚀 Инструкция по деплою на Timeweb

## ✅ Что уже готово

Ваше приложение полностью оптимизировано для деплоя на Timeweb как Telegram WebApp:

- ✅ **Telegram WebApp интеграция** - полная поддержка
- ✅ **Docker конфигурация** - готова к деплою
- ✅ **Оптимизированная сборка** - быстрая загрузка
- ✅ **Безопасность** - настроена для продакшена
- ✅ **Мета-теги** - для Telegram WebApp

## 🎯 Шаги деплоя

### 1. Подготовка на Timeweb

1. **Создайте VPS сервер** на Timeweb
2. **Установите Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Установите Docker Compose**:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

### 2. Загрузка проекта

1. **Загрузите файлы** на сервер:
   - `Dockerfile`
   - `docker-compose.yml`
   - `package.json`
   - `app.json`
   - `web/index.html`
   - Весь код проекта

2. **Или клонируйте репозиторий**:
   ```bash
   git clone <your-repo>
   cd kng
   ```

### 3. Настройка переменных окружения

Создайте файл `.env`:
```env
NODE_ENV=production
DATABASE_URL=postgresql://gen_user:Dima122111@5b185a49c11b0959c8173153.twc1.net:5432/default_db
EXPO_USE_FAST_RESOLVER=1
EXPO_NO_TELEMETRY=1
```

### 4. Деплой

```bash
# Соберите и запустите
docker-compose up -d --build

# Проверьте статус
docker-compose ps

# Посмотрите логи
docker-compose logs -f app
```

### 5. Настройка домена

1. **Настройте DNS** для вашего домена на Timeweb
2. **Обновите docker-compose.yml**:
   ```yaml
   labels:
     - "traefik.http.routers.telegram-app.rule=Host(`your-domain.timeweb.ru`)"
   ```

### 6. Настройка Telegram Bot

1. **Получите URL** вашего приложения: `https://your-domain.timeweb.ru`
2. **В BotFather** установите Web App URL:
   ```
   /setmenubutton
   @your_bot_name
   Карта ДПС - https://your-domain.timeweb.ru
   ```

## 🔧 Полезные команды

```bash
# Перезапуск приложения
docker-compose restart

# Обновление приложения
docker-compose down
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f app

# Остановка
docker-compose down

# Проверка статуса
docker-compose ps
```

## 📱 Тестирование

1. **Откройте ваш бот** в Telegram
2. **Нажмите на кнопку меню** "Карта ДПС"
3. **Должно открыться** ваше приложение с картой

## 🎉 Готово!

Ваше приложение готово к использованию как Telegram WebApp на Timeweb!

### Особенности:
- 🚀 **Быстрая загрузка** - оптимизированная сборка
- 📱 **Telegram интеграция** - полная поддержка WebApp API
- 🗺️ **Карты** - Mapbox для веб, React Native Maps для мобильных
- 🤖 **AI модерация** - умная система модерации
- 💬 **Чат** - реальное время общения
- 👑 **Админ панель** - управление контентом

**Удачи с деплоем!** 🎯
