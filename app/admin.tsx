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

// Константы
const ROLES = {
  FOUNDER: { name: 'Основатель', color: '#FF6B35', icon: 'crown' as const },
  ADMIN: { name: 'Администратор', color: '#FF4757', icon: 'shield' as const },
  MODERATOR: { name: 'Модератор', color: '#3742FA', icon: 'checkmark-circle' as const },
  USER: { name: 'Пользователь', color: '#747D8C', icon: 'person' as const },
};

export default function AdminScreen() {
  const router = useRouter();
  const { currentUser, posts, messages } = useApp();
  
  // Состояние
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'messages'>('users');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Проверка доступа
  const hasAccess = useMemo(() => {
    if (!currentUser) return false;
    return ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(currentUser.role);
  }, [currentUser]);

  // Загрузка пользователей
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Получаем пользователей из AsyncStorage
      const storedUsers = await AsyncStorage.getItem('users');
      let userList: User[] = [];
      
      if (storedUsers) {
        userList = JSON.parse(storedUsers);
      } else {
        // Создаем базовых пользователей если их нет
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
      // Fallback данные
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

  // Инициализация
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      Alert.alert('Успех', 'Пользователь назначен администратором');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось назначить администратора');
    }
  }, [users]);

  const handleMakeModerator = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, role: 'MODERATOR' as const } : user
      );
      setUsers(updatedUsers);
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      Alert.alert('Успех', 'Пользователь назначен модератором');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось назначить модератора');
    }
  }, [users]);

  const handleMuteUser = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, isMuted: true } : user
      );
      setUsers(updatedUsers);
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      Alert.alert('Успех', 'Пользователь заглушен');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось заглушить пользователя');
    }
  }, [users]);

  const handleUnmuteUser = useCallback(async (userId: string) => {
    try {
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, isMuted: false } : user
      );
      setUsers(updatedUsers);
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      Alert.alert('Успех', 'Пользователь разглушен');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось разглушить пользователя');
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
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
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
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noAccessText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A2A2A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
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
    backgroundColor: '#2A2A2A',
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
    borderBottomColor: '#007AFF',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#3A3A3A',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#999',
    fontSize: 12,
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userUsername: {
    color: '#999',
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
    borderRadius: 8,
    gap: 4,
  },
  adminButton: {
    backgroundColor: '#FF4757',
  },
  moderatorButton: {
    backgroundColor: '#3742FA',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postAuthor: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  postDate: {
    color: '#999',
    fontSize: 12,
  },
  postContent: {
    color: 'white',
    fontSize: 14,
    marginBottom: 12,
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
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageUser: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageDate: {
    color: '#999',
    fontSize: 12,
  },
  messageContent: {
    color: 'white',
    fontSize: 14,
    marginBottom: 12,
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
    color: '#999',
    fontSize: 16,
  },
});