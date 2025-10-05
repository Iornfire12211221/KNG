import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanGestureHandler,
  State,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DPSPost } from '@/types';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

interface SwipeablePostCardProps {
  post: DPSPost;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  children?: React.ReactNode;
}

export default function SwipeablePostCard({
  post,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  onLongPress,
  style,
  children,
}: SwipeablePostCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setIsSwipeActive(true);
    } else if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Определяем направление свайпа
      if (translationX > SWIPE_THRESHOLD || velocityX > 500) {
        // Свайп вправо
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onSwipeRight?.();
          translateX.setValue(0);
          scaleAnim.setValue(1);
          setIsSwipeActive(false);
        });
      } else if (translationX < -SWIPE_THRESHOLD || velocityX < -500) {
        // Свайп влево
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -width,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onSwipeLeft?.();
          translateX.setValue(0);
          scaleAnim.setValue(1);
          setIsSwipeActive(false);
        });
      } else {
        // Возврат в исходное положение
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start(() => {
          setIsSwipeActive(false);
        });
      }
    }
  };

  const getSwipeActionOpacity = (direction: 'left' | 'right') => {
    return translateX.interpolate({
      inputRange: direction === 'left' ? [-width, -SWIPE_THRESHOLD, 0] : [0, SWIPE_THRESHOLD, width],
      outputRange: direction === 'left' ? [1, 0.5, 0] : [0, 0.5, 1],
      extrapolate: 'clamp',
    });
  };

  const getSwipeActionScale = (direction: 'left' | 'right') => {
    return translateX.interpolate({
      inputRange: direction === 'left' ? [-width, -SWIPE_THRESHOLD, 0] : [0, SWIPE_THRESHOLD, width],
      outputRange: direction === 'left' ? [1.2, 1, 0.8] : [0.8, 1, 1.2],
      extrapolate: 'clamp',
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Swipe Actions Background */}
      <View style={styles.swipeActionsContainer}>
        {/* Left Action (Like/Approve) */}
        <Animated.View
          style={[
            styles.swipeAction,
            styles.leftAction,
            {
              opacity: getSwipeActionOpacity('left'),
              transform: [{ scale: getSwipeActionScale('left') }],
            },
          ]}
        >
          <Ionicons name="heart" size={32} color="#FFFFFF" />
          <Text style={styles.actionText}>Лайк</Text>
        </Animated.View>

        {/* Right Action (Share/More) */}
        <Animated.View
          style={[
            styles.swipeAction,
            styles.rightAction,
            {
              opacity: getSwipeActionOpacity('right'),
              transform: [{ scale: getSwipeActionScale('right') }],
            },
          ]}
        >
          <Ionicons name="share" size={32} color="#FFFFFF" />
          <Text style={styles.actionText}>Поделиться</Text>
        </Animated.View>
      </View>

      {/* Main Card */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-5, 5]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateX },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={styles.cardContent}
          >
            {children}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeActionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeAction: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  leftAction: {
    backgroundColor: '#FF3B30',
  },
  rightAction: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
});
