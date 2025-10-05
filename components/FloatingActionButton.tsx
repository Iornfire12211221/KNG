import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../hooks/app-store';

const { width, height } = Dimensions.get('window');

interface FloatingActionButtonProps {
  onPress?: () => void;
  style?: any;
}

export default function FloatingActionButton({ onPress, style }: FloatingActionButtonProps) {
  const router = useRouter();
  const { currentUser, posts } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  // Показываем пульсацию при новых постах
  useEffect(() => {
    if (posts.length > 0) {
      setShowPulse(true);
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
      
      // Останавливаем пульсацию через 5 секунд
      setTimeout(() => {
        pulseAnimation.stop();
        setShowPulse(false);
        pulseAnim.setValue(1);
      }, 5000);
    }
  }, [posts.length]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Анимация нажатия
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
      
      // Переход к добавлению поста
      router.push('/add-post');
    }
  };

  const handleLongPress = () => {
    setIsExpanded(!isExpanded);
    
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const quickActions = [
    {
      icon: 'camera' as const,
      label: 'Фото',
      onPress: () => {
        setIsExpanded(false);
        expandAnim.setValue(0);
        rotateAnim.setValue(0);
        router.push('/add-post?type=photo');
      },
    },
    {
      icon: 'location' as const,
      label: 'Локация',
      onPress: () => {
        setIsExpanded(false);
        expandAnim.setValue(0);
        rotateAnim.setValue(0);
        router.push('/add-post?type=location');
      },
    },
    {
      icon: 'chatbubble' as const,
      label: 'Сообщение',
      onPress: () => {
        setIsExpanded(false);
        expandAnim.setValue(0);
        rotateAnim.setValue(0);
        router.push('/add-post?type=message');
      },
    },
  ];

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const expandInterpolate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Quick Actions */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.quickActionsContainer,
            {
              opacity: expandInterpolate,
              transform: [
                {
                  scale: expandInterpolate,
                },
              ],
            },
          ]}
        >
          {quickActions.map((action, index) => (
            <Animated.View
              key={action.icon}
              style={[
                styles.quickAction,
                {
                  transform: [
                    {
                      translateY: expandInterpolate.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -(index + 1) * 60],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Main FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: rotateInterpolate },
            ],
          },
        ]}
      >
        {/* Pulse effect */}
        {showPulse && (
          <Animated.View
            style={[
              styles.pulseEffect,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}
        
        <TouchableOpacity
          style={styles.fab}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 30 : 100,
    right: 20,
    zIndex: 1000,
  },
  fabContainer: {
    position: 'relative',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3390EC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pulseEffect: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(51, 144, 236, 0.3)',
    top: 0,
    left: 0,
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    alignItems: 'center',
  },
  quickAction: {
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
