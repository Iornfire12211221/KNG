// Система уведомлений для KNG

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: number;
  read: boolean;
  type: 'new_post' | 'moderation' | 'reminder' | 'system';
}

export interface NotificationSettings {
  enabled: boolean;
  newPosts: boolean;
  moderation: boolean;
  reminders: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

const NOTIFICATIONS_KEY = 'kng_notifications';
const SETTINGS_KEY = 'kng_notification_settings';

/**
 * Проверка поддержки уведомлений
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Запрос разрешения на уведомления
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Отправка уведомления
 */
export async function sendNotification(
  title: string,
  body: string,
  data?: any,
  options?: NotificationOptions
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    console.warn('Cannot send notification: permission not granted');
    return;
  }

  const settings = await getNotificationSettings();
  
  // Проверяем тихие часы
  if (settings.quietHours.enabled && isQuietHours()) {
    console.log('🔇 Notification suppressed: quiet hours');
    return;
  }

  const notificationOptions: NotificationOptions = {
    icon: '/assets/images/icon.png',
    badge: '/assets/images/icon.png',
    vibrate: settings.vibration ? [200, 100, 200] : undefined,
    sound: settings.sound ? undefined : 'silent',
    requireInteraction: false,
    tag: 'kng-notification',
    ...options,
    data: {
      timestamp: Date.now(),
      ...data
    }
  };

  try {
    const notification = new Notification(title, notificationOptions);
    
    // Автоматически закрываем через 5 секунд
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Сохраняем уведомление в истории
    await saveNotification({
      id: `notification_${Date.now()}`,
      title,
      body,
      data,
      timestamp: Date.now(),
      read: false,
      type: data?.type || 'system'
    });

    console.log('📱 Notification sent:', title);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Уведомление о новом посте
 */
export async function notifyNewPost(
  postTitle: string,
  distance: number,
  postId: string
): Promise<void> {
  const settings = await getNotificationSettings();
  
  if (!settings.newPosts) {
    return;
  }

  const title = '📍 Новый пост на карте';
  const body = distance < 1 
    ? `${postTitle} (${Math.round(distance * 1000)} м от вас)`
    : `${postTitle} (${distance.toFixed(1)} км от вас)`;

  await sendNotification(title, body, {
    type: 'new_post',
    postId,
    distance
  });
}

/**
 * Уведомление о модерации
 */
export async function notifyModeration(
  action: 'approved' | 'rejected',
  postTitle: string
): Promise<void> {
  const settings = await getNotificationSettings();
  
  if (!settings.moderation) {
    return;
  }

  const title = action === 'approved' ? '✅ Пост одобрен' : '❌ Пост отклонен';
  const body = `${postTitle}`;

  await sendNotification(title, body, {
    type: 'moderation',
    action
  });
}

/**
 * Напоминание о проверке карты
 */
export async function notifyReminder(): Promise<void> {
  const settings = await getNotificationSettings();
  
  if (!settings.reminders) {
    return;
  }

  const title = '🗺️ Проверьте карту';
  const body = 'Возможно, рядом с вами произошло что-то важное';

  await sendNotification(title, body, {
    type: 'reminder'
  });
}

/**
 * Получение настроек уведомлений
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settings = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
  }

  // Настройки по умолчанию
  return {
    enabled: true,
    newPosts: true,
    moderation: true,
    reminders: false,
    sound: true,
    vibration: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };
}

/**
 * Сохранение настроек уведомлений
 */
export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log('📱 Notification settings saved');
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

/**
 * Сохранение уведомления в истории
 */
async function saveNotification(notification: NotificationData): Promise<void> {
  try {
    const notifications = await getNotifications();
    notifications.unshift(notification);
    
    // Ограничиваем историю 100 уведомлениями
    if (notifications.length > 100) {
      notifications.splice(100);
    }
    
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving notification:', error);
  }
}

/**
 * Получение истории уведомлений
 */
export async function getNotifications(): Promise<NotificationData[]> {
  try {
    const notifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return notifications ? JSON.parse(notifications) : [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

/**
 * Отметка уведомления как прочитанного
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const notifications = await getNotifications();
    const notification = notifications.find(n => n.id === id);
    
    if (notification) {
      notification.read = true;
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Очистка истории уведомлений
 */
export async function clearNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
    console.log('📱 Notifications cleared');
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

/**
 * Проверка тихих часов
 */
function isQuietHours(): boolean {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Это упрощенная проверка, в реальном приложении нужно учитывать переход через полночь
  return false; // Пока отключено
}

/**
 * Планировщик напоминаний
 */
export class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastReminderTime: number = 0;
  private readonly REMINDER_INTERVAL = 2 * 60 * 60 * 1000; // 2 часа

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(async () => {
      const now = Date.now();
      
      // Проверяем, прошло ли достаточно времени с последнего напоминания
      if (now - this.lastReminderTime >= this.REMINDER_INTERVAL) {
        await notifyReminder();
        this.lastReminderTime = now;
      }
    }, 5 * 60 * 1000); // Проверяем каждые 5 минут
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Инициализация системы уведомлений
 */
export async function initializeNotifications(): Promise<void> {
  console.log('📱 Initializing notification system...');
  
  // Запрашиваем разрешение
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    console.log('✅ Notification permission granted');
    
    // Запускаем планировщик напоминаний
    const scheduler = new ReminderScheduler();
    scheduler.start();
    
    // Сохраняем планировщик в глобальной области для управления
    (window as any).reminderScheduler = scheduler;
  } else {
    console.warn('⚠️ Notification permission denied');
  }
}

/**
 * Отправка push уведомления через Service Worker
 */
export async function sendPushNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(title, {
        body,
        icon: '/assets/images/icon.png',
        badge: '/assets/images/icon.png',
        data,
        tag: 'kng-push',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
}
