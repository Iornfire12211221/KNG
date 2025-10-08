# 🔔 Система уведомлений в реальном времени

## 📋 Обзор

Комплексная система уведомлений для Telegram WebApp с поддержкой:
- **WebSocket** для мгновенных обновлений
- **Геofencing** для уведомлений о близких постах ДПС
- **Push-уведомления** через Telegram
- **Красивый UI** с анимациями

## 🚀 Возможности

### ✨ Основные функции
- 🔔 **Real-time уведомления** через WebSocket
- 📍 **Геofencing** - уведомления при приближении к постам
- 🎯 **Push-уведомления** через Telegram WebApp API
- ⚙️ **Гибкие настройки** для всех типов уведомлений
- 🎨 **Красивый UI** в стиле Telegram

### 📱 Типы уведомлений
- **Новые посты** - уведомления о новых постах ДПС
- **Одобренные посты** - когда ваш пост одобрен
- **Отклоненные посты** - когда ваш пост отклонен
- **Упоминания** - когда вас упоминают в постах
- **Системные** - технические уведомления
- **Геofencing** - при приближении к постам

## 🏗️ Архитектура

### 📁 Структура файлов
```
hooks/
├── useNotifications.tsx      # Основной хук для уведомлений
├── useGeofencing.tsx         # Геofencing и отслеживание местоположения
└── useRealTimeUpdates.tsx    # WebSocket соединение

components/
├── NotificationBell.tsx      # Колокольчик с анимацией и счетчиком
├── NotificationsModal.tsx    # Модальное окно для просмотра уведомлений
└── NotificationSettings.tsx  # Настройки уведомлений
```

### 🔧 Основные хуки

#### `useNotifications`
```typescript
const {
  notifications,        // Список уведомлений
  unreadCount,         // Количество непрочитанных
  settings,            // Настройки уведомлений
  addNotification,     // Добавить уведомление
  markAsRead,          // Отметить как прочитанное
  clearAllNotifications // Очистить все
} = useNotifications();
```

#### `useGeofencing`
```typescript
const {
  zones,               // Зоны геofencing
  isTracking,          // Статус отслеживания
  currentLocation,     // Текущее местоположение
  startTracking,       // Начать отслеживание
  stopTracking         // Остановить отслеживание
} = useGeofencing();
```

#### `useRealTimeUpdates`
```typescript
const {
  connectionStatus,    // Статус WebSocket соединения
  sendMessage,         // Отправить сообщение
  connect,             // Подключиться
  disconnect           // Отключиться
} = useRealTimeUpdates();
```

## 🎨 UI Компоненты

### 🔔 NotificationBell
Красивый колокольчик с:
- Анимацией при нажатии
- Счетчиком непрочитанных уведомлений
- Индикатором статуса соединения
- Пульсацией при новых уведомлениях

### 📱 NotificationsModal
Модальное окно с:
- Фильтрацией по типу и статусу
- Массовыми действиями
- Красивыми анимациями
- Pull-to-refresh

### ⚙️ NotificationSettings
Панель настроек с разделами:
- **Общие** - основные настройки
- **Типы** - настройка типов уведомлений
- **Геofencing** - настройки геолокации
- **WebSocket** - настройки соединения

## 🔧 Настройка

### 1. Переменные окружения
```env
EXPO_PUBLIC_WS_URL=ws://localhost:8080/ws
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
```

### 2. Разрешения
```typescript
// Для геofencing требуется разрешение на местоположение
const { status } = await Location.requestForegroundPermissionsAsync();
```

### 3. WebSocket сервер
```javascript
// Пример WebSocket сервера
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Обработка входящих сообщений
  });
  
  // Отправка уведомления
  ws.send(JSON.stringify({
    type: 'notification',
    data: {
      title: 'Новый пост ДПС',
      message: 'ДПС в 500м от вас',
      priority: 'high'
    }
  }));
});
```

## 📊 Настройки

### 🔔 Уведомления
- **Включить/выключить** уведомления
- **Звук** и **вибрация**
- **Тихие часы** (22:00 - 08:00)
- **Фильтрация по типам**

