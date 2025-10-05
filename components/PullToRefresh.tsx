import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  children: React.ReactNode;
  style?: any;
}

export default function PullToRefresh({ 
  onRefresh, 
  refreshing, 
  children, 
  style 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const translateY = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

  useEffect(() => {
    if (refreshing) {
      // Анимация загрузки
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      
      return () => rotateAnimation.stop();
    } else {
      // Сброс анимации
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [refreshing]);

  const handleTouchStart = (event: any) => {
    if (Platform.OS === 'web') return;
    
    const touch = event.nativeEvent.touches[0];
    if (touch && touch.pageY < 100) {
      setIsPulling(true);
    }
  };

  const handleTouchMove = (event: any) => {
    if (Platform.OS === 'web' || !isPulling) return;
    
    const touch = event.nativeEvent.touches[0];
    if (touch) {
      const distance = Math.max(0, touch.pageY - 50);
      const limitedDistance = Math.min(distance, MAX_PULL_DISTANCE);
      
      setPullDistance(limitedDistance);
      setCanRefresh(limitedDistance >= PULL_THRESHOLD);
      
      translateY.setValue(limitedDistance);
      
      // Анимация иконки
      const progress = limitedDistance / PULL_THRESHOLD;
      scaleAnim.setValue(1 + progress * 0.2);
      
      if (limitedDistance >= PULL_THRESHOLD) {
        rotateAnim.setValue(0.5);
      } else {
        rotateAnim.setValue(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (Platform.OS === 'web' || !isPulling) return;
    
    setIsPulling(false);
    
    if (canRefresh && !refreshing) {
      onRefresh();
    } else {
      // Возврат в исходное положение
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    setPullDistance(0);
    setCanRefresh(false);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const opacityInterpolate = translateY.interpolate({
    inputRange: [0, PULL_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      {/* Pull to refresh indicator */}
      <Animated.View
        style={[
          styles.refreshIndicator,
          {
            opacity: opacityInterpolate,
            transform: [
              {
                translateY: translateY.interpolate({
                  inputRange: [0, MAX_PULL_DISTANCE],
                  outputRange: [-60, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.refreshIcon,
            {
              transform: [
                { rotate: rotateInterpolate },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Ionicons
            name={canRefresh ? "refresh" : "arrow-down"}
            size={24}
            color={canRefresh ? "#3390EC" : "#8E8E93"}
          />
        </Animated.View>
        <Text style={[
          styles.refreshText,
          { color: canRefresh ? "#3390EC" : "#8E8E93" }
        ]}>
          {refreshing 
            ? "Обновление..." 
            : canRefresh 
              ? "Отпустите для обновления" 
              : "Потяните для обновления"
          }
        </Text>
      </Animated.View>

      {/* Content */}
      <View
        style={styles.content}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  refreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 1000,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshIcon: {
    marginBottom: 4,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
});
