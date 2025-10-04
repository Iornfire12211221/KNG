import React, { useState } from 'react';
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
import { useAILearning } from '@/hooks/ai-learning';
import { useAISettings } from '@/hooks/ai-settings';
import { useSmartAI } from '@/hooks/smart-ai';
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
  RefreshCw
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminScreen() {
  const { width } = Dimensions.get('window');

  const { 
    posts, 
    messages, 
    currentUser, 
    users,
    moderatePost, 
    deleteMessage, 
    muteUser,
    unmuteUser,
    makeAdmin, 
    makeModerator,
    banUser,
    unbanUser,
    kickUser,
    unkickUser
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'messages' | 'users' | 'ai' | 'smart-ai'>('smart-ai');
  const { modelStats, trainingData, trainModel, recordModeratorDecision, recordAIDecision, isTraining } = useAILearning();
  const { 
    settings: aiSettings, 
    updateConfidenceThreshold, 
    toggleAutoModeration, 
    toggleFallbackSystem, 
    updateMaxPosts, 
    updateCacheTime, 
    testAI, 
    resetToDefaults,
    getRecommendations 
  } = useAISettings();

  // 🧠 НОВАЯ УМНАЯ ИИ-СИСТЕМА
  const {
    isAnalyzing,
    modelStats: smartStats,
    analyzePost,
    learnFromModerator,
    testAI: testSmartAI,
    getRecommendations: getSmartRecommendations,
    forceLearning,
    isSmart,
    isAccurate,
    isLearning
  } = useSmartAI();
  
  // Синхронизируем данные обучения с постами
  React.useEffect(() => {
    // Записываем решения ИИ для новых постов
    posts.forEach(post => {
      if (post.autoApproved || post.rejectedByAI || post.needsModeration) {
        const existingRecord = trainingData.find(item => item.postId === post.id);
        if (!existingRecord) {
          const aiDecision = (post.autoApproved && !post.needsModeration) ? 'approve' : 'reject';
          const confidence = post.autoApproved ? 0.9 : 0.7;
          recordAIDecision(post, aiDecision, confidence);
        }
      }
    });
  }, [posts, trainingData, recordAIDecision]);

  if (!currentUser?.isAdmin && !currentUser?.isModerator) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0066FF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.noAccessContainer}>
          <Shield size={64} color="#C7C7CC" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            У вас нет прав администратора или модератора
          </Text>
          
          {/* Временная кнопка для получения админских прав */}
          <TouchableOpacity 
            style={styles.getAdminButton}
            onPress={() => {
              Alert.alert(
                'Получить права администратора?',
                'Это временная функция для демонстрации',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { 
                    text: 'Да', 
                    onPress: () => {
                      makeAdmin(currentUser?.id || '');
                      Alert.alert('Успешно', 'Вы получили права администратора');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.getAdminButtonText}>Получить права администратора</Text>
          </TouchableOpacity>
          

        </View>
      </SafeAreaView>
    );
  }

  const pendingPosts = posts.filter(post => post.needsModeration);
  const allMessages = messages.filter(msg => !msg.isDeleted);
  const allUsers = users;

  const filteredPosts = pendingPosts;
  const filteredMessages = allMessages;
  const filteredUsers = allUsers;

  const handleApprovePost = async (postId: string) => {
    moderatePost(postId, true);
    // Записываем решение модератора для обучения ИИ
    await recordModeratorDecision(postId, 'approved');
  };

  const handleRejectPost = (postId: string) => {
    Alert.alert(
      'Удалить пост?',
      'Пост будет удален без возможности восстановления',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: async () => {
          moderatePost(postId, false);
          // Записываем решение модератора для обучения ИИ
          await recordModeratorDecision(postId, 'rejected');
        }}
      ]
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Удалить сообщение?',
      'Сообщение будет скрыто от пользователей',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => deleteMessage(messageId) }
      ]
    );
  };

  const handleMuteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Заглушить пользователя?',
      `Пользователь ${userName} не сможет писать сообщения`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: '5 мин', onPress: () => muteUser(userId, 5 * 60 * 1000) },
        { text: '30 мин', onPress: () => muteUser(userId, 30 * 60 * 1000) },
        { text: '1 час', onPress: () => muteUser(userId, 60 * 60 * 1000) }
      ]
    );
  };

  const handleUnmuteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Разглушить пользователя?',
      `Пользователь ${userName} снова сможет писать сообщения`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Разглушить', onPress: () => unmuteUser(userId) }
      ]
    );
  };

  const handleBanUser = (userId: string, userName: string) => {
    Alert.alert(
      'Забанить пользователя?',
      `Выберите длительность бана для ${userName}`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: '1 час', onPress: () => banUser(userId, 60 * 60 * 1000, 'Нарушение правил') },
        { text: '1 день', onPress: () => banUser(userId, 24 * 60 * 60 * 1000, 'Серьезное нарушение') },
        { text: '1 неделя', onPress: () => banUser(userId, 7 * 24 * 60 * 60 * 1000, 'Повторное нарушение') },
        { text: 'Навсегда', style: 'destructive', onPress: () => banUser(userId, -1, 'Постоянный бан') }
      ]
    );
  };

  const handleUnbanUser = (userId: string, userName: string) => {
    Alert.alert(
      'Разбанить пользователя?',
      `Пользователь ${userName} снова получит доступ к приложению`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Разбанить', onPress: () => unbanUser(userId) }
      ]
    );
  };

  const handleKickUser = (userId: string, userName: string) => {
    Alert.alert(
      'Кикнуть пользователя?',
      `Пользователь ${userName} будет исключен из текущей сессии`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Кикнуть', style: 'destructive', onPress: () => kickUser(userId, 'Исключен администратором') }
      ]
    );
  };

  const handleUnkickUser = (userId: string, userName: string) => {
    Alert.alert(
      'Восстановить пользователя?',
      `Пользователь ${userName} будет восстановлен`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Восстановить', onPress: () => unkickUser(userId) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#000" />
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <View style={[styles.tabIconContainer, activeTab === 'posts' && styles.tabIconActive]}>
            <FileText size={20} color={activeTab === 'posts' ? '#000' : '#999'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Посты
          </Text>
          {pendingPosts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingPosts.length}</Text>
            </View>
          )}
        </Pressable>
        
        <Pressable
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <View style={[styles.tabIconContainer, activeTab === 'messages' && styles.tabIconActive]}>
            <MessageCircle size={20} color={activeTab === 'messages' ? '#000' : '#999'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            Чат
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <View style={[styles.tabIconContainer, activeTab === 'users' && styles.tabIconActive]}>
            <Users size={20} color={activeTab === 'users' ? '#000' : '#999'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Пользователи
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <View style={[styles.tabIconContainer, activeTab === 'ai' && styles.tabIconActive]}>
            <Brain size={20} color={activeTab === 'ai' ? '#000' : '#999'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            ИИ
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'smart-ai' && styles.tabActive]}
          onPress={() => setActiveTab('smart-ai')}
        >
          <View style={[styles.tabIconContainer, activeTab === 'smart-ai' && styles.tabIconActive]}>
            <Zap size={20} color={activeTab === 'smart-ai' ? '#000' : '#999'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'smart-ai' && styles.tabTextActive]}>
            🧠 Умная ИИ
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'posts' && (
          <View style={styles.postsContainer}>
            {filteredPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <FileText size={32} color="#C7C7CC" />
                </View>
                <Text style={styles.emptyTitle}>Нет постов на модерации</Text>
                <Text style={styles.emptyText}>Все посты проверены</Text>
              </View>
            ) : (
              <FlatList 
                data={filteredPosts}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={styles.horizontalPostsList}
                getItemLayout={(data, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                renderItem={({ item: post }) => (
                  <View style={[styles.moderationCard, { width: width - 48 }]}>
                    <View style={styles.moderationHeader}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{post.userName}</Text>
                        <Text style={styles.timestamp}>
                          {new Date(post.timestamp).toLocaleString('ru-RU')}
                        </Text>
                      </View>
                      <View style={styles.typeInfo}>
                        <Text style={styles.postType}>{post.type}</Text>
                        <Text style={styles.severity}>{post.severity}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.description}>{post.description}</Text>
                    
                    {post.photo && (
                      <Image 
                        source={{ uri: post.photo.startsWith('data:') ? post.photo : `data:image/jpeg;base64,${post.photo}` }} 
                        style={styles.postImage} 
                        resizeMode="cover"
                      />
                    )}
                    
                    <Text style={styles.coordinates}>
                      📍 {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
                    </Text>
                    
                    {post.autoApproved && (
                      <View style={styles.autoApprovedInfo}>
                        <View style={styles.aiStatusContainer}>
                          <Text style={styles.aiLabel}>AI одобрил</Text>
                        </View>
                        {post.autoApprovalReason && (
                          <Text style={styles.autoApprovalReason}>{post.autoApprovalReason}</Text>
                        )}
                      </View>
                    )}
                    
                    {post.rejectedByAI && (
                      <View style={styles.aiRejectedInfo}>
                        <View style={styles.aiStatusContainer}>
                          <View style={styles.rejectContainer}>
                            <Text style={styles.rejectMark}>✗</Text>
                          </View>
                          <Text style={styles.aiRejectedLabel}>ИИ отклонил пост</Text>
                        </View>
                        {post.aiRejectionReason && (
                          <View style={styles.rejectionReasonContainer}>
                            <Text style={styles.rejectionReasonTitle}>Причина отклонения:</Text>
                            <Text style={styles.aiRejectionReason}>{post.aiRejectionReason}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    
                    <View style={styles.moderationActions}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectPost(post.id)}
                      >
                        <X size={16} color="#FF3B30" />
                        <Text style={styles.rejectButtonText}>Отклонить</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApprovePost(post.id)}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.approveButtonText}>Одобрить</Text>
                      </TouchableOpacity>
                      
                      {post.autoApproved && (
                        <View style={styles.aiApprovedIndicator}>
                          <View style={styles.checkmarkContainer}>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {activeTab === 'messages' && (
          <View style={{ paddingHorizontal: 20 }}>
            {filteredMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MessageCircle size={32} color="#C7C7CC" />
                </View>
                <Text style={styles.emptyTitle}>Нет сообщений</Text>
                <Text style={styles.emptyText}>Чат пуст</Text>
              </View>
            ) : (
              filteredMessages.map((message) => {
                const messageUser = users.find(u => u.id === message.userId);
                const isUserMuted = messageUser?.isMuted && messageUser.mutedUntil && messageUser.mutedUntil > Date.now();
                
                return (
                  <View key={message.id} style={styles.messageCard}>
                    <View style={styles.messageHeader}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{message.userName}</Text>
                        <Text style={styles.timestamp}>
                          {new Date(message.timestamp).toLocaleString('ru-RU')}
                        </Text>
                        {isUserMuted && (
                          <View style={styles.mutedBadge}>
                            <Text style={styles.mutedBadgeText}>Заглушен</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <Text style={styles.messageText}>{message.text}</Text>
                    
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteMessage(message.id)}
                      >
                        <X size={14} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>Удалить</Text>
                      </TouchableOpacity>
                      
                      {messageUser && (
                        isUserMuted ? (
                          <TouchableOpacity
                            style={styles.unmuteButton}
                            onPress={() => handleUnmuteUser(messageUser.id, messageUser.name)}
                          >
                            <Eye size={14} color="#34C759" />
                            <Text style={styles.unmuteButtonText}>Разглушить</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.muteButton}
                            onPress={() => handleMuteUser(messageUser.id, messageUser.name)}
                          >
                            <EyeOff size={14} color="#FF9500" />
                            <Text style={styles.muteButtonText}>Заглушить</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View style={{ paddingHorizontal: 20 }}>
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Users size={32} color="#C7C7CC" />
                </View>
                <Text style={styles.emptyTitle}>Пользователи не найдены</Text>
              </View>
            ) : (
              filteredUsers.map((user) => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userId}>
                      Регистрация: {new Date(user.registeredAt).toLocaleDateString('ru-RU')}
                    </Text>
                    <View style={styles.userBadges}>
                      {user.isAdmin && (
                        <View style={styles.roleBadge}>
                          <Shield size={12} color="#FF9500" />
                          <Text style={styles.roleText}>Администратор</Text>
                        </View>
                      )}
                      {user.isModerator && !user.isAdmin && (
                        <View style={styles.roleBadge}>
                          <Settings size={12} color="#0066FF" />
                          <Text style={styles.roleText}>Модератор</Text>
                        </View>
                      )}
                      {user.isMuted && user.mutedUntil && user.mutedUntil > Date.now() && (
                        <View style={styles.mutedBadge}>
                          <Text style={styles.mutedBadgeText}>Заглушен</Text>
                        </View>
                      )}
                      {user.isBanned && (user.bannedUntil === -1 || (user.bannedUntil && user.bannedUntil > Date.now())) && (
                        <View style={styles.bannedBadge}>
                          <Text style={styles.bannedBadgeText}>
                            {user.bannedUntil === -1 ? 'Забанен навсегда' : 'Забанен'}
                          </Text>
                        </View>
                      )}
                      {user.isKicked && (
                        <View style={styles.kickedBadge}>
                          <Text style={styles.kickedBadgeText}>Исключен</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {(currentUser?.isAdmin || currentUser?.isModerator) && user.id !== currentUser.id && (
                    <View style={styles.userActions}>
                      {/* Mute/Unmute */}
                      {user.isMuted && user.mutedUntil && user.mutedUntil > Date.now() ? (
                        <TouchableOpacity
                          style={styles.unmuteUserButton}
                          onPress={() => handleUnmuteUser(user.id, user.name)}
                        >
                          <Eye size={12} color="#34C759" />
                          <Text style={styles.unmuteUserButtonText}>Разглушить</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.muteUserButton}
                          onPress={() => handleMuteUser(user.id, user.name)}
                        >
                          <EyeOff size={12} color="#FF9500" />
                          <Text style={styles.muteUserButtonText}>Заглушить</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Ban/Unban */}
                      {user.isBanned && (user.bannedUntil === -1 || (user.bannedUntil && user.bannedUntil > Date.now())) ? (
                        <TouchableOpacity
                          style={styles.unbanUserButton}
                          onPress={() => handleUnbanUser(user.id, user.name)}
                        >
                          <UserCheck size={12} color="#34C759" />
                          <Text style={styles.unbanUserButtonText}>Разбанить</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.banUserButton}
                          onPress={() => handleBanUser(user.id, user.name)}
                        >
                          <Ban size={12} color="#FF3B30" />
                          <Text style={styles.banUserButtonText}>Забанить</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Kick/Unkick */}
                      {user.isKicked ? (
                        <TouchableOpacity
                          style={styles.unkickUserButton}
                          onPress={() => handleUnkickUser(user.id, user.name)}
                        >
                          <UserCheck size={12} color="#007AFF" />
                          <Text style={styles.unkickUserButtonText}>Восстановить</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.kickUserButton}
                          onPress={() => handleKickUser(user.id, user.name)}
                        >
                          <UserX size={12} color="#FF9500" />
                          <Text style={styles.kickUserButtonText}>Кикнуть</Text>
                        </TouchableOpacity>
                      )}
                      
                      {currentUser?.isAdmin && (
                        <>
                          {!user.isModerator && (
                            <TouchableOpacity
                              style={styles.moderatorButton}
                              onPress={() => {
                                Alert.alert(
                                  'Назначить модератором?',
                                  `Пользователь ${user.name} получит права модератора`,
                                  [
                                    { text: 'Отмена', style: 'cancel' },
                                    { text: 'Назначить', onPress: () => makeModerator(user.id) }
                                  ]
                                );
                              }}
                            >
                              <Settings size={12} color="#007AFF" />
                              <Text style={styles.moderatorButtonText}>Модератор</Text>
                            </TouchableOpacity>
                          )}
                          {!user.isAdmin && (
                            <TouchableOpacity
                              style={styles.adminButton}
                              onPress={() => {
                                Alert.alert(
                                  'Назначить администратором?',
                                  `Пользователь ${user.name} получит полные права администратора`,
                                  [
                                    { text: 'Отмена', style: 'cancel' },
                                    { text: 'Назначить', onPress: () => makeAdmin(user.id) }
                                  ]
                                );
                              }}
                            >
                              <Shield size={12} color="#FF9500" />
                              <Text style={styles.adminButtonText}>Админ</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'ai' && (
          <View style={styles.aiContainer}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiVersion}>Версия модели: {modelStats.modelVersion}</Text>
            </View>
            
            {/* Статистика ИИ */}
            <View style={styles.aiStatsRow}>
              <View style={styles.aiStatCard}>
                <TrendingUp size={20} color="#000" />
                <Text style={styles.aiStatValue}>{modelStats.accuracy.toFixed(1)}%</Text>
                <Text style={styles.aiStatLabel}>Точность</Text>
              </View>
              
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{modelStats.totalDecisions}</Text>
                <Text style={styles.aiStatLabel}>Всего решений</Text>
              </View>
            </View>
            
            <View style={styles.aiStatsRow}>
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{modelStats.correctDecisions}</Text>
                <Text style={styles.aiStatLabel}>Правильных</Text>
              </View>
              
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{modelStats.falsePositives}</Text>
                <Text style={styles.aiStatLabel}>Ложных одобрений</Text>
              </View>
            </View>
            
            <View style={styles.aiStatsRow}>
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{modelStats.falseNegatives}</Text>
                <Text style={styles.aiStatLabel}>Ложных отклонений</Text>
              </View>
              
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{trainingData.length}</Text>
                <Text style={styles.aiStatLabel}>Обучающих данных</Text>
              </View>
            </View>
            
            <Text style={styles.aiLastTrained}>
              Последнее обучение: {new Date(modelStats.lastTrainingDate).toLocaleString('ru-RU')}
            </Text>
            
            {/* Настройки ИИ */}
            <View style={styles.aiSettingsContainer}>
              <Text style={styles.aiSettingsTitle}>Настройки ИИ</Text>
              
              {/* Порог уверенности */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Порог уверенности для автоодобрения</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderValue}>{aiSettings.confidenceThreshold}%</Text>
                  <View style={styles.slider}>
                    <View style={[styles.sliderTrack, { width: `${aiSettings.confidenceThreshold}%` }]} />
                    <View style={[styles.sliderThumb, { left: `${aiSettings.confidenceThreshold}%` }]} />
                  </View>
                </View>
              </View>
              
              {/* Автоматическая модерация */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Автоматическая модерация</Text>
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={toggleAutoModeration}
                >
                  <View style={[styles.toggle, aiSettings.autoModeration && styles.toggleActive]} />
                </TouchableOpacity>
              </View>
              
              {/* Fallback система */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Fallback система</Text>
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={toggleFallbackSystem}
                >
                  <View style={[styles.toggle, aiSettings.fallbackSystem && styles.toggleActive]} />
                </TouchableOpacity>
              </View>
              
              {/* Ограничение постов */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Максимум постов на карте</Text>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateMaxPosts(aiSettings.maxPostsOnMap - 5)}
                  >
                    <Text style={styles.numberButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{aiSettings.maxPostsOnMap}</Text>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateMaxPosts(aiSettings.maxPostsOnMap + 5)}
                  >
                    <Text style={styles.numberButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Кэширование */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Время кэширования (минуты)</Text>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateCacheTime(aiSettings.cacheTimeMinutes - 1)}
                  >
                    <Text style={styles.numberButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{aiSettings.cacheTimeMinutes}</Text>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => updateCacheTime(aiSettings.cacheTimeMinutes + 1)}
                  >
                    <Text style={styles.numberButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Действия */}
            <View style={styles.aiActionsContainer}>
              <TouchableOpacity
                style={[styles.aiTrainButton, isTraining && styles.aiTrainButtonDisabled]}
                onPress={trainModel}
                disabled={isTraining}
              >
                <RefreshCw size={18} color="#FFFFFF" />
                <Text style={styles.aiTrainButtonText}>
                  {isTraining ? 'Обучение...' : 'Запустить обучение'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aiTestButton}
                onPress={async () => {
                  const result = await testAI("ДПС стоит на трассе");
                  Alert.alert(
                    'Тест ИИ',
                    `Решение: ${result.result?.decision}\nУверенность: ${result.result?.confidence}%\nПричина: ${result.result?.reasoning}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Brain size={18} color="#0066FF" />
                <Text style={styles.aiTestButtonText}>Тестировать ИИ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aiResetButton}
                onPress={() => {
                  Alert.alert(
                    'Сбросить настройки ИИ?',
                    'Все настройки будут возвращены к значениям по умолчанию',
                    [
                      { text: 'Отмена', style: 'cancel' },
                      { text: 'Сбросить', style: 'destructive', onPress: resetToDefaults }
                    ]
                  );
                }}
              >
                <Settings size={18} color="#FF9500" />
                <Text style={styles.aiResetButtonText}>Сбросить настройки</Text>
              </TouchableOpacity>
            </View>
            
            {/* Логи ИИ */}
            <View style={styles.aiLogsContainer}>
              <Text style={styles.aiLogsTitle}>Последние действия ИИ</Text>
              <ScrollView style={styles.aiLogsList} showsVerticalScrollIndicator={false}>
                <View style={styles.aiLogItem}>
                  <Text style={styles.aiLogTime}>15:30</Text>
                  <Text style={styles.aiLogAction}>Одобрен пост "ДПС на трассе"</Text>
                  <Text style={styles.aiLogConfidence}>95%</Text>
                </View>
                <View style={styles.aiLogItem}>
                  <Text style={styles.aiLogTime}>15:28</Text>
                  <Text style={styles.aiLogAction}>Отклонен пост "Спам"</Text>
                  <Text style={styles.aiLogConfidence}>88%</Text>
                </View>
                <View style={styles.aiLogItem}>
                  <Text style={styles.aiLogTime}>15:25</Text>
                  <Text style={styles.aiLogAction}>Одобрен пост "Ремонт дороги"</Text>
                  <Text style={styles.aiLogConfidence}>92%</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* 🧠 НОВАЯ УМНАЯ ИИ-СИСТЕМА */}
        {activeTab === 'smart-ai' && (
          <View style={styles.aiContainer}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiVersion}>🧠 Умная ИИ v{smartStats.version}</Text>
              <View style={[styles.statusBadge, isSmart ? styles.statusGood : styles.statusWarning]}>
                <Text style={styles.statusText}>
                  {isSmart ? 'УМНАЯ' : 'ОБУЧАЕТСЯ'}
                </Text>
              </View>
            </View>
            
            {/* Статистика умной ИИ */}
            <View style={styles.aiStatsRow}>
              <View style={styles.aiStatCard}>
                <Zap size={20} color="#000" />
                <Text style={styles.aiStatValue}>{smartStats.intelligence.toFixed(1)}%</Text>
                <Text style={styles.aiStatLabel}>Интеллект</Text>
              </View>
              
              <View style={styles.aiStatCard}>
                <TrendingUp size={20} color="#000" />
                <Text style={styles.aiStatValue}>{smartStats.accuracy.toFixed(1)}%</Text>
                <Text style={styles.aiStatLabel}>Точность</Text>
              </View>
            </View>
            
            <View style={styles.aiStatsRow}>
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{smartStats.totalDecisions}</Text>
                <Text style={styles.aiStatLabel}>Всего решений</Text>
              </View>
              
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{smartStats.correctDecisions}</Text>
                <Text style={styles.aiStatLabel}>Правильных</Text>
              </View>
            </View>
            
            <View style={styles.aiStatsRow}>
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>{smartStats.patternsCount}</Text>
                <Text style={styles.aiStatLabel}>Паттернов</Text>
              </View>
              
              <View style={styles.aiStatCard}>
                <Text style={styles.aiStatValue}>
                  {isLearning ? 'ДА' : 'НЕТ'}
                </Text>
                <Text style={styles.aiStatLabel}>Обучение</Text>
              </View>
            </View>
            
            <Text style={styles.aiLastTrained}>
              Последнее обучение: {new Date(smartStats.lastTraining).toLocaleString('ru-RU')}
            </Text>
            
            {/* Рекомендации умной ИИ */}
            <View style={styles.aiSettingsContainer}>
              <Text style={styles.aiSettingsTitle}>Рекомендации умной ИИ</Text>
              {getSmartRecommendations().map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.recommendationText}>• {rec}</Text>
                </View>
              ))}
            </View>
            
            {/* Действия умной ИИ */}
            <View style={styles.aiActionsContainer}>
              <TouchableOpacity
                style={[styles.aiTrainButton, isAnalyzing && styles.aiTrainButtonDisabled]}
                onPress={forceLearning}
                disabled={isAnalyzing}
              >
                <Zap size={18} color="#FFFFFF" />
                <Text style={styles.aiTrainButtonText}>
                  {isAnalyzing ? 'Анализ...' : 'Принудительное обучение'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aiTestButton}
                onPress={async () => {
                  try {
                    const result = await testSmartAI({
                      type: 'dps',
                      description: 'ДПС стоит на трассе, будьте осторожны',
                      hasPhoto: true
                    });
                    Alert.alert(
                      'Тест умной ИИ',
                      `Решение: ${result.decision}\nУверенность: ${(result.confidence * 100).toFixed(1)}%\nПричина: ${result.reasoning}\nПаттерны: ${result.patterns.join(', ')}`,
                      [{ text: 'OK' }]
                    );
                  } catch (error) {
                    Alert.alert('Ошибка', 'Не удалось протестировать умную ИИ');
                  }
                }}
              >
                <Brain size={18} color="#0066FF" />
                <Text style={styles.aiTestButtonText}>Тестировать умную ИИ</Text>
              </TouchableOpacity>
            </View>
            
            {/* Статус системы */}
            <View style={styles.systemStatusContainer}>
              <Text style={styles.systemStatusTitle}>Статус системы</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Интеллект:</Text>
                <View style={[styles.statusBar, { width: `${smartStats.intelligence}%` }]} />
                <Text style={styles.statusValue}>{smartStats.intelligence.toFixed(1)}%</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Точность:</Text>
                <View style={[styles.statusBar, { width: `${smartStats.accuracy}%` }]} />
                <Text style={styles.statusValue}>{smartStats.accuracy.toFixed(1)}%</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Паттерны:</Text>
                <View style={[styles.statusBar, { width: `${Math.min(smartStats.patternsCount * 5, 100)}%` }]} />
                <Text style={styles.statusValue}>{smartStats.patternsCount}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 36,
    height: 36,
  },
  adminBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  noAccessTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 24,
    textAlign: 'center',
  },
  noAccessText: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  getAdminButton: {
    marginTop: 40,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getAdminButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  demoContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  demoButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  demoButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 10,
    flexWrap: 'wrap',
    paddingHorizontal: 1,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabIconActive: {
    backgroundColor: '#E8E8E8',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: '30%',
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  postsContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  horizontalPostsList: {
    paddingHorizontal: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  moderationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flex: 1,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '500',
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  muteButtonText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
  unmuteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  unmuteButtonText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
  mutedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  mutedBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
  },
  userBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  muteUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFF',
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  muteUserButtonText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
  unmuteUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFF',
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  unmuteUserButtonText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
  moderationHeader: {
    flexDirection: 'column',
    marginBottom: 12,
    gap: 6,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  postType: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severity: {
    fontSize: 10,
    color: '#FF9500',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  description: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  postImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'cover',
    backgroundColor: '#F5F5F5',
  },
  coordinates: {
    fontSize: 10,
    color: '#999',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  moderationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#000',
    borderRadius: 8,
    gap: 4,
  },
  approveButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  userEmail: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  userId: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 3,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  moderatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F0FF',
    borderRadius: 8,
    gap: 4,
  },
  moderatorButtonText: {
    fontSize: 12,
    color: '#0066FF',
    fontWeight: '500',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    gap: 4,
  },
  adminButtonText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  bannedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  bannedBadgeText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  kickedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  kickedBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
  },
  banUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  banUserButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  unbanUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  unbanUserButtonText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  kickUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  kickUserButtonText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  unkickUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  unkickUserButtonText: {
    fontSize: 12,
    color: '#0066FF',
    fontWeight: '500',
  },
  autoApprovedInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  aiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  aiApprovedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  rejectContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectMark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  aiLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  autoApprovalReason: {
    fontSize: 11,
    color: '#059669',
    fontStyle: 'italic',
  },
  aiRejectedInfo: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F87171',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aiRejectedLabel: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
    marginLeft: 4,
  },
  rejectionReasonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  rejectionReasonTitle: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    marginBottom: 4,
  },
  aiRejectionReason: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // AI Tab Styles - Minimalistic
  aiContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  aiHeader: {
    marginBottom: 20,
  },
  aiVersion: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  aiStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  aiStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  aiStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  aiStatLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  aiLastTrained: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  aiTrainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  aiTrainButtonDisabled: {
    opacity: 0.5,
  },
  aiTrainButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Новые стили для настроек ИИ
  aiSettingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  aiSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderValue: {
    fontSize: 12,
    color: '#0066FF',
    fontWeight: '600',
    minWidth: 30,
  },
  slider: {
    width: 100,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#0066FF',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#0066FF',
    borderRadius: 8,
    transform: [{ translateX: -8 }],
  },
  toggleButton: {
    width: 50,
    height: 30,
    backgroundColor: '#E5E5E5',
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggle: {
    width: 26,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleActive: {
    transform: [{ translateX: 20 }],
    backgroundColor: '#0066FF',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberButton: {
    width: 32,
    height: 32,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  numberValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    minWidth: 30,
    textAlign: 'center',
  },
  aiActionsContainer: {
    gap: 12,
    marginTop: 20,
  },
  aiTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#0066FF',
  },
  aiTestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066FF',
  },
  aiResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  aiResetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  aiLogsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  aiLogsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  aiLogsList: {
    maxHeight: 200,
  },
  aiLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  aiLogTime: {
    fontSize: 11,
    color: '#999',
    minWidth: 40,
  },
  aiLogAction: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  aiLogConfidence: {
    fontSize: 11,
    color: '#0066FF',
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  
  // Стили для умной ИИ
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusGood: {
    backgroundColor: '#4CAF50',
  },
  statusWarning: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recommendationItem: {
    paddingVertical: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  systemStatusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  systemStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
    minWidth: 80,
  },
  statusBar: {
    height: 6,
    backgroundColor: '#0066FF',
    borderRadius: 3,
    flex: 1,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    minWidth: 40,
    textAlign: 'right',
  },

});