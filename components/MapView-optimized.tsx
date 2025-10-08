import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { usePosts } from '@/lib/store-optimized';
import { DPSPost } from '@/types';

// Мемоизированный маркер
const Marker = memo(({ post, onPress }: { post: DPSPost; onPress: (post: DPSPost) => void }) => {
  const handlePress = useCallback(() => onPress(post), [post, onPress]);
  
  return (
    <View style={[styles.marker, { backgroundColor: getMarkerColor(post.type) }]} onTouchEnd={handlePress}>
      {/* Иконка маркера */}
    </View>
  );
});

// Мемоизированная карта
const MapView = memo(({ onPostPress }: { onPostPress: (post: DPSPost) => void }) => {
  const posts = usePosts();
  
  // Фильтруем только активные посты
  const activePosts = useMemo(() => {
    const now = Date.now();
    return posts.filter(post => post.expiresAt > now);
  }, [posts]);
  
  // Группируем посты по типу для оптимизации рендеринга
  const postsByType = useMemo(() => {
    return activePosts.reduce((acc, post) => {
      if (!acc[post.type]) acc[post.type] = [];
      acc[post.type].push(post);
      return acc;
    }, {} as Record<string, DPSPost[]>);
  }, [activePosts]);
  
  return (
    <View style={styles.container}>
      {/* Карта */}
      <View style={styles.map}>
        {Object.entries(postsByType).map(([type, typePosts]) => (
          <React.Fragment key={type}>
            {typePosts.map(post => (
              <Marker key={post.id} post={post} onPress={onPostPress} />
            ))}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});

// Утилита для цвета маркера
const getMarkerColor = (type: string) => {
  const colors = {
    dps: '#FF6B6B',
    patrol: '#4ECDC4',
    accident: '#FF8E53',
    camera: '#45B7D1',
    roadwork: '#96CEB4',
    animals: '#FFEAA7',
    other: '#DDA0DD',
  };
  return colors[type as keyof typeof colors] || colors.other;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    position: 'relative',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default MapView;
