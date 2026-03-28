/**
 * 📱 СЕРВИС УВЕДОМЛЕНИЙ В РЕАЛЬНОМ ВРЕМЕНИ
 * Отправляет уведомления в Telegram группу о новых постах ДПС
 */

import { prisma } from '../lib/prisma';
import { telegramBot, TelegramNotification } from './telegram-bot';
import { WebSocketManager } from './websocket-server';

export interface NotificationSettings {
  enabled: boolean;
  sendToTelegram: boolean;
  sendToWebSocket: boolean;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  types: string[];
  cooldownMinutes: number; // Минимальный интервал между уведомлениями
}

export class NotificationService {
  private static readonly DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    sendToTelegram: true,
    sendToWebSocket: true,
    minSeverity: 'medium',
    types: ['dps', 'accident', 'police', 'road_work'],
    cooldownMinutes: 5
  };

  private static lastNotificationTime = new Map<string, number>();
  private static settings: NotificationSettings = { ...this.DEFAULT_SETTINGS };

  /**
   * Инициализация сервиса уведомлений
   */
  static async initialize(): Promise<void> {
    try {
      // Загружаем настройки из базы данных
      await this.loadSettings();
      
      // Отправляем тестовое сообщение
      if (this.settings.sendToTelegram) {
        await telegramBot.sendTestMessage();
      }
      
      console.log('✅ NotificationService инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации NotificationService:', error);
    }
  }

  /**
   * Загрузка настроек из базы данных
   */
  private static async loadSettings(): Promise<void> {
    try {
      // В будущем можно сохранять настройки в базе данных
      // Пока используем настройки по умолчанию
      console.log('📱 Настройки уведомлений загружены');
    } catch (error) {
      console.error('❌ Ошибка загрузки настроек:', error);
    }
  }

  /**
   * Отправка уведомления о новом посте
   */
  static async notifyNewPost(postId: string): Promise<boolean> {
    if (!this.settings.enabled) {
      console.log('📱 Уведомления отключены');
      return false;
    }

    try {
      // Получаем пост из базы данных
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });

      if (!post) {
        console.log('❌ Пост не найден:', postId);
        return false;
      }

      // Проверяем, нужно ли отправлять уведомление
      if (!this.shouldNotify(post)) {
        console.log('📱 Уведомление отфильтровано для поста:', postId);
        return false;
      }

      // Проверяем cooldown
      if (!this.checkCooldown(post.type, post.severity)) {
        console.log('📱 Уведомление заблокировано cooldown для:', post.type);
        return false;
      }

      // Формируем уведомление
      const notification: TelegramNotification = {
        type: post.type as any,
        severity: post.severity as any,
        description: post.description,
        location: {
          latitude: post.latitude,
          longitude: post.longitude,
          address: post.address || undefined,
          landmark: post.landmark || undefined
        },
        timestamp: post.timestamp,
        userName: post.userName || 'Аноним',
        photos: post.photos || undefined
      };

      let success = true;

      // Отправляем в Telegram группу
      if (this.settings.sendToTelegram) {
        const telegramSuccess = await telegramBot.sendDPSNotification(notification);
        if (!telegramSuccess) {
          console.log('⚠️ Не удалось отправить уведомление в Telegram');
          success = false;
        }
      }

      // Отправляем через WebSocket
      if (this.settings.sendToWebSocket) {
        await this.sendWebSocketNotification(postId, notification);
      }

      // Обновляем время последнего уведомления
      this.updateCooldown(post.type, post.severity);

      console.log('✅ Уведомление отправлено для поста:', postId);
      return success;

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error);
      return false;
    }
  }

  /**
   * Проверяет, нужно ли отправлять уведомление
   */
  private static shouldNotify(post: any): boolean {
    // ВАЖНО: Проверяем, что пост одобрен модерацией
    if (post.needsModeration || post.moderationStatus !== 'APPROVED') {
      console.log('📱 Уведомление не отправлено: пост не одобрен модерацией');
      return false;
    }

    // Проверяем тип поста
    if (!this.settings.types.includes(post.type)) {
      console.log('📱 Уведомление не отправлено: тип поста не включен в настройки');
      return false;
    }

    // Проверяем минимальный приоритет
    const severityLevels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const postLevel = severityLevels[post.severity as keyof typeof severityLevels] || 0;
    const minLevel = severityLevels[this.settings.minSeverity];
    
    if (postLevel < minLevel) {
      console.log('📱 Уведомление не отправлено: приоритет ниже минимального');
      return false;
    }

    console.log('✅ Пост прошел все проверки, уведомление будет отправлено');
    return true;
  }

  /**
   * Проверяет cooldown для типа уведомления
   */
  private static checkCooldown(type: string, severity: string): boolean {
    const key = `${type}_${severity}`;
    const lastTime = this.lastNotificationTime.get(key) || 0;
    const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
    
    return Date.now() - lastTime > cooldownMs;
  }

  /**
   * Обновляет время последнего уведомления
   */
  private static updateCooldown(type: string, severity: string): void {
    const key = `${type}_${severity}`;
    this.lastNotificationTime.set(key, Date.now());
  }

  /**
   * Отправка уведомления через WebSocket
   */
  private static async sendWebSocketNotification(postId: string, notification: TelegramNotification): Promise<void> {
    try {
      const message = {
        type: 'notification',
        data: {
          postId,
          notification,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      // Отправляем всем подключенным пользователям
      WebSocketManager.broadcast(message);
      
      console.log('📱 WebSocket уведомление отправлено для поста:', postId);
    } catch (error) {
      console.error('❌ Ошибка отправки WebSocket уведомления:', error);
    }
  }

  /**
   * Обновление настроек уведомлений
   */
  static async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    console.log('📱 Настройки уведомлений обновлены:', this.settings);
  }

  /**
   * Получение текущих настроек
   */
  static getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Отправка уведомления о критической ситуации
   */
  static async notifyCritical(description: string, location: { latitude: number; longitude: number }): Promise<boolean> {
    const notification: TelegramNotification = {
      type: 'other',
      severity: 'critical',
      description,
      location,
      timestamp: Date.now(),
      userName: 'Система'
    };

    return await telegramBot.sendDPSNotification(notification);
  }

  /**
   * Получение статистики уведомлений
   */
  static getStats(): { sent: number; blocked: number; errors: number } {
    // В будущем можно добавить счетчики
    return { sent: 0, blocked: 0, errors: 0 };
  }
}

// Автоматическая инициализация при импорте
NotificationService.initialize().catch(console.error);
