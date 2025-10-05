import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import { useApp } from '@/hooks/app-store';
import { useUserManagement } from '@/hooks/user-management-client';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Shield, 
  MessageCircle, 
  Users, 
  CheckCircle, 
  X, 
  Settings,
  Eye,
  EyeOff,
  Ban,
  UserX,
  UserCheck,
  FileText,
  Brain,
  TrendingUp,
  RefreshCw,
  Zap,
  UserCog,
  UserShield,
  Crown
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminScreen() {
  const { width } = Dimensions.get('window');

  // Безопасное извлечение данных с дефолтными значениями
  const { 
    posts = [], 
    messages = [], 
    currentUser, 
    users = [],
    moderatePost = () => {},
    deleteMessage = () => {},
    muteUser = () => {},
    unmuteUser = () => {},
    makeAdmin = () => {},
    makeModerator = () => {},
    banUser = () => {},
    unbanUser = () => {},
    kickUser = () => {},
    unkickUser = () => {}
  } = useApp();

  const { 
    managedUsers = [], 
    userStats = { total: 0, founders: 0, admins: 0, moderators: 0, users: 0 }, 
    selectedRole = null, 
    usersLoading = false, 
    error: userError = null,
    loadUsers = () => {},
    loadStats = () => {},
    setSelectedRole: setSelectedRoleHandler = () => {},
    setError: setUserError = () => {}
  } = useUserManagement();

  // Обширное логирование для отладки
  console.log('🔧 AdminScreen: currentUser:', currentUser);
  console.log('🔧 AdminScreen: currentUser?.role:', currentUser?.role);
  console.log('🔧 AdminScreen: currentUser?.id:', currentUser?.id);
  console.log('🔧 AdminScreen: posts length:', posts?.length || 0);
  console.log('🔧 AdminScreen: messages length:', messages?.length || 0);
  console.log('🔧 AdminScreen: managedUsers length:', managedUsers?.length || 0);
  console.log('🔧 AdminScreen: userStats:', userStats);
  console.log('🔧 AdminScreen: usersLoading:', usersLoading);

  const [activeTab, setActiveTab] = useState<'posts' | 'messages' | 'users' | 'user-management'>('user-management');

  // Проверяем доступ к админ панели
  if (!currentUser || !currentUser.id || !currentUser.role) {
    console.log('🔧 AdminScreen: currentUser not ready, showing loading');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0066FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Админ панель</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка пользователя...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Проверяем права доступа
  const hasAccess = currentUser.isAdmin || currentUser.isModerator || currentUser.role === 'FOUNDER';
  if (!hasAccess) {
    console.log('🔧 AdminScreen: No access, currentUser role:', currentUser.role);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0066FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Админ панель</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>У вас нет доступа к админ панели</Text>
          <Text style={styles.errorSubtext}>Роль: {currentUser.role || 'Не определена'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Создаем безопасные данные с fallback
  const safePosts = Array.isArray(posts) ? posts : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeManagedUsers = Array.isArray(managedUsers) ? managedUsers : [];
  const safeUserStats = userStats || { total: 0, founders: 0, admins: 0, moderators: 0, users: 0 };

  // Функции для работы с пользователями
  const handleMuteUser = (userId: string) => {
    try {
      muteUser(userId);
      Alert.alert('Успех', 'Пользователь заблокирован');
    } catch (error) {
      console.error('Error muting user:', error);
      Alert.alert('Ошибка', 'Не удалось заблокировать пользователя');
    }
  };

  const handleUnmuteUser = (userId: string) => {
    try {
      unmuteUser(userId);
      Alert.alert('Успех', 'Пользователь разблокирован');
    } catch (error) {
      console.error('Error unmuting user:', error);
      Alert.alert('Ошибка', 'Не удалось разблокировать пользователя');
    }
  };

  const handleMakeAdmin = (userId: string) => {
    try {
      makeAdmin(userId);
      Alert.alert('Успех', 'Пользователь назначен администратором');
    } catch (error) {
      console.error('Error making admin:', error);
      Alert.alert('Ошибка', 'Не удалось назначить администратора');
    }
  };

  const handleMakeModerator = (userId: string) => {
    try {
      makeModerator(userId);
      Alert.alert('Успех', 'Пользователь назначен модератором');
    } catch (error) {
      console.error('Error making moderator:', error);
      Alert.alert('Ошибка', 'Не удалось назначить модератора');
    }
  };

  // Функции для работы с постами
  const handleApprovePost = (postId: string) => {
    try {
      moderatePost(postId, 'approved');
      Alert.alert('Успех', 'Пост одобрен');
    } catch (error) {
      console.error('Error approving post:', error);
      Alert.alert('Ошибка', 'Не удалось одобрить пост');
    }
  };

  const handleRejectPost = (postId: string) => {
    try {
      moderatePost(postId, 'rejected');
      Alert.alert('Успех', 'Пост отклонен');
    } catch (error) {
      console.error('Error rejecting post:', error);
      Alert.alert('Ошибка', 'Не удалось отклонить пост');
    }
  };

  // Функции для работы с сообщениями
  const handleDeleteMessage = (messageId: string) => {
    try {
      deleteMessage(messageId);
      Alert.alert('Успех', 'Сообщение удалено');
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Ошибка', 'Не удалось удалить сообщение');
    }
  };

  // Получение иконки роли
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'FOUNDER': return <Crown size={16} color="#FFD700" />;
      case 'ADMIN': return <Shield size={16} color="#FF6B6B" />;
      case 'MODERATOR': return <UserShield size={16} color="#4ECDC4" />;
      default: return <Users size={16} color="#95A5A6" />;
    }
  };

  // Получение названия роли
  const getRoleName = (role: string) => {
    switch (role) {
      case 'FOUNDER': return 'Основатель';
      case 'ADMIN': return 'Администратор';
      case 'MODERATOR': return 'Модератор';
      default: return 'Пользователь';
    }
  };

  // Получение цвета роли
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'FOUNDER': return '#FFD700';
      case 'ADMIN': return '#FF6B6B';
      case 'MODERATOR': return '#4ECDC4';
      default: return '#95A5A6';
    }
  };

  // Рендер пользователя
  const renderUser = ({ item: user }: { item: any }) => {
    console.log('🔧 renderUser called with:', user);
    if (!user || !user.id) {
      console.log('🔧 renderUser: user is null or missing id, returning null');
      return null;
    }
    
    // Детальное логирование всех значений
    const userName = user.name || user.firstName || 'Пользователь';
    const userRole = user.role || 'USER';
    const userUsername = user.username || 'без_username';
    const userPhotoUrl = user.photoUrl;
    const avatarText = (userName || 'П').charAt(0).toUpperCase();
    const roleName = getRoleName(userRole) || 'Пользователь';
    const roleColor = getRoleColor(userRole) || '#95A5A6';
    const roleIcon = getRoleIcon(userRole) || <Users size={16} color="#95A5A6" />;
    
    console.log('🔧 renderUser values:', {
      userName,
      userRole,
      userUsername,
      userPhotoUrl,
      avatarText,
      roleName,
      roleColor,
      roleIcon: roleIcon ? 'JSX Element' : 'undefined',
      roleIconType: typeof roleIcon
    });
    
    // Дополнительная проверка на undefined
    if (!roleIcon) {
      console.error('🔧 ERROR: roleIcon is undefined for role:', userRole);
    }
    if (!roleColor) {
      console.error('🔧 ERROR: roleColor is undefined for role:', userRole);
    }
    if (!roleName) {
      console.error('🔧 ERROR: roleName is undefined for role:', userRole);
    }
    
    return (
      <View style={styles.userCard} key={user.id}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {userPhotoUrl ? (
              <Image source={{ uri: userPhotoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {avatarText}
              </Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userUsername}>@{userUsername}</Text>
            <View style={styles.roleContainer}>
              {roleIcon}
              <Text style={[styles.roleText, { color: roleColor }]}>
                {roleName}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          {userRole !== 'FOUNDER' && (
            <>
              {userRole !== 'ADMIN' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.adminButton]}
                  onPress={() => handleMakeAdmin(user.id)}
                >
                  <Shield size={16} color="#FF6B6B" />
                </TouchableOpacity>
              )}
              {userRole !== 'MODERATOR' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.moderatorButton]}
                  onPress={() => handleMakeModerator(user.id)}
                >
                  <UserShield size={16} color="#4ECDC4" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.muteButton]}
                onPress={() => user.isMuted ? handleUnmuteUser(user.id) : handleMuteUser(user.id)}
              >
                {user.isMuted ? <Eye size={16} color="#27AE60" /> : <EyeOff size={16} color="#E74C3C" />}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // Рендер поста
  const renderPost = ({ item: post }: { item: any }) => {
    console.log('🔧 renderPost called with:', post);
    if (!post || !post.id) {
      console.log('🔧 renderPost: post is null or missing id, returning null');
      return null;
    }
    
    return (
      <View style={styles.postCard} key={post.id}>
        <View style={styles.postHeader}>
          <Text style={styles.postUser}>{post.userName || 'Неизвестный пользователь'}</Text>
          <Text style={styles.postTime}>
            {post.timestamp ? new Date(post.timestamp).toLocaleString() : 'Неизвестное время'}
          </Text>
        </View>
        <Text style={styles.postDescription}>{post.description || 'Нет описания'}</Text>
        {post.photo && (
          <Image source={{ uri: post.photo }} style={styles.postImage} />
        )}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprovePost(post.id)}
          >
            <CheckCircle size={16} color="#27AE60" />
            <Text style={styles.actionText}>Одобрить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectPost(post.id)}
          >
            <X size={16} color="#E74C3C" />
            <Text style={styles.actionText}>Отклонить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Рендер сообщения
  const renderMessage = ({ item: message }: { item: any }) => {
    console.log('🔧 renderMessage called with:', message);
    if (!message || !message.id) {
      console.log('🔧 renderMessage: message is null or missing id, returning null');
      return null;
    }
    
    return (
      <View style={styles.messageCard} key={message.id}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageUser}>{message.userName || 'Неизвестный пользователь'}</Text>
          <Text style={styles.messageTime}>
            {message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Неизвестное время'}
          </Text>
        </View>
        <Text style={styles.messageText}>{message.text || 'Нет текста'}</Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteMessage(message.id)}
        >
          <X size={16} color="#E74C3C" />
          <Text style={styles.actionText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    );
  };

  console.log('🔧 AdminScreen: About to render with data:', {
    currentUser: currentUser?.id,
    currentUserRole: currentUser?.role,
    currentUserFull: currentUser,
    safePostsLength: safePosts?.length,
    safeMessagesLength: safeMessages?.length,
    safeManagedUsersLength: safeManagedUsers?.length,
    safeUserStats: safeUserStats,
    activeTab
  });
  
  // Дополнительная проверка на undefined
  if (!currentUser) {
    console.error('🔧 ERROR: currentUser is undefined in AdminScreen render');
  }
  if (!currentUser?.role) {
    console.error('🔧 ERROR: currentUser.role is undefined in AdminScreen render');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0066FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Админ панель</Text>
        <View style={styles.headerRight}>
          <Text style={styles.userRole}>{getRoleName(currentUser?.role || 'USER')}</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, (activeTab || '') === 'user-management' && styles.activeTab]}
          onPress={() => setActiveTab('user-management')}
        >
          <Users size={20} color={(activeTab || '') === 'user-management' ? '#0066FF' : '#666'} />
          <Text style={[styles.tabText, (activeTab || '') === 'user-management' && styles.activeTabText]}>
            Пользователи
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, (activeTab || '') === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <FileText size={20} color={(activeTab || '') === 'posts' ? '#0066FF' : '#666'} />
          <Text style={[styles.tabText, (activeTab || '') === 'posts' && styles.activeTabText]}>
            Посты
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, (activeTab || '') === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <MessageCircle size={20} color={(activeTab || '') === 'messages' ? '#0066FF' : '#666'} />
          <Text style={[styles.tabText, (activeTab || '') === 'messages' && styles.activeTabText]}>
            Сообщения
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {(activeTab || '') === 'user-management' && (
          <View style={styles.tabContent}>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{safeUserStats.total || 0}</Text>
                <Text style={styles.statLabel}>Всего</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{safeUserStats.founders || 0}</Text>
                <Text style={styles.statLabel}>Основатели</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{safeUserStats.admins || 0}</Text>
                <Text style={styles.statLabel}>Админы</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{safeUserStats.moderators || 0}</Text>
                <Text style={styles.statLabel}>Модераторы</Text>
              </View>
            </View>
            
            {usersLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Загрузка пользователей...</Text>
              </View>
            ) : (
              <FlatList
                data={safeManagedUsers}
                renderItem={renderUser}
                keyExtractor={(item) => {
                  console.log('🔧 keyExtractor for user:', item);
                  return item?.id || Math.random().toString();
                }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {(activeTab || '') === 'posts' && (
          <View style={styles.tabContent}>
            <FlatList
              data={safePosts}
              renderItem={renderPost}
              keyExtractor={(item) => {
                console.log('🔧 keyExtractor for post:', item);
                return item?.id || Math.random().toString();
              }}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {(activeTab || '') === 'messages' && (
          <View style={styles.tabContent}>
            <FlatList
              data={safeMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => {
                console.log('🔧 keyExtractor for message:', item);
                return item?.id || Math.random().toString();
              }}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerRight: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066FF',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0066FF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e1e5e9',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  postCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  postUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
  },
  postDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 12,
  },
  messageCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
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
  messageUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: '#E8F5E8',
  },
  rejectButton: {
    backgroundColor: '#FFE8E8',
  },
  deleteButton: {
    backgroundColor: '#FFE8E8',
  },
  adminButton: {
    backgroundColor: '#FFE8E8',
  },
  moderatorButton: {
    backgroundColor: '#E8F5F5',
  },
  muteButton: {
    backgroundColor: '#FFF3E0',
  },
});