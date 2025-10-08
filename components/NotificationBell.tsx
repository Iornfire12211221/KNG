/**
 * 🔔 КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ
 * Красивая иконка с анимацией и счетчиком непрочитанных
 */

import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationsModal } from './NotificationsModal';

interface NotificationBellProps {
  size?: number;
  color?: string;
  showBadge?: boolean;
  animated?: boolean;
}

export function NotificationBell({ 
  size = 24, 
  color = '#000000', 
  showBadge = true,
  animated = true 
}: NotificationBellProps) {
  const { unreadCount, isConnected } = useNotifications();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Анимации
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;

  // Анимация при нажатии
  const handlePress = () => {
    if (animated) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setModalVisible(true);
  };

  // Анимация появления badge
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.spring(badgeScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 4,
      }).start();
    } else {
      Animated.timing(badgeScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [unreadCount, badgeScaleAnim]);

  // Анимация пульсации при новых уведомлениях
  useEffect(() => {
    if (unreadCount > 0 && animated) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [unreadCount, animated, pulseAnim]);

  // Анимация вращения при подключении/отключении
  useEffect(() => {
    if (animated) {
      Animated.timing(rotateAnim, {
        toValue: isConnected ? 0 : 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, animated, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Animated.View 
          style={[
            styles.iconContainer,
            {
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim },
                { rotate: rotateInterpolate },
              ],
            },
          ]}
        >
          <Ionicons 
            name={isConnected ? "notifications" : "notifications-off"} 
            size={size} 
            color={isConnected ? color : '#8E8E93'} 
          />
          
          {showBadge && unreadCount > 0 && (
            <Animated.View 
              style={[
                styles.badge,
                {
                  transform: [{ scale: badgeScaleAnim }],
                },
              ]}
            >
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount.toString()}
              </Text>
            </Animated.View>
          )}
          
          {!isConnected && (
            <View style={styles.offlineIndicator} />
          )}
        </Animated.View>
      </TouchableOpacity>

      <NotificationsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF4757',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
