import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../hooks/app-store';
import { useUserManagement, User } from '../hooks/user-management-client';
import { useNotifications } from '../hooks/useNotifications';
import { useGeofencing } from '../hooks/useGeofencing';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { NotificationBell } from '../components/NotificationBell';
import { NotificationSettings } from '../components/NotificationSettings';


// Типы данных
interface AdminUser {
  id: string;
  name: string;
  username?: string;
  role: 'FOUNDER' | 'ADMIN' | 'MODERATOR' | 'USER';
  isMuted?: boolean;
  isBanned?: boolean;
  isKicked?: boolean;
  photoUrl?: string;
  telegramId?: number;
}

interface Post {
  id: string;
  content: string;
  author: string;
  authorPhoto?: string;
  isApproved?: boolean;
  createdAt: string;
  location?: string;
  imageUrl?: string;
  type?: string;
  verified?: boolean;
}

interface Message {
  id: string;
  content: string;
  userName: string;
  userPhoto?: string;
  createdAt: string;
}

interface AISettings {
  autoModeration: boolean;
  smartFiltering: boolean;
  imageAnalysis: boolean;
  spamProtection: boolean;
  toxicityFilter: boolean;
}

export default function AdminScreen() {
  const router = useRouter();
  const { currentUser, posts, messages, clearExpiredPosts } = useApp();
  const { managedUsers, usersLoading } = useUserManagement();
  
  // Система уведомлений
  const { notifications, unreadCount, addNotification } = useNotifications();
  const { zones, isTracking } = useGeofencing();
  const { connectionStatus, sendSystemNotification } = useRealTimeUpdates();
  
  // Состояние
  const [activeTab, setActiveTab] = useState('users');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings>({
    autoModeration: false,
    smartFiltering: false,
    imageAnalysis: false,
    spamProtection: false,
    toxicityFilter: false,
  });

  // Перехват console.log, console.error, console.warn
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Фильтруем спам от Telegram WebView
      if (!message.includes('[Telegram.WebView]') && !message.includes('viewport_changed')) {
        setLogs(prev => [...prev.slice(-199), `[LOG] ${message}`]); // Храним последние 200 строк
      }
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Фильтруем спам от Telegram WebView
      if (!message.includes('[Telegram.WebView]') && !message.includes('viewport_changed')) {
        setLogs(prev => [...prev.slice(-199), `[ERROR] ${message}`]);
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Фильтруем спам от Telegram WebView
      if (!message.includes('[Telegram.WebView]') && !message.includes('viewport_changed')) {
        setLogs(prev => [...prev.slice(-199), `[WARN] ${message}`]);
      }
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Проверка доступа
  if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={48} color="#FF4757" />
          <Text style={styles.accessDeniedTitle}>Доступ запрещен</Text>
          <Text style={styles.accessDeniedText}>
            У вас нет прав для доступа к админ панели
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // Загрузка настроек ИИ
  const loadAISettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('ai_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        // Убеждаемся, что все поля имеют значения по умолчанию
        setAISettings({
          autoModeration: parsedSettings.autoModeration ?? false,
          smartFiltering: parsedSettings.smartFiltering ?? false,
          imageAnalysis: parsedSettings.imageAnalysis ?? false,
          spamProtection: parsedSettings.spamProtection ?? false,
          toxicityFilter: parsedSettings.toxicityFilter ?? false,
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек ИИ:', error);
    }
  }, []);

  // Сохранение настроек ИИ
  const saveAISettings = useCallback(async (newSettings: AISettings) => {
    try {
      await AsyncStorage.setItem('ai_settings', JSON.stringify(newSettings));
      setAISettings(newSettings);
      Alert.alert('✅ Успех', 'Настройки ИИ сохранены');
    } catch (error) {
      console.error('Ошибка сохранения настроек ИИ:', error);
      Alert.alert('❌ Ошибка', 'Не удалось сохранить настройки');
    }
  }, []);

  // Загрузка постов для админа
  const loadPosts = useCallback(async () => {
    try {
      setPostsLoading(true);
      const { trpc } = await import('@/lib/trpc');
      const allPosts = await trpc.posts.getAllForAdmin.query();
      setAdminPosts(allPosts);
    } catch (error) {
      console.error('Ошибка загрузки постов для админа:', error);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  // Инициализация
  useEffect(() => {
    loadAISettings();
    loadPosts();
  }, [loadAISettings, loadPosts]);

  // Управление пользователями
  const handleMakeAdmin = useCallback((userId: string) => {
    Alert.alert('✅ Успех', 'Пользователь назначен администратором');
  }, []);

  const handleMakeModerator = useCallback((userId: string) => {
    Alert.alert('✅ Успех', 'Пользователь назначен модератором');
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    Alert.alert('✅ Успех', 'Сообщение удалено');
  }, []);

  // Модерация постов
  const handleModeratePost = useCallback(async (postId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const { trpc } = await import('@/lib/trpc');
      
      await trpc.posts.moderate.mutate({
        postId,
        decision,
        reason: decision === 'APPROVED' ? 'Одобрено модератором' : 'Отклонено модератором',
        moderatorId: currentUser?.id || 'admin',
      });
      
      Alert.alert(
        '✅ Успех', 
        decision === 'APPROVED' ? 'Пост одобрен' : 'Пост отклонен'
      );
      
      // Обновляем список постов
      loadPosts();
    } catch (error) {
      console.error('Ошибка модерации поста:', error);
      Alert.alert('❌ Ошибка', 'Не удалось изменить статус поста');
    }
  }, [currentUser, loadPosts]);

  // Рендер пользователя
  const renderUser = useCallback(({ item: user }: { item: User }) => {
    const userName = user.name || 'Без имени';
    const userUsername = user.telegramUsername || 'без username';
    const avatarText = userName && userName.length > 0 ? userName.charAt(0).toUpperCase() : '?';
    const canManage = currentUser?.isAdmin || currentUser?.isModerator;
    const userRole = user.role;

  return (
      <View style={styles.userCard} key={user.id}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.userAvatarImage} />
            ) : (
              <Text style={[styles.userAvatarText, { backgroundColor: getRoleColor(userRole) }]}>{avatarText}</Text>
            )}
      </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userUsername}>@{userUsername}</Text>
            <Text style={[styles.userRole, { color: getRoleColor(userRole) }]}>
              {getRoleName(userRole)}
          </Text>
            {user.isMuted && (
              <View style={styles.mutedIndicator}>
                <Ionicons name="volume-mute" size={12} color="#FF4757" />
                <Text style={styles.mutedText}>Заглушен</Text>
            </View>
          )}
          </View>
          </View>
        
        {canManage && user.id !== currentUser?.id && userRole === 'USER' && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.moderatorButton]}
              onPress={() => handleMakeModerator(user.id)}
            >
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Модератор</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.adminButton]}
              onPress={() => handleMakeAdmin(user.id)}
            >
              <Ionicons name="shield" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Админ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [currentUser, handleMakeAdmin, handleMakeModerator]);

  // Рендер поста
  const renderPost = useCallback(({ item: post }: { item: any }) => {
    // Находим пользователя по userId для получения фото
    const postUser = managedUsers.find(u => u.id === post.userId);
    
    return (
    <View style={styles.postCard} key={post.id}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthorInfo}>
          <View style={styles.postAuthorAvatar}>
            {postUser?.photoUrl ? (
              <Image source={{ uri: postUser.photoUrl }} style={styles.postAuthorAvatarImage} />
            ) : (
              <Text style={styles.postAuthorAvatarText}>
                {post.userName && post.userName.length > 0 ? post.userName.charAt(0).toUpperCase() : '?'}
                        </Text>
            )}
                      </View>
          <View style={styles.postAuthorDetails}>
            <Text style={styles.postAuthor}>{post.userName || 'Неизвестный автор'}</Text>
            <Text style={styles.postTimeAgo}>{getTimeAgo(post.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.postStatus}>
          <Ionicons 
            name={post.verified ? "checkmark-circle" : "time"} 
            size={16} 
            color={post.verified ? "#34C759" : "#FF9500"} 
          />
                      </View>
                    </View>
                    
      {post.description && (
        <Text style={styles.postText}>{post.description}</Text>
      )}
                    
                    {post.photo && (
        <Image source={{ uri: post.photo }} style={styles.postImage} />
      )}
      
      {post.address && (
        <View style={styles.postLocationContainer}>
          <Ionicons name="location" size={14} color="#8E8E93" />
          <Text style={styles.postLocation}>{post.address}</Text>
        </View>
      )}
      
      {/* Кнопки модерации для постов, ожидающих одобрения */}
      {post.moderationStatus === 'PENDING' && (
        <View style={styles.postModerationActions}>
          <TouchableOpacity 
            style={[styles.moderationButton, styles.approveButton]}
            onPress={() => handleModeratePost(post.id, 'APPROVED')}
          >
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.moderationButtonText}>Одобрить</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.moderationButton, styles.rejectButton]}
            onPress={() => handleModeratePost(post.id, 'REJECTED')}
          >
            <Ionicons name="close-circle" size={16} color="#FFFFFF" />
            <Text style={styles.moderationButtonText}>Отклонить</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Статус модерации */}
      {post.moderationStatus && (
        <View style={styles.postModerationStatus}>
          <Text style={[
            styles.postModerationStatusText,
            post.moderationStatus === 'APPROVED' && { color: '#34C759' },
            post.moderationStatus === 'PENDING' && { color: '#FF9500' },
            post.moderationStatus === 'REJECTED' && { color: '#FF3B30' }
          ]}>
            {post.moderationStatus === 'APPROVED' && '✅ Одобрен'}
            {post.moderationStatus === 'PENDING' && '⏳ На модерации'}
            {post.moderationStatus === 'REJECTED' && '❌ Отклонен'}
          </Text>
        </View>
      )}
    </View>
    );
  }, [managedUsers]);

  // Рендер сообщения
  const renderMessage = useCallback(({ item: message }: { item: Message }) => (
    <View style={styles.messageCard} key={message.id}>
      <View style={styles.messageHeader}>
        <View style={styles.messageUserInfo}>
          <View style={styles.messageUserAvatar}>
            <Text style={styles.messageUserAvatarText}>
              {message.userName && message.userName.length > 0 ? message.userName.charAt(0).toUpperCase() : '?'}
            </Text>
                          </View>
          <View>
            <Text style={styles.messageUser}>{message.userName}</Text>
            <Text style={styles.messageDate}>{getTimeAgo(message.createdAt)}</Text>
                        </View>
                          </View>
                      <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteMessage(message.id)}
                      >
          <Ionicons name="trash" size={16} color="#FF4757" />
          <Text style={styles.deleteButtonText}>Удалить</Text>
                      </TouchableOpacity>
      </View>
      <Text style={styles.messageContent}>{message.content}</Text>
    </View>
  ), [handleDeleteMessage]);

  // Рендер настроек ИИ
  const renderAISettings = useCallback(() => (
    <ScrollView style={styles.aiSettingsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings" size={20} color="#3390EC" />
        <Text style={styles.sectionTitle}>Настройки ИИ</Text>
      </View>

      {/* Основные функции */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSubtitle}>Основные функции</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Автомодерация</Text>
            <Text style={styles.settingDescription}>Автоматическое удаление нежелательного контента</Text>
                          </View>
          <Switch
            value={aiSettings.autoModeration}
            onValueChange={(value) => saveAISettings({ ...aiSettings, autoModeration: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.autoModeration ? '#FFFFFF' : '#FFFFFF'}
          />
                        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Умная фильтрация</Text>
            <Text style={styles.settingDescription}>Интеллектуальный анализ контента</Text>
                    </View>
          <Switch
            value={aiSettings.smartFiltering}
            onValueChange={(value) => saveAISettings({ ...aiSettings, smartFiltering: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.smartFiltering ? '#FFFFFF' : '#FFFFFF'}
          />
                  </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Анализ изображений</Text>
            <Text style={styles.settingDescription}>Модерация фотографий и картинок</Text>
          </View>
          <Switch
            value={aiSettings.imageAnalysis}
            onValueChange={(value) => saveAISettings({ ...aiSettings, imageAnalysis: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.imageAnalysis ? '#FFFFFF' : '#FFFFFF'}
          />
          </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Защита от спама</Text>
            <Text style={styles.settingDescription}>Автоматическое обнаружение спама</Text>
                </View>
          <Switch
            value={aiSettings.spamProtection}
            onValueChange={(value) => saveAISettings({ ...aiSettings, spamProtection: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.spamProtection ? '#FFFFFF' : '#FFFFFF'}
          />
              </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Фильтр токсичности</Text>
            <Text style={styles.settingDescription}>Обнаружение оскорбительного контента</Text>
                          </View>
          <Switch
            value={aiSettings.toxicityFilter}
            onValueChange={(value) => saveAISettings({ ...aiSettings, toxicityFilter: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.toxicityFilter ? '#FFFFFF' : '#FFFFFF'}
          />
                      </View>
                    </View>
                    
                  
      {/* Дополнительные настройки */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSubtitle}>Дополнительно</Text>
        
        <TouchableOpacity style={styles.resetButton} onPress={() => {
          const defaultSettings: AISettings = {
            autoModeration: false,
            smartFiltering: false,
            imageAnalysis: false,
            spamProtection: false,
            toxicityFilter: false,
          };
          saveAISettings(defaultSettings);
        }}>
          <Ionicons name="refresh" size={16} color="#FF4757" />
          <Text style={styles.resetButtonText}>Сбросить настройки</Text>
                          </TouchableOpacity>
                    </View>
    </ScrollView>
  ), [aiSettings, saveAISettings]);

  // Вспомогательные функции
  const getTimeAgo = (timestamp: string | number) => {
    const now = Date.now();
    const postTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const diffMs = now - postTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return new Date(postTime).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'FOUNDER': return 'Основатель';
      case 'ADMIN': return 'Администратор';
      case 'MODERATOR': return 'Модератор';
      default: return 'Пользователь';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'FOUNDER': return '#FF6B35';
      case 'ADMIN': return '#3390EC';
      case 'MODERATOR': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dps': return '#FF3B30';
      case 'patrol': return '#007AFF';
      case 'emergency': return '#FF9500';
      case 'info': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dps': return 'ДПС';
      case 'patrol': return 'Патруль';
      case 'emergency': return 'Экстренная';
      case 'info': return 'Информация';
      default: return 'Пост';
    }
  };

  // Рендер контента
  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
        <FlatList
          data={managedUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshing={usersLoading}
          onRefresh={() => {}}
        />
        );
      case 'posts':
        return (
        <FlatList
          data={adminPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshing={postsLoading}
          onRefresh={loadPosts}
        />
        );
      case 'messages':
        return (
          <FlatList
            data={messages as any}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      case 'notifications':
        return (
          <View style={styles.notificationsContainer}>
            <NotificationSettings />
          </View>
        );
      case 'ai':
        return renderAISettings();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Заголовок */}
      <View style={styles.header}>
                        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
                        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
                        </TouchableOpacity>
        <Text style={styles.headerTitle}>Админ панель</Text>
        <View style={styles.headerActions}>
          <NotificationBell size={20} />
          <TouchableOpacity
            style={styles.cleanupButton}
            onPress={() => setShowLogs(!showLogs)}
          >
            <Ionicons name={showLogs ? "eye-off-outline" : "terminal-outline"} size={20} color={showLogs ? "#FF4757" : "#8E8E93"} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cleanupButton}
            onPress={clearExpiredPosts}
          >
            <Ionicons name="trash-outline" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>
                      
      {/* Вкладки */}
      <View style={styles.tabBar}>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
                        >
           <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
             Пользователи
           </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
                        >
           <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
             Посты
           </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
                        >
           <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
             Сообщения
           </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Уведомления
              </Text>
            </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
            ИИ
              </Text>
            </TouchableOpacity>
          </View>

      {/* Контент */}
      {renderContent()}

      {/* Панель логов */}
      {showLogs && (
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Text style={styles.logsTitle}>📋 Логи консоли (последние 200 строк)</Text>
            <View style={styles.logsActions}>
              <TouchableOpacity style={styles.logsButton} onPress={() => setLogs([])}>
                <Ionicons name="trash-outline" size={16} color="#FF4757" />
                <Text style={styles.logsButtonText}>Очистить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logsButton} onPress={() => {
                const logsText = logs.join('\n');
                // Копируем в буфер обмена
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(logsText).then(() => {
                    Alert.alert('✅ Скопировано!', `Скопировано ${logs.length} строк логов в буфер обмена`);
                  }).catch(() => {
                    Alert.alert('❌ Ошибка', 'Не удалось скопировать логи');
                  });
                } else {
                  // Fallback для мобильных устройств
                  Alert.alert('Логи', logsText);
                }
              }}>
                <Ionicons name="copy-outline" size={16} color="#3390EC" />
                <Text style={styles.logsButtonText}>Копировать</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logsButton} onPress={() => setShowLogs(false)}>
                <Ionicons name="close-outline" size={16} color="#8E8E93" />
                <Text style={styles.logsButtonText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.logsScrollView} nestedScrollEnabled>
            {logs.length === 0 ? (
              <Text style={styles.logsEmpty}>Логов пока нет</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logLine}>{log}</Text>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4757',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3390EC',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  cleanupButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
    minHeight: 32,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 10,
  },
  listContainer: {
    padding: 12,
    paddingTop: 8,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  mutedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  userRole: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  mutedText: {
    fontSize: 12,
    color: '#FF9500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adminButton: {
    backgroundColor: '#3390EC',
    borderColor: '#3390EC',
  },
  moderatorButton: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  postAuthorAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postAuthorAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  postAuthorDetails: {
    flex: 1,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  postAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  postTimeAgo: {
    fontSize: 11,
    color: '#8E8E93',
  },
  postFullDate: {
    fontSize: 11,
    color: '#8E8E93',
  },
  postTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  postTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postStatus: {
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postContent: {
    marginTop: 12,
  },
  postTextContainer: {
    marginBottom: 12,
  },
  postText: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
    marginBottom: 8,
  },
  postImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    marginBottom: 8,
  },
  postImageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  postImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  postLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postLocation: {
    fontSize: 11,
    color: '#8E8E93',
  },
  postMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  postMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postMetaText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  postModerationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  moderationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  moderationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postModerationStatus: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  postModerationStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageUserAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  messageDate: {
    fontSize: 11,
    color: '#8E8E93',
  },
  messageContent: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4757',
  },
  aiSettingsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  settingsSection: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  settingsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  logsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#2E2E2E',
  },
  logsButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  logsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logsEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#E0E0E0',
    marginBottom: 2,
    lineHeight: 14,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4757',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationsContainer: {
    flex: 1,
  },
});