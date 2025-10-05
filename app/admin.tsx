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
  isApproved?: boolean;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
}

interface AISettings {
  autoModeration: boolean;
  smartFiltering: boolean;
  contentAnalysis: boolean;
  spamDetection: boolean;
  toxicityFilter: boolean;
}

// Константы в стиле Telegram
const ROLES = {
  FOUNDER: { name: 'Основатель', color: '#FFD700', icon: 'crown' as const },
  ADMIN: { name: 'Админ', color: '#FF6B6B', icon: 'shield' as const },
  MODERATOR: { name: 'Модератор', color: '#4ECDC4', icon: 'checkmark-circle' as const },
  USER: { name: 'Пользователь', color: '#95A5A6', icon: 'person' as const },
};

export default function AdminScreen() {
  const router = useRouter();
  const { currentUser, posts, messages } = useApp();
  
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
      
      const storedUsers = await AsyncStorage.getItem('users');
      let userList: User[] = [];
      
      if (storedUsers) {
        userList = JSON.parse(storedUsers);
      } else {
        userList = [
          {
            id: '1',
            name: 'Основатель',
            username: 'founder',
            role: 'FOUNDER',
            isMuted: false,
            isBanned: false,
            isKicked: false,
            telegramId: 6014412239,
          },
          {
            id: '2',
            name: 'Админ',
            username: 'admin',
            role: 'ADMIN',
            isMuted: false,
            isBanned: false,
            isKicked: false,
            telegramId: 123456789,
          },
        ];
        await AsyncStorage.setItem('users', JSON.stringify(userList));
      }
      
      setUsers(userList);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      setUsers([
        {
          id: '1',
          name: 'Основатель',
          username: 'founder',
          role: 'FOUNDER',
          isMuted: false,
          isBanned: false,
          isKicked: false,
          telegramId: 6014412239,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

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
  const handleMakeAdmin = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, role: 'ADMIN' as const } : user
      );
      setUsers(updatedUsers);
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      Alert.alert('✅ Успех', 'Пользователь назначен администратором');
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось назначить администратора');
    }
  }, [users]);

  const handleMakeModerator = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, role: 'MODERATOR' as const } : user
      );
      setUsers(updatedUsers);
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
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
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
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
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      Alert.alert('🔊 Пользователь разглушен');
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось разглушить пользователя');
    }
  }, [users]);

  // Рендер пользователя
  const renderUser = useCallback(({ item: user }: { item: User }) => {
    const roleInfo = ROLES[user.role] || ROLES.USER;
    const userName = user.name || 'Без имени';
    const userUsername = user.username || 'без username';
    const avatarText = userName.charAt(0).toUpperCase();
    const isMuted = Boolean(user.isMuted);
    const canManage = currentUser?.role === 'FOUNDER' || 
                     (currentUser?.role === 'ADMIN' && user.role !== 'FOUNDER');

  return (
      <View style={styles.userCard} key={user.id}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: roleInfo.color }]}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarText}</Text>
            )}
      </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userUsername}>@{userUsername}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
              <Ionicons name={roleInfo.icon} size={12} color="white" />
              <Text style={styles.roleText}>{roleInfo.name}</Text>
          </View>
            </View>
          </View>
        
        {canManage && (
          <View style={styles.userActions}>
            {user.role === 'USER' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.adminButton]}
                  onPress={() => handleMakeAdmin(user.id)}
                >
                  <Ionicons name="shield" size={16} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.moderatorButton]}
                  onPress={() => handleMakeModerator(user.id)}
                >
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                </TouchableOpacity>
              </>
            )}
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
  }, [currentUser, handleMakeAdmin, handleMakeModerator, handleMuteUser, handleUnmuteUser]);

  // Рендер поста
  const renderPost = useCallback(({ item: post }: { item: Post }) => (
    <View style={styles.postCard} key={post.id}>
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{post.author}</Text>
        <Text style={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                </View>
      <Text style={styles.postContent}>{post.content}</Text>
      <View style={styles.postActions}>
        <TouchableOpacity style={[styles.actionButton, styles.approveButton]}>
          <Ionicons name="checkmark" size={16} color="white" />
          <Text style={styles.actionText}>Одобрить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
          <Ionicons name="close" size={16} color="white" />
          <Text style={styles.actionText}>Отклонить</Text>
        </TouchableOpacity>
              </View>
                      </View>
  ), []);

  // Рендер сообщения
  const renderMessage = useCallback(({ item: message }: { item: Message }) => (
    <View style={styles.messageCard} key={message.id}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageUser}>{message.userName}</Text>
        <Text style={styles.messageDate}>{new Date(message.createdAt).toLocaleDateString()}</Text>
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
    <View style={styles.aiSettingsContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings" size={20} color="#007AFF" />
        <Text style={styles.sectionTitle}>Настройки ИИ</Text>
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingName}>Автомодерация</Text>
          <Text style={styles.settingDescription}>Автоматическое удаление нежелательного контента</Text>
        </View>
        <Switch
          value={aiSettings.autoModeration}
          onValueChange={(value) => saveAISettings({ ...aiSettings, autoModeration: value })}
          trackColor={{ false: '#3A3A3A', true: '#007AFF' }}
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
          trackColor={{ false: '#3A3A3A', true: '#007AFF' }}
          thumbColor={aiSettings.smartFiltering ? '#FFFFFF' : '#FFFFFF'}
        />
                      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingName}>Анализ контента</Text>
          <Text style={styles.settingDescription}>Глубокий анализ текста и изображений</Text>
                          </View>
        <Switch
          value={aiSettings.contentAnalysis}
          onValueChange={(value) => saveAISettings({ ...aiSettings, contentAnalysis: value })}
          trackColor={{ false: '#3A3A3A', true: '#007AFF' }}
          thumbColor={aiSettings.contentAnalysis ? '#FFFFFF' : '#FFFFFF'}
        />
                        </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingName}>Защита от спама</Text>
          <Text style={styles.settingDescription}>Автоматическое обнаружение спама</Text>
                          </View>
        <Switch
          value={aiSettings.spamDetection}
          onValueChange={(value) => saveAISettings({ ...aiSettings, spamDetection: value })}
          trackColor={{ false: '#3A3A3A', true: '#007AFF' }}
          thumbColor={aiSettings.spamDetection ? '#FFFFFF' : '#FFFFFF'}
        />
          </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingName}>Фильтр токсичности</Text>
          <Text style={styles.settingDescription}>Обнаружение оскорбительного контента</Text>
                </View>
        <Switch
          value={aiSettings.toxicityFilter}
          onValueChange={(value) => saveAISettings({ ...aiSettings, toxicityFilter: value })}
          trackColor={{ false: '#3A3A3A', true: '#007AFF' }}
          thumbColor={aiSettings.toxicityFilter ? '#FFFFFF' : '#FFFFFF'}
        />
              </View>
    </View>
  ), [aiSettings, saveAISettings]);

  // Загрузка
  if (loading) {
                return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
        <View style={styles.headerSpacer} />
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
            data={['ALL', 'FOUNDER', 'ADMIN', 'MODERATOR', 'USER']}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
                            <TouchableOpacity
                style={[styles.filterButton, selectedRole === item && styles.activeFilterButton]}
                onPress={() => setSelectedRole(item)}
              >
                <Text style={[styles.filterText, selectedRole === item && styles.activeFilterText]}>
                  {item === 'ALL' ? 'Все' : ROLES[item as keyof typeof ROLES]?.name || item}
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
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
  adminButton: {
    backgroundColor: '#3390EC',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  postContent: {
    color: '#000000',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#2ED573',
  },
  rejectButton: {
    backgroundColor: '#FF4757',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
});