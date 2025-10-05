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
  contentAnalysis: boolean;
  spamDetection: boolean;
  toxicityFilter: boolean;
  imageModeration: boolean;
  locationFiltering: boolean;
  sentimentAnalysis: boolean;
  autoApprove: boolean;
  moderationThreshold: number;
  spamThreshold: number;
  toxicityThreshold: number;
}

export default function AdminScreen() {
  const router = useRouter();
  const { currentUser, posts, messages, clearExpiredPosts } = useApp();
  
  // Состояние
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'messages' | 'ai'>('users');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [aiSettings, setAiSettings] = useState<AISettings>({
    autoModeration: false,
    smartFiltering: false,
    contentAnalysis: false,
    spamDetection: false,
    toxicityFilter: false,
    imageModeration: false,
    locationFiltering: false,
    sentimentAnalysis: false,
    autoApprove: false,
    moderationThreshold: 0.7,
    spamThreshold: 0.8,
    toxicityThreshold: 0.6,
  });

  // Проверка доступа
  const hasAccess = useMemo(() => {
    if (!currentUser) return false;
    return ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(currentUser.role);
  }, [currentUser]);

  // Загрузка пользователей
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Создаем только основателя с реальными данными
      const founderUser: User = {
        id: 'founder-1',
        name: currentUser?.name || 'Основатель',
        username: currentUser?.username || 'founder',
        role: 'FOUNDER',
        isMuted: false,
        isBanned: false,
        isKicked: false,
        photoUrl: currentUser?.photoUrl,
        telegramId: currentUser?.telegramId || 6014412239,
      };
      
      setUsers([founderUser]);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Загрузка настроек ИИ
  const loadAISettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('aiSettings');
      if (stored) {
        setAiSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек ИИ:', error);
    }
  }, []);

  // Сохранение настроек ИИ
  const saveAISettings = useCallback(async (newSettings: AISettings) => {
    try {
      setAiSettings(newSettings);
      await AsyncStorage.setItem('aiSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Ошибка сохранения настроек ИИ:', error);
    }
  }, []);

  // Инициализация
  useEffect(() => {
    loadUsers();
    loadAISettings();
  }, [loadUsers, loadAISettings]);

  // Фильтрация пользователей
  const filteredUsers = useMemo(() => {
    if (selectedRole === 'ALL') return users;
    return users.filter(user => user.role === selectedRole);
  }, [users, selectedRole]);

  // Обработчики действий
  const handleMakeModerator = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, role: 'MODERATOR' as const } : user
      );
      setUsers(updatedUsers);
      Alert.alert('✅ Успех', 'Пользователь назначен модератором');
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось назначить модератора');
    }
  }, [users]);

  const handleMuteUser = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, isMuted: true } : user
      );
      setUsers(updatedUsers);
      Alert.alert('🔇 Пользователь заглушен');
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось заглушить пользователя');
    }
  }, [users]);

  const handleUnmuteUser = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, isMuted: false } : user
      );
      setUsers(updatedUsers);
      Alert.alert('🔊 Пользователь разглушен');
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось разглушить пользователя');
    }
  }, [users]);

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
          <View style={styles.avatar}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarText}</Text>
            )}
      </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userUsername}>@{userUsername}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role === 'FOUNDER' ? 'Основатель' : user.role}</Text>
          </View>
            </View>
          </View>
        
        {canManage && user.role !== 'FOUNDER' && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.moderatorButton]}
              onPress={() => handleMakeModerator(user.id)}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isMuted ? styles.unmuteButton : styles.muteButton]}
              onPress={() => isMuted ? handleUnmuteUser(user.id) : handleMuteUser(user.id)}
            >
              <Ionicons name={isMuted ? "volume-high" : "volume-mute"} size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [currentUser, handleMakeModerator, handleMuteUser, handleUnmuteUser]);

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
          <View>
            <Text style={styles.postAuthor}>{post.author}</Text>
            <Text style={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</Text>
              </View>
                      </View>
        {post.location && (
          <View style={styles.postLocation}>
            <Ionicons name="location" size={12} color="#707579" />
            <Text style={styles.postLocationText}>{post.location}</Text>
                      </View>
        )}
                    </View>
                    
      <Text style={styles.postContent}>{post.content}</Text>
      
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
      )}
      
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
      <TouchableOpacity style={[styles.actionButton, styles.deleteButton]}>
        <Ionicons name="trash" size={16} color="white" />
        <Text style={styles.actionText}>Удалить</Text>
                      </TouchableOpacity>
    </View>
  ), []);

  // Рендер настроек ИИ
  const renderAISettings = useCallback(() => (
    <ScrollView style={styles.aiSettingsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings" size={20} color="#3390EC" />
        <Text style={styles.sectionTitle}>Настройки ИИ</Text>
      </View>
      
      {/* Основные настройки */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Основные функции</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Автомодерация</Text>
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
            <Text style={styles.settingName}>Умная фильтрация</Text>
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
            <Text style={styles.settingName}>Анализ изображений</Text>
            <Text style={styles.settingDescription}>Модерация фотографий и картинок</Text>
                </View>
          <Switch
            value={aiSettings.imageModeration}
            onValueChange={(value) => saveAISettings({ ...aiSettings, imageModeration: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.imageModeration ? '#FFFFFF' : '#FFFFFF'}
          />
              </View>
      </View>

      {/* Пороги чувствительности */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Пороги чувствительности</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Порог модерации</Text>
            <Text style={styles.settingDescription}>Чувствительность к нежелательному контенту</Text>
                          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>
              {isNaN(aiSettings.moderationThreshold) ? '70%' : Math.round(aiSettings.moderationThreshold * 100)}%
            </Text>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack, { width: `${isNaN(aiSettings.moderationThreshold) ? 70 : aiSettings.moderationThreshold * 100}%` }]} />
            </View>
                      </View>
                    </View>
                    
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Порог спама</Text>
            <Text style={styles.settingDescription}>Чувствительность к спаму</Text>
                    </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>
              {isNaN(aiSettings.spamThreshold) ? '80%' : Math.round(aiSettings.spamThreshold * 100)}%
            </Text>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack, { width: `${isNaN(aiSettings.spamThreshold) ? 80 : aiSettings.spamThreshold * 100}%` }]} />
                  </View>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Порог токсичности</Text>
            <Text style={styles.settingDescription}>Чувствительность к оскорблениям</Text>
                </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>
              {isNaN(aiSettings.toxicityThreshold) ? '60%' : Math.round(aiSettings.toxicityThreshold * 100)}%
            </Text>
            <View style={styles.slider}>
              <View style={[styles.sliderTrack, { width: `${isNaN(aiSettings.toxicityThreshold) ? 60 : aiSettings.toxicityThreshold * 100}%` }]} />
              </View>
                        </View>
                        </View>
                        </View>

      {/* Дополнительные настройки */}
      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Дополнительно</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Автоодобрение</Text>
            <Text style={styles.settingDescription}>Автоматически одобрять безопасный контент</Text>
                        </View>
          <Switch
            value={aiSettings.autoApprove}
            onValueChange={(value) => saveAISettings({ ...aiSettings, autoApprove: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.autoApprove ? '#FFFFFF' : '#FFFFFF'}
          />
                        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Анализ настроений</Text>
            <Text style={styles.settingDescription}>Определение эмоциональной окраски сообщений</Text>
                    </View>
          <Switch
            value={aiSettings.sentimentAnalysis}
            onValueChange={(value) => saveAISettings({ ...aiSettings, sentimentAnalysis: value })}
            trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
            thumbColor={aiSettings.sentimentAnalysis ? '#FFFFFF' : '#FFFFFF'}
          />
                  </View>
      </View>
    </ScrollView>
  ), [aiSettings, saveAISettings]);

  // Загрузка
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3390EC" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Нет доступа
  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#FF4757" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            У вас нет прав для доступа к админ панели
          </Text>
                        <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
                        >
            <Text style={styles.backButtonText}>Назад</Text>
                        </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
                      
      {/* Табы */}
      <View style={styles.tabContainer}>
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
            Посты ({posts?.length || 0})
          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
                        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Сообщения ({messages?.length || 0})
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

      {/* Фильтр ролей для пользователей */}
      {activeTab === 'users' && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={['ALL', 'FOUNDER']}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
                            <TouchableOpacity
                style={[styles.filterButton, selectedRole === item && styles.activeFilterButton]}
                onPress={() => setSelectedRole(item)}
              >
                <Text style={[styles.filterText, selectedRole === item && styles.activeFilterText]}>
                  {item === 'ALL' ? 'Все' : 'Основатель'}
                </Text>
                            </TouchableOpacity>
                          )}
            showsHorizontalScrollIndicator={false}
          />
                    </View>
                  )}

      {/* Контент */}
      <View style={styles.content}>
        {activeTab === 'users' && (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Пользователи не найдены</Text>
                </View>
            }
          />
        )}
        
        {activeTab === 'posts' && (
          <FlatList
            data={posts || []}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Посты не найдены</Text>
          </View>
            }
          />
        )}
        
        {activeTab === 'messages' && (
          <FlatList
            data={messages || []}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Сообщения не найдены</Text>
            </View>
            }
          />
        )}

        {activeTab === 'ai' && renderAISettings()}
              </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#000000',
    marginTop: 16,
    fontSize: 16,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessTitle: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noAccessText: {
    color: '#707579',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  cleanupButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    color: '#707579',
    fontSize: 14,
  },
  activeTabText: {
    color: '#3390EC',
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#F4F4F5',
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeFilterButton: {
    backgroundColor: '#3390EC',
    borderColor: '#3390EC',
  },
  filterText: {
    color: '#707579',
    fontSize: 12,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F4F4F5',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    color: '#707579',
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#3390EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  moderatorButton: {
    backgroundColor: '#3390EC',
  },
  muteButton: {
    backgroundColor: '#FFA502',
  },
  unmuteButton: {
    backgroundColor: '#2ED573',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  postAuthorAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postAuthorAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  postAuthor: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  postDate: {
    color: '#707579',
    fontSize: 12,
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postLocationText: {
    color: '#707579',
    fontSize: 12,
  },
  postContent: {
    color: '#000000',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
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
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageUser: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  messageDate: {
    color: '#707579',
    fontSize: 12,
  },
  messageContent: {
    color: '#000000',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#FF4757',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#707579',
    fontSize: 16,
  },
  // Настройки ИИ
  aiSettingsContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#707579',
    fontSize: 14,
    lineHeight: 20,
  },
  sliderContainer: {
    alignItems: 'center',
    width: 80,
  },
  sliderValue: {
    color: '#3390EC',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  slider: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderTrack: {
    height: '100%',
    backgroundColor: '#3390EC',
    borderRadius: 2,
  },
});