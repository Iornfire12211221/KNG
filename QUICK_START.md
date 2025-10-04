# 🚀 Быстрый старт улучшенной системы

## Что улучшено

✅ **Качественная ИИ-модерация** - многоуровневый анализ с кэшированием  
✅ **Оптимизация для маленького города** - быстрая работа с ограниченными ресурсами  
✅ **Расширенная аналитика** - детальная статистика и рекомендации  
✅ **Автоматическое обслуживание** - очистка данных и кластеризация  

## Установка

```bash
# 1. Установите зависимости
bun install

# 2. Настройте базу данных
cp env.example .env
# Отредактируйте .env и добавьте DATABASE_URL

# 3. Запустите улучшенную систему
chmod +x start-enhanced-system.sh
./start-enhanced-system.sh
```

## Основные команды

```bash
# Запуск системы
./start-enhanced-system.sh

# Обслуживание
bun run scripts/maintenance.ts

# Проверка статистики
bun run scripts/check-stats.ts

# Очистка кэша
bun run scripts/clear-cache.ts
```

## Новые API endpoints

- `GET /api/trpc/posts.getPendingModeration` - посты на модерации
- `POST /api/trpc/posts.runAIModeration` - запуск ИИ-модерации
- `GET /api/trpc/posts.getModerationStats` - статистика модерации
- `GET /api/trpc/posts.getOptimizedStats` - оптимизированная статистика
- `POST /api/trpc/posts.cleanupForSmallCity` - очистка данных
- `POST /api/trpc/posts.clusterPosts` - кластеризация постов

## Автоматические задачи

Добавьте в crontab:
```bash
# Каждые 6 часов - обслуживание
0 */6 * * * cd /path/to/project && bun run scripts/maintenance.ts
```

## Мониторинг

- **Логи**: `tail -f logs/app.log`
- **Статистика**: `bun run scripts/check-stats.ts`
- **Рекомендации**: `bun run scripts/get-recommendations.ts`

## Поддержка

При проблемах:
1. Запустите обслуживание: `bun run scripts/maintenance.ts`
2. Проверьте логи: `tail -f logs/app.log`
3. Очистите кэш: `bun run scripts/clear-cache.ts`

---

**Система оптимизирована для маленького города с качественной ИИ-модерацией!**
