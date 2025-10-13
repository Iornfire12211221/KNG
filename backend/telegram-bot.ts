/**
 * 🤖 TELEGRAM BOT ДЛЯ УВЕДОМЛЕНИЙ В ГРУППУ
 * Отправляет минималистичные уведомления о новых постах ДПС
 */

import { Telegraf } from 'telegraf';

export interface TelegramNotification {
  type: 'dps' | 'accident' | 'road_work' | 'traffic_jam' | 'police' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
  };
  timestamp: number;
  userName: string;
  photos?: string[];
}

export class TelegramNotificationBot {
  private bot: Telegraf;
  private groupChatId: string;
  private isEnabled: boolean;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
    this.groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID || '';
    this.isEnabled = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_GROUP_CHAT_ID);
    
    if (!this.isEnabled) {
      console.log('⚠️ Telegram Bot не настроен. Уведомления отключены.');
    } else {
      console.log('✅ Telegram Bot инициализирован для группы:', this.groupChatId);
    }
  }

  /**
   * Отправка уведомления о новом посте ДПС
   */
  async sendDPSNotification(notification: TelegramNotification): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('📱 Telegram Bot отключен, уведомление не отправлено');
      return false;
    }

    try {
      // Фильтруем только важные уведомления
      if (!this.shouldSendNotification(notification)) {
        console.log('📱 Уведомление отфильтровано по приоритету:', notification.type, notification.severity);
        return false;
      }

      const message = this.formatNotificationMessage(notification);
      
      await this.bot.telegram.sendMessage(this.groupChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: notification.severity === 'low' // Тихо для низкого приоритета
      });

      console.log('✅ Уведомление отправлено в группу:', notification.type, notification.severity);
      return true;

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления в Telegram:', error);
      return false;
    }
  }

  /**
   * Определяет, нужно ли отправлять уведомление
   */
  private shouldSendNotification(notification: TelegramNotification): boolean {
    // Всегда отправляем критические уведомления
    if (notification.severity === 'critical') return true;
    
    // Отправляем высокий приоритет
    if (notification.severity === 'high') return true;
    
    // Отправляем средний приоритет только для важных типов
    if (notification.severity === 'medium') {
      return ['dps', 'accident', 'police', 'road_work'].includes(notification.type);
    }
    
    // Низкий приоритет только для ДПС и аварий
    if (notification.severity === 'low') {
      return ['dps', 'accident'].includes(notification.type);
    }
    
    return false;
  }

  /**
   * Форматирует сообщение для группы
   */
  private formatNotificationMessage(notification: TelegramNotification): string {
    const emoji = this.getTypeEmoji(notification.type);
    const severityEmoji = this.getSeverityEmoji(notification.severity);
    
    // Минималистичное сообщение
    let message = `${emoji} ${severityEmoji} <b>${this.getTypeName(notification.type)}</b>\n\n`;
    
    // Описание (обрезаем до 100 символов)
    const shortDescription = notification.description.length > 100 
      ? notification.description.substring(0, 100) + '...'
      : notification.description;
    message += `${shortDescription}\n\n`;
    
    // Местоположение
    if (notification.location.address) {
      message += `📍 ${notification.location.address}\n`;
    } else if (notification.location.landmark) {
      message += `📍 ${notification.location.landmark}\n`;
    } else {
      message += `📍 ${notification.location.latitude.toFixed(4)}, ${notification.location.longitude.toFixed(4)}\n`;
    }
    
    // Время
    const time = new Date(notification.timestamp).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
    message += `🕐 ${time}`;
    
    // Пользователь (если не анонимно)
    if (notification.userName && notification.userName !== 'Аноним') {
      message += `\n👤 ${notification.userName}`;
    }
    
    return message;
  }

  /**
   * Получает эмодзи для типа поста
   */
  private getTypeEmoji(type: string): string {
    const emojis = {
      'dps': '🚔',
      'accident': '💥',
      'road_work': '🚧',
      'traffic_jam': '🚗',
      'police': '👮',
      'other': '⚠️'
    };
    return emojis[type as keyof typeof emojis] || '⚠️';
  }

  /**
   * Получает эмодзи для приоритета
   */
  private getSeverityEmoji(severity: string): string {
    const emojis = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return emojis[severity as keyof typeof emojis] || '🟡';
  }

  /**
   * Получает название типа на русском
   */
  private getTypeName(type: string): string {
    const names = {
      'dps': 'ДПС',
      'accident': 'Авария',
      'road_work': 'Дорожные работы',
      'traffic_jam': 'Пробка',
      'police': 'Полиция',
      'other': 'Другое'
    };
    return names[type as keyof typeof names] || 'Уведомление';
  }

  /**
   * Отправка тестового сообщения
   */
  async sendTestMessage(): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('📱 Telegram Bot не настроен');
      return false;
    }

    try {
      await this.bot.telegram.sendMessage(
        this.groupChatId, 
        '🤖 <b>Тест уведомлений</b>\n\nБот для уведомлений о ДПС активирован!',
        { parse_mode: 'HTML' }
      );
      console.log('✅ Тестовое сообщение отправлено');
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки тестового сообщения:', error);
      return false;
    }
  }

  /**
   * Получение информации о боте
   */
  async getBotInfo(): Promise<any> {
    if (!this.isEnabled) return null;
    
    try {
      return await this.bot.telegram.getMe();
    } catch (error) {
      console.error('❌ Ошибка получения информации о боте:', error);
      return null;
    }
  }
}

// Экспортируем единственный экземпляр
export const telegramBot = new TelegramNotificationBot();
