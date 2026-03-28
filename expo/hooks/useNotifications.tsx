/**
 * 🔔 СИСТЕМА УВЕДОМЛЕНИЙ В РЕАЛЬНОМ ВРЕМЕНИ
 * WebSocket + Push уведомления + Геofencing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './app-store';

export interface Notification {
  id: string;
  type: 'new_post' | 'post_approved' | 'post_rejected' | 'user_mentioned' | 'system' | 'geofence';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: number;
  read: boolean;
  userId?: string;
  postId?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  geofencing: boolean;
  geofencingRadius: number; // в метрах
  types: {
    newPost: boolean;
    postApproved: boolean;
    postRejected: boolean;
    userMentioned: boolean;
    system: boolean;
    geofence: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  geofencing: true,
  geofencingRadius: 2000, // 2км
  types: {
    newPost: true,
    postApproved: true,
    postRejected: true,
    userMentioned: true,
    system: true,
    geofence: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

export function useNotifications() {
  const { currentUser, posts } = useApp();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 999; // Неограниченное количество попыток
  const cloudflareReconnectRef = useRef<NodeJS.Timeout | null>(null); // Автоматическое переподключение каждые 90 секунд

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек уведомлений:', error);
    }
  }, []);

  // Сохранение настроек
  const saveSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('notification_settings', JSON.stringify(updatedSettings));
      console.log('✅ Настройки уведомлений сохранены');
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек уведомлений:', error);
    }
  }, [settings]);

  // Загрузка истории уведомлений
  const loadNotifications = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('notifications');
      if (saved) {
        const parsedNotifications = JSON.parse(saved);
        setNotifications(parsedNotifications);
        
        // Подсчет непрочитанных
        const unread = parsedNotifications.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  }, []);

  // Сохранение уведомлений
  const saveNotifications = useCallback(async (newNotifications: Notification[]) => {
    try {
      setNotifications(newNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
      
      // Обновляем счетчик непрочитанных
      const unread = newNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Ошибка сохранения уведомлений:', error);
    }
  }, []);

  // Добавление нового уведомления
  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!settings.enabled) return;

    // Проверяем тип уведомления
    const typeKey = notification.type.replace('_', '') as keyof typeof settings.types;
    if (!settings.types[typeKey]) return;

    // Проверяем тихие часы
    if (settings.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
      const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      if (currentTime >= startTime || currentTime <= endTime) {
        console.log('🔇 Уведомление заблокировано тихими часами');
        return;
      }
    }

    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    const updatedNotifications = [newNotification, ...notifications.slice(0, 99)]; // Храним последние 100
    await saveNotifications(updatedNotifications);

    // Показываем уведомление
    if (Platform.OS === 'web') {
      // Для веб используем браузерные уведомления
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png',
          tag: newNotification.id,
        });
      }
    } else {
      // Для мобильных устройств используем Alert
      Alert.alert(notification.title, notification.message);
    }

    console.log('🔔 Новое уведомление:', notification.title);
  }, [settings, notifications, saveNotifications]);

  // Отметка как прочитанное
  const markAsRead = useCallback(async (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    await saveNotifications(updatedNotifications);
  }, [notifications, saveNotifications]);

  // Отметка всех как прочитанные
  const markAllAsRead = useCallback(async () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    await saveNotifications(updatedNotifications);
  }, [notifications, saveNotifications]);

  // Удаление уведомления
  const deleteNotification = useCallback(async (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    await saveNotifications(updatedNotifications);
  }, [notifications, saveNotifications]);

  // Очистка всех уведомлений
  const clearAllNotifications = useCallback(async () => {
    await saveNotifications([]);
  }, [saveNotifications]);

  // WebSocket подключение
  const connectWebSocket = useCallback(() => {
    // Отключаем WebSocket в development режиме
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 WebSocket disabled in development mode');
      return;
    }

    if (!currentUser?.id || wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = 'wss://24dps.ru/ws'; // Production WebSocket URL
    const ws = new WebSocket(`${wsUrl}?userId=${currentUser.id}&token=${currentUser.id}`);

    ws.onopen = () => {
      console.log('✅ WebSocket подключен - real-time уведомления активны');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Автоматическое переподключение каждые 90 секунд (до лимита Cloudflare в 100 секунд)
      if (cloudflareReconnectRef.current) {
        clearTimeout(cloudflareReconnectRef.current);
      }
      cloudflareReconnectRef.current = setTimeout(() => {
        console.log('🔄 Автоматическое переподключение (Cloudflare 100s limit)');
        if (wsRef.current) {
          wsRef.current.close();
        }
        connectWebSocket();
      }, 90000); // 90 секунд
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'notification') {
          addNotification({
            type: data.notificationType,
            title: data.title,
            message: data.message,
            data: data.data,
            priority: data.priority || 'normal',
          });
        }
      } catch (error) {
        console.error('Ошибка обработки WebSocket сообщения:', error);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      
      // Не логируем ошибки подключения - сервер может быть не настроен
      // Просто молча переподключаемся
      
      // Попытка переподключения
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
      // Если достигли лимита - просто молча работаем без WebSocket
    };

    ws.onerror = () => {
      // Молча игнорируем ошибки - сервер может быть не настроен
    };

    wsRef.current = ws;
  }, [currentUser?.id, addNotification]);

  // Отключение WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (cloudflareReconnectRef.current) {
      clearTimeout(cloudflareReconnectRef.current);
      cloudflareReconnectRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Геofencing - проверка близости к постам
  const checkGeofencing = useCallback(async () => {
    // Отключаем геofencing в development режиме
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    if (!settings.geofencing || !currentUser?.location) return;

    const userLocation = currentUser.location;
    const nearbyPosts = posts.filter(post => {
      if (!post.location) return false;
      
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        post.location.latitude,
        post.location.longitude
      );
      
      return distance <= settings.geofencingRadius;
    });

    // Уведомляем о новых постах в радиусе
    for (const post of nearbyPosts) {
      const existingNotification = notifications.find(n => 
        n.type === 'geofence' && n.postId === post.id
      );
      
      if (!existingNotification) {
        await addNotification({
          type: 'geofence',
          title: '📍 ДПС рядом с вами',
          message: `Новый пост ДПС в ${Math.round(calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            post.location.latitude,
            post.location.longitude
          ))}м от вас`,
          priority: 'high',
          postId: post.id,
          location: {
            latitude: post.location.latitude,
            longitude: post.location.longitude,
            radius: settings.geofencingRadius,
          },
        });
      }
    }
  }, [settings.geofencing, settings.geofencingRadius, currentUser?.location, posts, notifications, addNotification]);

  // Функция расчета расстояния между точками
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Расстояние в метрах
  };

  // Фильтрация уведомлений
  const getFilteredNotifications = useCallback((filter?: {
    type?: string;
    read?: boolean;
    limit?: number;
  }) => {
    let filtered = notifications;

    if (filter?.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }

    if (filter?.read !== undefined) {
      filtered = filtered.filter(n => n.read === filter.read);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications]);

  // Инициализация
  useEffect(() => {
    loadSettings();
    loadNotifications();
  }, [loadSettings, loadNotifications]);

  // WebSocket подключение
  useEffect(() => {
    if (currentUser?.id && settings.enabled) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [currentUser?.id, settings.enabled, connectWebSocket, disconnectWebSocket]);

  // Геofencing проверка
  useEffect(() => {
    if (settings.geofencing && currentUser?.location && posts.length > 0) {
      const interval = setInterval(checkGeofencing, 30000); // Проверяем каждые 30 секунд
      return () => clearInterval(interval);
    }
  }, [settings.geofencing, currentUser?.location, posts, checkGeofencing]);

  return {
    // Состояние
    notifications,
    settings,
    isConnected,
    unreadCount,
    
    // Действия
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    saveSettings,
    
    // Утилиты
    getFilteredNotifications,
    connectWebSocket,
    disconnectWebSocket,
  };
}
