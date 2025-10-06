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

// Простой слайдер компонент
const CustomSlider = ({ value, onValueChange, style }: { value: number; onValueChange: (value: number) => void; style?: any }) => {
  const [sliderWidth, setSliderWidth] = useState(200);

  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const newValue = Math.max(0, Math.min(1, locationX / sliderWidth));
    onValueChange(newValue);
  };

  return (
    <View style={[styles.customSliderContainer, style]}>
      <TouchableOpacity
        style={styles.customSliderTrack}
        onPress={handlePress}
        onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
        activeOpacity={1}
      >
        <View style={[styles.customSliderProgress, { width: `${value * 100}%` }]} />
        <View style={[styles.customSliderThumb, { left: `${value * 100}%` }]} />
      </TouchableOpacity>
    </View>
  );
};

// Типы данных
interface User {
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
  moderationThreshold: number;
  spamThreshold: number;
  toxicityThreshold: number;
  sensitivityLevel: number;
}

export default function AdminScreen() {
  const router = useRouter();
  const { currentUser, posts, messages, clearExpiredPosts } = useApp();
  
  // Состояние
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings>({
    autoModeration: false,
    smartFiltering: false,
    imageAnalysis: false,
    spamProtection: false,
    toxicityFilter: false,
    moderationThreshold: 0.7,
    spamThreshold: 0.8,
    toxicityThreshold: 0.6,
    sensitivityLevel: 0.5,
  });

  // Проверка доступа
  if (!currentUser || (currentUser.role !== 'FOUNDER' && currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
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

  // Загрузка пользователей
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      // Создаем демо-пользователей
      const demoUsers: User[] = [
        {
          id: currentUser.id,
          name: currentUser.name || 'Основатель',
          username: currentUser.username || 'founder',
          role: 'FOUNDER',
          isMuted: false,
          isBanned: false,
          isKicked: false,
          photoUrl: currentUser.photoUrl,
          telegramId: currentUser.telegramId,
        },
        {
          id: 'user_2',
          name: 'Алексей Петров',
          username: 'alex_petrov',
          role: 'USER',
          isMuted: false,
          isBanned: false,
          isKicked: false,
        },
        {
          id: 'user_3',
          name: 'Мария Сидорова',
          username: 'maria_sid',
          role: 'USER',
          isMuted: true,
          isBanned: false,
          isKicked: false,
        },
      ];
      setUsers(demoUsers);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser]);

  // Загрузка настроек ИИ
  const loadAISettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('ai_settings');
      if (saved) {
        setAISettings(JSON.parse(saved));
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
    loadUsers();
    loadAISettings();
  }, [loadUsers, loadAISettings]);

  // Управление пользователями
  const handleMakeAdmin = useCallback((userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: 'ADMIN' as const } : user
    ));
    Alert.alert('✅ Успех', 'Пользователь назначен администратором');
  }, []);

  const handleMakeModerator = useCallback((userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: 'MODERATOR' as const } : user
    ));
    Alert.alert('✅ Успех', 'Пользователь назначен модератором');
  }, []);


  // Рендер пользователя
  const renderUser = useCallback(({ item: user }: { item: User }) => {
    const userName = user.name || 'Без имени';
    const userUsername = user.username || 'без username';
    const avatarText = userName && userName.length > 0 ? userName.charAt(0).toUpperCase() : '?';
    const isMuted = Boolean(user.isMuted);
    const canManage = currentUser?.role === 'FOUNDER';

    return (
      <View style={styles.userCard} key={user.id}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.userAvatarImage} />
            ) : (
              <Text style={styles.userAvatarText}>{avatarText}</Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userUsername}>@{userUsername}</Text>
            <View style={styles.userRole}>
              <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                {getRoleName(user.role)}
              </Text>
              {isMuted && <Text style={styles.mutedText}>🔇 Заглушен</Text>}
            </View>
          </View>
        </View>
        
        {canManage && user.id !== currentUser?.id && user.role === 'USER' && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.adminButton]}
              onPress={() => handleMakeAdmin(user.id)}
            >
              <Ionicons name="shield" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Админ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.moderatorButton]}
              onPress={() => handleMakeModerator(user.id)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Модер</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [currentUser, handleMakeAdmin, handleMakeModerator]);

  // Рендер поста
  const renderPost = useCallback(({ item: post }: { item: Post }) => (
    <View style={styles.postCard} key={post.id}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthorInfo}>
          <View style={styles.postAuthorAvatar}>
            {post.authorPhoto ? (
              <Image source={{ uri: post.authorPhoto }} style={styles.postAuthorAvatarImage} />
            ) : (
              <Text style={styles.postAuthorAvatarText}>
                {post.author && post.author.length > 0 ? post.author.charAt(0).toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={styles.postAuthorDetails}>
            <Text style={styles.postAuthor}>{post.author}</Text>
            <Text style={styles.postDate}>
              {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            {post.type && (
              <View style={[styles.postTypeBadge, { backgroundColor: getTypeColor(post.type) }]}>
                <Text style={styles.postTypeText}>{getTypeLabel(post.type)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.postStatus}>
          <View style={[styles.statusBadge, post.verified ? styles.verifiedBadge : styles.pendingBadge]}>
            <Ionicons 
              name={post.verified ? "checkmark-circle" : "time"} 
              size={14} 
              color={post.verified ? "#34C759" : "#FF9500"} 
            />
            <Text style={[styles.statusText, { color: post.verified ? "#34C759" : "#FF9500" }]}>
              {post.verified ? "Проверено" : "Ожидает"}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.postContent}>
        <Text style={styles.postText}>{post.content}</Text>
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        {post.location && (
          <View style={styles.postLocationContainer}>
            <Ionicons name="location" size={16} color="#8E8E93" />
            <Text style={styles.postLocation}>{post.location}</Text>
          </View>
        )}
      </View>
    </View>
  ), []);

  // Рендер сообщения
  const renderMessage = useCallback(({ item: message }: { item: Message }) => (
    <View style={styles.messageCard} key={message.id}>
      <View style={styles.messageHeader}>
        <View style={styles.messageUserInfo}>
          <View style={styles.messageUserAvatar}>
            {message.userPhoto ? (
              <Image source={{ uri: message.userPhoto }} style={styles.messageUserAvatarImage} />
            ) : (
              <Text style={styles.messageUserAvatarText}>
                {message.userName && message.userName.length > 0 ? message.userName.charAt(0).toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.messageUser}>{message.userName}</Text>
            <Text style={styles.messageDate}>{new Date(message.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.messageContent}>{message.content}</Text>
    </View>
  ), []);

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

      {/* Пороги чувствительности */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSubtitle}>Пороги чувствительности</Text>
        
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Модерация</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>
              {Math.round(aiSettings.moderationThreshold * 100)}%
            </Text>
            <CustomSlider
              value={aiSettings.moderationThreshold}
              onValueChange={(value) => saveAISettings({ ...aiSettings, moderationThreshold: value })}
              style={styles.slider}
            />
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Спам</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>
              {Math.round(aiSettings.spamThreshold * 100)}%
            </Text>
            <CustomSlider
              value={aiSettings.spamThreshold}
              onValueChange={(value) => saveAISettings({ ...aiSettings, spamThreshold: value })}
              style={styles.slider}
            />
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Токсичность</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>
              {Math.round(aiSettings.toxicityThreshold * 100)}%
            </Text>
            <CustomSlider
              value={aiSettings.toxicityThreshold}
              onValueChange={(value) => saveAISettings({ ...aiSettings, toxicityThreshold: value })}
              style={styles.slider}
            />
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Общая чувствительность</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>
              {Math.round(aiSettings.sensitivityLevel * 100)}%
            </Text>
            <CustomSlider
              value={aiSettings.sensitivityLevel}
              onValueChange={(value) => saveAISettings({ ...aiSettings, sensitivityLevel: value })}
              style={styles.slider}
            />
          </View>
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
            moderationThreshold: 0.7,
            spamThreshold: 0.8,
            toxicityThreshold: 0.6,
            sensitivityLevel: 0.5,
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
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshing={usersLoading}
            onRefresh={loadUsers}
          />
        );
      case 'posts':
        return (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      case 'messages':
        return (
          <FlatList
            data={messages}
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
          <Ionicons name="trash" size={20} color="#FF4757" />
        </TouchableOpacity>
      </View>

      {/* Вкладки */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Пользователи ({users.length})
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
    backgroundColor: '#FFFFFF',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  cleanupButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  adminButton: {
    backgroundColor: '#3390EC',
  },
  moderatorButton: {
    backgroundColor: '#34C759',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAuthorAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postAuthorAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postAuthorDetails: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
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
    marginTop: 8,
  },
  postText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  postLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  postLocation: {
    fontSize: 12,
    color: '#8E8E93',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageUserAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  messageDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  messageContent: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  aiSettingsContainer: {
    flex: 1,
    padding: 16,
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
    marginBottom: 24,
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
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3390EC',
    minWidth: 40,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  customSliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  customSliderTrack: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    position: 'relative',
  },
  customSliderProgress: {
    height: '100%',
    backgroundColor: '#3390EC',
    borderRadius: 4,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  customSliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    backgroundColor: '#3390EC',
    borderRadius: 10,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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