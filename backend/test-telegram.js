/**
 * 🧪 ТЕСТ TELEGRAM УВЕДОМЛЕНИЙ
 * Простой скрипт для проверки работы бота
 */

// Загружаем конфигурацию
let config;
try {
  config = require('./telegram-config.js');
} catch (error) {
  console.log('❌ Файл telegram-config.js не найден!');
  console.log('📝 Создайте файл по примеру telegram-config.example.js');
  process.exit(1);
}

// Проверяем настройки
if (!config.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.log('❌ Токен бота не настроен!');
  console.log('📝 Укажите реальный токен в telegram-config.js');
  process.exit(1);
}

if (!config.TELEGRAM_GROUP_CHAT_ID || config.TELEGRAM_GROUP_CHAT_ID === 'YOUR_GROUP_CHAT_ID_HERE') {
  console.log('❌ ID группы не настроен!');
  console.log('📝 Укажите реальный ID группы в telegram-config.js');
  process.exit(1);
}

console.log('✅ Конфигурация загружена');
console.log('🤖 Токен бота:', config.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');
console.log('👥 ID группы:', config.TELEGRAM_GROUP_CHAT_ID);

// Тестируем отправку сообщения
async function testTelegram() {
  try {
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
    
    console.log('🔄 Отправляем тестовое сообщение...');
    
    await bot.telegram.sendMessage(
      config.TELEGRAM_GROUP_CHAT_ID,
      '🧪 <b>Тест уведомлений</b>\n\n' +
      'Если вы видите это сообщение, значит бот работает правильно!\n\n' +
      '✅ Конфигурация корректна\n' +
      '✅ Бот добавлен в группу\n' +
      '✅ Права настроены\n\n' +
      'Теперь уведомления о ДПС будут приходить автоматически!',
      { parse_mode: 'HTML' }
    );
    
    console.log('✅ Тестовое сообщение отправлено успешно!');
    console.log('📱 Проверьте вашу Telegram группу');
    
    // Получаем информацию о боте
    const botInfo = await bot.telegram.getMe();
    console.log('🤖 Информация о боте:');
    console.log('   Имя:', botInfo.first_name);
    console.log('   Username:', botInfo.username);
    console.log('   ID:', botInfo.id);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    
    if (error.message.includes('chat not found')) {
      console.log('💡 Возможные причины:');
      console.log('   - Бот не добавлен в группу');
      console.log('   - Неправильный ID группы');
      console.log('   - Бот не является администратором');
    } else if (error.message.includes('Unauthorized')) {
      console.log('💡 Возможные причины:');
      console.log('   - Неправильный токен бота');
      console.log('   - Токен отозван');
    }
  }
}

// Запускаем тест
testTelegram();
