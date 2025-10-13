/**
 * 🤖 КОНФИГУРАЦИЯ TELEGRAM BOT
 * Скопируйте этот файл в telegram-config.js и заполните своими данными
 */

module.exports = {
  // Токен бота от @BotFather
  TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
  
  // ID группы для уведомлений (можно получить через @userinfobot)
  TELEGRAM_GROUP_CHAT_ID: 'YOUR_GROUP_CHAT_ID_HERE',
  
  // Настройки уведомлений
  NOTIFICATIONS: {
    // Включить уведомления
    enabled: true,
    
    // Минимальный приоритет для отправки
    minSeverity: 'medium', // low, medium, high, critical
    
    // Типы постов для уведомлений
    types: ['dps', 'accident', 'police', 'road_work'],
    
    // Минимальный интервал между уведомлениями (в минутах)
    cooldownMinutes: 5,
    
    // Отправлять в Telegram группу
    sendToTelegram: true,
    
    // Отправлять через WebSocket
    sendToWebSocket: true
  }
};

/**
 * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ:
 * 
 * 1. Создайте бота через @BotFather в Telegram:
 *    - Отправьте /newbot
 *    - Выберите имя и username для бота
 *    - Получите токен и вставьте в TELEGRAM_BOT_TOKEN
 * 
 * 2. Добавьте бота в группу:
 *    - Создайте группу или используйте существующую
 *    - Добавьте бота в группу как администратора
 *    - Отправьте любое сообщение в группу
 *    - Используйте @userinfobot чтобы получить ID группы
 *    - Вставьте ID в TELEGRAM_GROUP_CHAT_ID
 * 
 * 3. Скопируйте этот файл:
 *    cp telegram-config.example.js telegram-config.js
 * 
 * 4. Заполните свои данные в telegram-config.js
 * 
 * 5. Перезапустите сервер
 */
