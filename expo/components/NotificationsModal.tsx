/**
 * 🔔 МОДАЛЬНОЕ ОКНО УВЕДОМЛЕНИЙ
 * Красивое и функциональное окно для управления уведомлениями
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, Notification } from '../hooks/useNotifications';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getFilteredNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const getFilteredData = useCallback(() => {
    switch (filter) {
      case 'unread':
        return getFilteredNotifications({ read: false });
      case 'read':
        return getFilteredNotifications({ read: true });
      default:
        return getFilteredNotifications();
    }
  }, [filter, getFilteredNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Здесь можно добавить логику обновления
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  }, [markAsRead]);

  const handleDelete = useCallback(async (notification: Notification) => {
    Alert.alert(
      'Удалить уведомление',
      'Вы уверены, что хотите удалить это уведомление?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteNotification(notification.id),
        },
      ]
    );
  }, [deleteNotification]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Очистить все уведомления',
      'Вы уверены, что хотите удалить все уведомления?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: clearAllNotifications,
        },
      ]
    );
  }, [clearAllNotifications]);

  const handleSelectNotification = useCallback((notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedNotifications.size === 0) return;

    Alert.alert(
      'Удалить выбранные',
      `Удалить ${selectedNotifications.size} уведомлений?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedNotifications) {
              await deleteNotification(id);
            }
            setSelectedNotifications(new Set());
          },
        },
      ]
    );
  }, [selectedNotifications, deleteNotification]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_post':
        return 'add-circle';
      case 'post_approved':
        return 'checkmark-circle';
      case 'post_rejected':
        return 'close-circle';
      case 'user_mentioned':
        return 'at';
      case 'system':
        return 'settings';
      case 'geofence':
        return 'location';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return '#FF4757';
    if (priority === 'high') return '#FF9500';
    
    switch (type) {
      case 'new_post':
        return '#3390EC';
      case 'post_approved':
        return '#34C759';
      case 'post_rejected':
        return '#FF4757';
      case 'user_mentioned':
        return '#AF52DE';
      case 'system':
        return '#8E8E93';
      case 'geofence':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isSelected = selectedNotifications.has(item.id);
    const iconColor = getNotificationColor(item.type, item.priority);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
          isSelected && styles.selectedNotification,
        ]}
        onPress={() => handleMarkAsRead(item)}
        onLongPress={() => handleSelectNotification(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationIconContainer}>
              <Ionicons
                name={getNotificationIcon(item.type) as any}
                size={20}
                color={iconColor}
              />
            </View>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMessage}>{item.message}</Text>
              <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
            </View>
            <View style={styles.notificationActions}>
              {!item.read && <View style={styles.unreadDot} />}
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color="#FF4757" />
              </TouchableOpacity>
            </View>
          </View>
          
          {item.priority === 'urgent' && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>СРОЧНО</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredData = getFilteredData();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Заголовок */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Уведомления</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Фильтры */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              Все
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.activeFilter]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
              Непрочитанные
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'read' && styles.activeFilter]}
            onPress={() => setFilter('read')}
          >
            <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
              Прочитанные
            </Text>
          </TouchableOpacity>
        </View>

        {/* Действия */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done" size={16} color="#3390EC" />
            <Text style={styles.actionButtonText}>Прочитать все</Text>
          </TouchableOpacity>
          
          {selectedNotifications.size > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleBulkDelete}
            >
              <Ionicons name="trash" size={16} color="#FF4757" />
              <Text style={[styles.actionButtonText, { color: '#FF4757' }]}>
                Удалить ({selectedNotifications.size})
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            disabled={notifications.length === 0}
          >
            <Ionicons name="trash" size={16} color="#FF4757" />
            <Text style={[styles.actionButtonText, { color: '#FF4757' }]}>
              Очистить все
            </Text>
          </TouchableOpacity>
        </View>

        {/* Список уведомлений */}
        <FlatList
          data={filteredData}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          style={styles.notificationsList}
          contentContainerStyle={styles.notificationsListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={48} color="#8E8E93" />
              <Text style={styles.emptyTitle}>Нет уведомлений</Text>
              <Text style={styles.emptyMessage}>
                {filter === 'unread' 
                  ? 'Все уведомления прочитаны'
                  : filter === 'read'
                  ? 'Нет прочитанных уведомлений'
                  : 'Уведомления появятся здесь'
                }
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  unreadBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#F8F9FA',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeFilter: {
    backgroundColor: '#3390EC',
    borderColor: '#3390EC',
  },
  filterText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#3390EC',
    fontWeight: '500',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsListContent: {
    padding: 20,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3390EC',
    backgroundColor: '#F8F9FF',
  },
  selectedNotification: {
    backgroundColor: '#E3F2FD',
    borderColor: '#3390EC',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  notificationActions: {
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3390EC',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 4,
  },
  urgentBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
