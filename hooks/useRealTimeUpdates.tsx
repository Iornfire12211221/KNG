/**
 * 🔌 WEBSOCKET ДЛЯ МГНОВЕННЫХ ОБНОВЛЕНИЙ
 * Real-time коммуникация для уведомлений и синхронизации
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './app-store';
import { useNotifications } from './useNotifications';

export interface WebSocketMessage {
  type: 'notification' | 'post_update' | 'user_update' | 'system' | 'ping' | 'pong';
  data: any;
  timestamp: number;
  userId?: string;
  postId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
}

export interface WebSocketSettings {
  enabled: boolean;
  url: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number; // в миллисекундах
  heartbeatInterval: number; // в миллисекундах
  messageTimeout: number; // в миллисекундах
}

const DEFAULT_SETTINGS: WebSocketSettings = {
  enabled: false, // ОТКЛЮЧЕН - сервер не настроен
  url: 'wss://24dps.ru/ws', // Production WebSocket URL
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectDelay: 3000,
  heartbeatInterval: 30000,
  messageTimeout: 10000,
};

export function useRealTimeUpdates() {
  const { currentUser, posts, addPost, updatePost, deletePost } = useApp();
  const { addNotification } = useNotifications();
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  });
  const [settings, setSettings] = useState<WebSocketSettings>(DEFAULT_SETTINGS);
  const [messageQueue, setMessageQueue] = useState<WebSocketMessage[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('websocket_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек WebSocket:', error);
    }
  }, []);

  // Сохранение настроек
  const saveSettings = useCallback(async (newSettings: Partial<WebSocketSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('websocket_settings', JSON.stringify(updatedSettings));
      console.log('✅ Настройки WebSocket сохранены');
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек WebSocket:', error);
    }
  }, [settings]);

  // Отправка сообщения
  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // Добавляем в очередь, если соединение недоступно
      setMessageQueue(prev => [...prev, { ...message, timestamp: Date.now() }]);
      return false;
    }

    try {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now(),
      };

      wsRef.current.send(JSON.stringify(fullMessage));
      console.log('📤 Отправлено WebSocket сообщение:', message.type);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки WebSocket сообщения:', error);
      return false;
    }
  }, []);

  // Обработка входящих сообщений
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'notification':
          addNotification({
            type: message.data.notificationType,
            title: message.data.title,
            message: message.data.message,
            data: message.data.data,
            priority: message.data.priority || 'normal',
          });
          break;

        case 'post_update':
          if (message.data.action === 'create') {
            addPost(message.data.post);
          } else if (message.data.action === 'update') {
            updatePost(message.data.post);
          } else if (message.data.action === 'delete') {
            deletePost(message.data.postId);
          }
          break;

        case 'user_update':
          // Обработка обновлений пользователей
          console.log('👤 Обновление пользователя:', message.data);
          break;

        case 'system':
          // Системные сообщения
          if (message.data.type === 'maintenance') {
            addNotification({
              type: 'system',
              title: '🔧 Техническое обслуживание',
              message: message.data.message,
              priority: 'high',
            });
          }
          break;

        case 'ping':
          // Отвечаем на ping
          sendMessage({ type: 'pong', data: {} });
          break;

        case 'pong':
          // Получили pong - соединение активно
          console.log('🏓 Pong получен');
          break;

        default:
          console.log('❓ Неизвестный тип сообщения:', message.type);
      }
    } catch (error) {
      console.error('❌ Ошибка обработки WebSocket сообщения:', error);
    }
  }, [addNotification, addPost, updatePost, deletePost, sendMessage]);

  // Heartbeat для поддержания соединения
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping', data: {} });
      }
    }, settings.heartbeatInterval);
  }, [settings.heartbeatInterval, sendMessage]);

  // Остановка heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Обработка очереди сообщений
  const processMessageQueue = useCallback(() => {
    if (messageQueue.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const messages = [...messageQueue];
      setMessageQueue([]);

      messages.forEach(message => {
        try {
          wsRef.current!.send(JSON.stringify(message));
        } catch (error) {
          console.error('❌ Ошибка отправки сообщения из очереди:', error);
        }
      });

      console.log(`📤 Отправлено ${messages.length} сообщений из очереди`);
    }
  }, [messageQueue]);

  // Подключение к WebSocket
  const connect = useCallback(() => {
    if (!settings.enabled || !currentUser?.id) {
      console.log('🔌 WebSocket connection skipped: disabled or no user');
      return;
    }

    // Закрываем существующее соединение
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const wsUrl = `${settings.url}?userId=${currentUser.id}&token=${currentUser.id}`;
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 WebSocket подключен');
        setConnectionStatus({
          connected: true,
          reconnecting: false,
          lastConnected: Date.now(),
          reconnectAttempts: 0,
          error: undefined,
        });

        // Запускаем heartbeat
        startHeartbeat();

        // Обрабатываем очередь сообщений
        processMessageQueue();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('🔌 WebSocket отключен:', event.code, event.reason);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: event.reason || 'Соединение закрыто',
        }));

        stopHeartbeat();

        // Попытка переподключения только если не было принудительного закрытия
        if (settings.autoReconnect && 
            event.code !== 1000 && // Не нормальное закрытие
            connectionStatus.reconnectAttempts < settings.maxReconnectAttempts) {
          
          setConnectionStatus(prev => ({
            ...prev,
            reconnecting: true,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }));

          const delay = settings.reconnectDelay * Math.pow(2, connectionStatus.reconnectAttempts);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Попытка переподключения ${connectionStatus.reconnectAttempts + 1}/${settings.maxReconnectAttempts}`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket ошибка:', error);
        setConnectionStatus(prev => ({
          ...prev,
          error: 'Ошибка соединения',
        }));
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('❌ Ошибка создания WebSocket соединения:', error);
      setConnectionStatus(prev => ({
        ...prev,
        error: 'Ошибка создания соединения',
      }));
    }
  }, [
    settings, 
    currentUser?.id, 
    connectionStatus.reconnectAttempts, 
    startHeartbeat, 
    processMessageQueue, 
    handleMessage, 
    stopHeartbeat
  ]);

  // Отключение от WebSocket
  const disconnect = useCallback(() => {
    // Очищаем таймауты
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    // Закрываем соединение
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
    });

    console.log('🔌 WebSocket отключен');
  }, [stopHeartbeat]);

  // Отправка уведомления о новом посте
  const notifyNewPost = useCallback((post: any) => {
    sendMessage({
      type: 'post_update',
      data: {
        action: 'create',
        post: post,
      },
    });
  }, [sendMessage]);

  // Отправка уведомления об обновлении поста
  const notifyPostUpdate = useCallback((post: any) => {
    sendMessage({
      type: 'post_update',
      data: {
        action: 'update',
        post: post,
      },
    });
  }, [sendMessage]);

  // Отправка уведомления об удалении поста
  const notifyPostDelete = useCallback((postId: string) => {
    sendMessage({
      type: 'post_update',
      data: {
        action: 'delete',
        postId: postId,
      },
    });
  }, [sendMessage]);

  // Отправка системного уведомления
  const sendSystemNotification = useCallback((title: string, message: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') => {
    sendMessage({
      type: 'notification',
      data: {
        notificationType: 'system',
        title: title,
        message: message,
        priority: priority,
      },
    });
  }, [sendMessage]);

  // Получение статистики соединения
  const getConnectionStats = useCallback(() => {
    return {
      ...connectionStatus,
      messageQueueLength: messageQueue.length,
      uptime: connectionStatus.lastConnected 
        ? Date.now() - connectionStatus.lastConnected 
        : 0,
    };
  }, [connectionStatus, messageQueue.length]);

  // Инициализация
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Управление соединением
  useEffect(() => {
    if (settings.enabled && currentUser?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [settings.enabled, currentUser?.id, connect, disconnect]);

  // Обработка очереди при изменении статуса соединения
  useEffect(() => {
    if (connectionStatus.connected) {
      processMessageQueue();
    }
  }, [connectionStatus.connected, processMessageQueue]);

  return {
    // Состояние
    connectionStatus,
    settings,
    messageQueue,
    
    // Действия
    connect,
    disconnect,
    sendMessage,
    saveSettings,
    
    // Утилиты
    notifyNewPost,
    notifyPostUpdate,
    notifyPostDelete,
    sendSystemNotification,
    getConnectionStats,
  };
}
