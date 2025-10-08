# Карта ДПС Кингисепп - Telegram WebApp

## 🚀 Быстрый деплой на Timeweb

### 1. Подготовка
```bash
# Клонируйте репозиторий
git clone <your-repo>
cd kng

# Установите зависимости
npm install
```

### 2. Сборка и деплой
```bash
# Соберите Docker образ
docker build -t telegram-dps-app .

# Запустите локально для тестирования
docker run -p 8081:8081 telegram-dps-app

# Или используйте docker-compose
docker-compose up -d --build
```

### 3. Настройка Telegram Bot
1. Получите URL вашего приложения на Timeweb
2. В BotFather установите Web App URL:
```
/setmenubutton
@your_bot_name
Карта ДПС - https://your-domain.timeweb.ru
```

## 📱 Функции приложения

- ✅ **Карта с постами ДПС** - реальное время
- ✅ **Telegram WebApp интеграция** - полная поддержка
- ✅ **AI модерация** - умная система
- ✅ **Геолокация** - точное позиционирование
- ✅ **Чат** - общение пользователей
- ✅ **Админ панель** - управление контентом

## 🔧 Технические детали

- **Frontend**: React Native + Expo Router
- **Backend**: Hono + tRPC + Prisma
- **База данных**: PostgreSQL
- **Деплой**: Docker + Timeweb
- **Интеграция**: Telegram WebApp API

## 📞 Поддержка

Приложение готово к продакшену и оптимизировано для Telegram WebApp!