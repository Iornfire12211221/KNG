import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useApp } from '@/hooks/app-store';
import { 
  Edit2, 
  X, 
  Send, 
  MapPin,
  MessageSquare,
  Calendar,
  Shield,
  LogOut,
  User,
  Check
} from 'lucide-react-native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { currentUser, updateUser, posts, messages, logoutUser, makeAdmin } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editTelegram, setEditTelegram] = useState(currentUser?.telegramUsername || '');
  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            router.replace('/auth');
          }
        }
      ]
    );
  };

  const openAdminPanel = () => {
    router.push('/admin');
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Ошибка', 'Имя не может быть пустым');
      return;
    }

    await updateUser({
      name: editName.trim(),
      telegramUsername: editTelegram.trim(),
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(currentUser?.name || '');
    setEditTelegram(currentUser?.telegramUsername || '');
    setIsEditing(false);
  };

  const openTelegramChannel = () => {
    const telegramUrl = 'https://t.me/nknewc';
    Linking.openURL(telegramUrl).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    });
  };

  const userPosts = posts.filter(post => post.userId === currentUser?.id);
  const userMessages = messages.filter(msg => msg.userId === currentUser?.id);
  
  // Фото из Telegram или аватар по умолчанию
  const avatarSource = currentUser?.photoUrl 
    ? { uri: currentUser.photoUrl }
    : currentUser?.avatar 
    ? { uri: currentUser.avatar }
    : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Профиль - минималистичный дизайн */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={40} color="#FFFFFF" strokeWidth={1.5} />
            </View>
          )}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Имя"
              placeholderTextColor="#999"
              maxLength={30}
            />
            <TextInput
              style={styles.input}
              value={editTelegram}
              onChangeText={setEditTelegram}
              placeholder="@username"
              placeholderTextColor="#999"
              maxLength={30}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <X size={20} color="#666" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Check size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.info}>
            <Text style={styles.name}>{currentUser?.name}</Text>
            {currentUser?.telegramUsername && (
              <Text style={styles.username}>@{currentUser.telegramUsername}</Text>
            )}
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Edit2 size={14} color="#666" strokeWidth={2} />
              <Text style={styles.editText}>Редактировать</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Статистика */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <View style={styles.statIconContainer}>
            <MapPin size={18} color="#007AFF" strokeWidth={2} />
          </View>
          <Text style={styles.statValue}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>События</Text>
        </View>
        <View style={styles.stat}>
          <View style={styles.statIconContainer}>
            <MessageSquare size={18} color="#34C759" strokeWidth={2} />
          </View>
          <Text style={styles.statValue}>{userMessages.length}</Text>
          <Text style={styles.statLabel}>Сообщения</Text>
        </View>
        <View style={styles.stat}>
          <View style={styles.statIconContainer}>
            <Calendar size={18} color="#FF9500" strokeWidth={2} />
          </View>
          <Text style={styles.statValue}>
            {Math.floor((Date.now() - parseInt(currentUser?.id || '0')) / (1000 * 60 * 60 * 24))}
          </Text>
          <Text style={styles.statLabel}>Дней</Text>
        </View>
      </View>

      {/* Действия */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={openTelegramChannel}>
          <Send size={20} color="#0088CC" strokeWidth={2} />
          <Text style={styles.actionText}>Telegram канал</Text>
        </TouchableOpacity>

        {(currentUser?.isAdmin || currentUser?.isModerator) ? (
          <TouchableOpacity style={styles.action} onPress={openAdminPanel}>
            <Shield size={20} color="#FF9500" strokeWidth={2} />
            <Text style={styles.actionText}>Админ панель</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.action}
            onPress={() => {
              Alert.alert(
                'Получить права?',
                'Временная функция для тестирования',
                [
                  { text: 'Нет', style: 'cancel' },
                  { 
                    text: 'Да', 
                    onPress: () => {
                      makeAdmin(currentUser?.id || '');
                    }
                  }
                ]
              );
            }}
          >
            <Shield size={20} color="#999" strokeWidth={2} />
            <Text style={styles.actionText}>Стать админом</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Выход */}
      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <LogOut size={18} color="#FF3B30" strokeWidth={2} />
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    backgroundColor: '#FFF',
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
    marginBottom: 1,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
  },
  editText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  editForm: {
    width: '85%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#000',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  actions: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 1,
    marginBottom: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  actionText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#BBB',
    marginTop: 20,
    marginBottom: 32,
    fontWeight: '500',
  },
});