### 📍 Геofencing
- **Радиус уведомлений** (500м - 10км)
- **Высокая точность** GPS
- **Фоновое отслеживание**
- **Кулердаун** между уведомлениями (5 минут)

### 🔌 WebSocket
- **Автопереподключение**
- **Максимум попыток** (5)
- **Задержка переподключения** (1-30 секунд)
- **Heartbeat** каждые 30 секунд

## 🎯 Использование

### Добавление уведомления
```typescript
import { useNotifications } from '../hooks/useNotifications';

const { addNotification } = useNotifications();

// Добавить уведомление
await addNotification({
  type: 'new_post',
  title: 'Новый пост ДПС',
  message: 'ДПС в 500м от вас',
  priority: 'high',
  postId: 'post_123'
});
```

### Настройка геofencing
```typescript
import { useGeofencing } from '../hooks/useGeofencing';

const { saveSettings } = useGeofencing();

// Изменить радиус
await saveSettings({
  defaultRadius: 2000 // 2км
});
```

### Отправка через WebSocket
```typescript
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

const { sendSystemNotification } = useRealTimeUpdates();

// Отправить системное уведомление
sendSystemNotification(
  'Техническое обслуживание',
  'Система будет недоступна с 02:00 до 04:00',
  'high'
);
```

## 🎨 Дизайн

### 🎨 Цветовая схема
- **Основной**: `#3390EC` (Telegram Blue)
- **Успех**: `#34C759` (Green)
- **Предупреждение**: `#FF9500` (Orange)
- **Ошибка**: `#FF4757` (Red)
- **Текст**: `#000000` / `#8E8E93`

### 📱 Адаптивность
- **Мобильная оптимизация** для Telegram WebApp
- **Минималистичный дизайн** в стиле Telegram
- **Плавные анимации** и переходы
- **Тактильная обратная связь**

## 🔄 Интеграция

### В админ панель
```typescript
// app/admin.tsx
import { NotificationBell } from '../components/NotificationBell';
import { NotificationSettings } from '../components/NotificationSettings';

// В заголовке
<NotificationBell size={20} />

// В новой вкладке
case 'notifications':
  return <NotificationSettings />;
```

### В основное приложение
```typescript
// В любом компоненте
import { useNotifications } from '../hooks/useNotifications';

const { addNotification } = useNotifications();

// При создании поста
const handleCreatePost = async (post) => {
  // ... создание поста
  
  // Уведомить всех пользователей
  await addNotification({
    type: 'new_post',
    title: 'Новый пост ДПС',
    message: `ДПС в ${post.location}`,
    priority: 'normal'
  });
};
```

## 🚀 Производительность

### ⚡ Оптимизации
- **Ленивая загрузка** компонентов
- **Мемоизация** дорогих вычислений
- **Виртуализация** списков уведомлений
- **Кэширование** настроек в AsyncStorage

### 📊 Мониторинг
- **Статистика соединения** WebSocket
- **Отслеживание ошибок** и переподключений
- **Метрики производительности** геofencing
- **Логирование** всех действий

## 🐛 Отладка

### 🔍 Логи
```typescript
// Включить подробные логи
console.log('🔔 Новое уведомление:', notification);
console.log('📍 Вход в зону:', zone.title);
console.log('🔌 WebSocket подключен');
```

### 🛠️ Инструменты
- **React DevTools** для отладки хуков
- **WebSocket Inspector** для мониторинга соединения
- **Location Services** для тестирования геofencing

## 📈 Будущие улучшения

### 🔮 Планы
- **Push-уведомления** через Telegram Bot API
- **Групповые уведомления** для администраторов
- **Аналитика уведомлений** и статистика
- **Кастомные звуки** и вибрации
- **Умные уведомления** с ML

### 🎯 Приоритеты
1. **Стабильность** WebSocket соединения
2. **Точность** геofencing
3. **Производительность** на мобильных устройствах
4. **UX** и удобство использования

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте **логи** в консоли
2. Убедитесь в **правильности настроек**
3. Проверьте **разрешения** на местоположение
4. Проверьте **WebSocket соединение**

**Система уведомлений готова к использованию! 🚀**
