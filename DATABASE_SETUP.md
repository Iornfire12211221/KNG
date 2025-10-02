# 🗄️ Настройка базы данных PostgreSQL

## 📝 Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL="postgresql://gen_user:YOUR_PASSWORD@5b185a49c11b0959c8173153.twc1.net:5432/default_db?sslmode=require"
```

**⚠️ ВАЖНО:** Замените `YOUR_PASSWORD` на ваш реальный пароль от базы данных Timeweb!

## 🚀 Команды для запуска:

1. **Генерация Prisma клиента:**
   ```bash
   npx prisma generate
   ```

2. **Создание таблиц в базе данных:**
   ```bash
   npx prisma db push
   ```

3. **Просмотр базы данных (опционально):**
   ```bash
   npx prisma studio
   ```

## 📊 Структура базы данных:

- **posts** - посты ДПС с координатами, типом, временем жизни
- **users** - пользователи Telegram с ролями
- **messages** - сообщения чата

## 🔄 После настройки:

Посты будут синхронизироваться между всеми пользователями в реальном времени через PostgreSQL!
