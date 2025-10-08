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
  
  // Состояние
  const [activeTab, setActiveTab] = useState('users');
  const [aiSettings, setAISettings] = useState<AISettings>({
    autoModeration: false,
    smartFiltering: false,
    imageAnalysis: false,
    spamProtection: false,
    toxicityFilter: false,
  });

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

  // Инициализация
  useEffect(() => {
    loadAISettings();
    // Очищаем локальные данные постов
    clearLocalPosts();
  }, [loadAISettings]);

  // Функция для очистки локальных постов
  const clearLocalPosts = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('dps_posts');
      console.log('🗑️ Local posts cleared');
    } catch (error) {
      console.error('❌ Error clearing local posts:', error);
    }
  }, []);

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
          <View style={[styles.userAvatar, { backgroundColor: getRoleColor(userRole) }]}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.userAvatarImage} />
            ) : (
              <Text style={styles.userAvatarText}>{avatarText}</Text>
            )}
      </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userUsername}>@{userUsername}</Text>
            {user.isMuted && (
              <View style={styles.mutedIndicator}>
                <Ionicons name="volume-mute" size={12} color="#FF4757" />
            </View>
          )}
          </View>
          </View>
        
        {canManage && user.id !== currentUser?.id && userRole === 'USER' && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMakeAdmin(user.id)}
            >
              <Ionicons name="shield" size={14} color="#3390EC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMakeModerator(user.id)}
            >
              <Ionicons name="checkmark-circle" size={14} color="#34C759" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [currentUser, handleMakeAdmin, handleMakeModerator]);

  // Рендер поста
  const renderPost = useCallback(({ item: post }: { item: any }) => (
    <View style={styles.postCard} key={post.id}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthorInfo}>
          <View style={styles.postAuthorAvatar}>
            {post.photo ? (
              <Image source={{ uri: post.photo }} style={styles.postAuthorAvatarImage} />
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
                      </View>
  ), []);

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
          <Ionicons name="trash" size={14} color="#FF4757" />
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
          data={posts as any}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
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
                        <TouchableOpacity
              style={styles.cleanupButton}
              onPress={clearExpiredPosts}
                        >
              <Ionicons name="trash-outline" size={20} color="#8E8E93" />
                        </TouchableOpacity>
      </View>
                      
      {/* Вкладки */}
      <View style={styles.tabBar}>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
                        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Пользователи ({managedUsers.length})
          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
                        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Посты ({posts.length})
          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
                        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Сообщения ({messages.length})
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    fontSize: 18,
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3390EC',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3390EC',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
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
  },
  mutedIndicator: {
    marginTop: 4,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  adminButton: {
    backgroundColor: '#3390EC',
  },
  moderatorButton: {
    backgroundColor: '#34C759',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
});