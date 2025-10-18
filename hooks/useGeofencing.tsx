/**
 * 📍 ГЕОФЕНСИНГ - УВЕДОМЛЕНИЯ ПРИ ПРИБЛИЖЕНИИ К ПОСТАМ
 * Отслеживание местоположения и уведомления о близких постах ДПС
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './app-store';
import { useNotifications } from './useNotifications';

export interface GeofenceZone {
  id: string;
  postId: string;
  latitude: number;
  longitude: number;
  radius: number; // в метрах
  title: string;
  message: string;
  entered: boolean;
  lastNotification?: number;
}

export interface GeofencingSettings {
  enabled: boolean;
  defaultRadius: number; // в метрах
  minRadius: number;
  maxRadius: number;
  notificationCooldown: number; // в миллисекундах
  backgroundTracking: boolean;
  highAccuracy: boolean;
}

const DEFAULT_SETTINGS: GeofencingSettings = {
  enabled: true,
  defaultRadius: 2000, // 2км
  minRadius: 500,      // 500м
  maxRadius: 10000,    // 10км
  notificationCooldown: 300000, // 5 минут
  backgroundTracking: true,
  highAccuracy: true,
};

export function useGeofencing() {
  const { currentUser, posts } = useApp();
  const { addNotification } = useNotifications();
  
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [settings, setSettings] = useState<GeofencingSettings>(DEFAULT_SETTINGS);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('geofencing_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек геofencing:', error);
    }
  }, []);

  // Сохранение настроек
  const saveSettings = useCallback(async (newSettings: Partial<GeofencingSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('geofencing_settings', JSON.stringify(updatedSettings));
      console.log('✅ Настройки геofencing сохранены');
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек геofencing:', error);
    }
  }, [settings]);

  // Загрузка зон
  const loadZones = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('geofence_zones');
      if (saved) {
        const parsedZones = JSON.parse(saved);
        setZones(parsedZones);
      }
    } catch (error) {
      console.error('Ошибка загрузки зон геofencing:', error);
    }
  }, []);

  // Сохранение зон
  const saveZones = useCallback(async (newZones: GeofenceZone[]) => {
    try {
      setZones(newZones);
      await AsyncStorage.setItem('geofence_zones', JSON.stringify(newZones));
    } catch (error) {
      console.error('Ошибка сохранения зон геofencing:', error);
    }
  }, []);

  // Расчет расстояния между двумя точками
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Расстояние в метрах
  }, []);

  // Создание зон из постов
  const createZonesFromPosts = useCallback(() => {
    const newZones: GeofenceZone[] = posts
      .filter(post => post.location && post.type === 'dps')
      .map(post => ({
        id: `zone_${post.id}`,
        postId: post.id,
        latitude: post.location!.latitude,
        longitude: post.location!.longitude,
        radius: settings.defaultRadius,
        title: '📍 ДПС рядом с вами',
        message: `Пост ДПС в ${Math.round(settings.defaultRadius / 1000)}км от вас`,
        entered: false,
      }));

    setZones(newZones);
    saveZones(newZones);
  }, [posts, settings.defaultRadius, saveZones]);

  // Проверка входа в зону
  const checkZoneEntry = useCallback(async (location: { latitude: number; longitude: number }) => {
    const now = Date.now();
    
    for (const zone of zones) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        zone.latitude,
        zone.longitude
      );

      const isInside = distance <= zone.radius;
      const wasOutside = !zone.entered;
      const cooldownPassed = !zone.lastNotification || 
        (now - zone.lastNotification) > settings.notificationCooldown;

      if (isInside && wasOutside && cooldownPassed) {
        // Входим в зону
        const updatedZones = zones.map(z => 
          z.id === zone.id 
            ? { ...z, entered: true, lastNotification: now }
            : z
        );
        setZones(updatedZones);
        saveZones(updatedZones);

        // Отправляем уведомление
        await addNotification({
          type: 'geofence',
          title: zone.title,
          message: `ДПС в ${Math.round(distance)}м от вас`,
          priority: 'high',
          postId: zone.postId,
          location: {
            latitude: zone.latitude,
            longitude: zone.longitude,
            radius: zone.radius,
          },
        });

        console.log(`📍 Вход в зону: ${zone.title} (${Math.round(distance)}м)`);
      } else if (!isInside && zone.entered) {
        // Выходим из зоны
        const updatedZones = zones.map(z => 
          z.id === zone.id 
            ? { ...z, entered: false }
            : z
        );
        setZones(updatedZones);
        saveZones(updatedZones);

        console.log(`📍 Выход из зоны: ${zone.title}`);
      }
    }
  }, [zones, settings.notificationCooldown, calculateDistance, addNotification, saveZones]);

  // Получение текущего местоположения
  const getCurrentLocation = useCallback(async () => {
    if (!settings.enabled) return;

    try {
      // Проверяем разрешения
      const { status } = await require('expo-location').requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к местоположению не предоставлено');
        return;
      }

      // Получаем местоположение
      const location = await require('expo-location').getCurrentPositionAsync({
        accuracy: settings.highAccuracy 
          ? require('expo-location').LocationAccuracy.High
          : require('expo-location').LocationAccuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
      };

      setCurrentLocation(newLocation);

      // Проверяем зоны
      await checkZoneEntry(newLocation);

      // Обновляем последнее местоположение
      lastLocationRef.current = {
        lat: newLocation.latitude,
        lng: newLocation.longitude,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Ошибка получения местоположения:', error);
    }
  }, [settings.enabled, settings.highAccuracy, checkZoneEntry]);

  // Начало отслеживания
  const startTracking = useCallback(async () => {
    // Отключаем геofencing в development режиме и на веб-платформе
    if (process.env.NODE_ENV === 'development' || Platform.OS === 'web') {
      console.log('🔧 Geofencing disabled in development mode or web platform');
      return;
    }

    if (!settings.enabled || isTracking) return;

    try {
      // Проверяем разрешения
      const { status } = await require('expo-location').requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к местоположению не предоставлено');
        return;
      }

      // Получаем начальное местоположение
      await getCurrentLocation();

      // Настраиваем отслеживание
      const watchId = await require('expo-location').watchPositionAsync(
        {
          accuracy: settings.highAccuracy 
            ? require('expo-location').LocationAccuracy.High
            : require('expo-location').LocationAccuracy.Balanced,
          timeInterval: 10000, // 10 секунд
          distanceInterval: 100, // 100 метров
        },
        async (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
          };

          setCurrentLocation(newLocation);

          // Проверяем зоны только если местоположение изменилось значительно
          const lastLoc = lastLocationRef.current;
          if (!lastLoc || 
              calculateDistance(
                newLocation.latitude, 
                newLocation.longitude, 
                lastLoc.lat, 
                lastLoc.lng
              ) > 50) { // Минимум 50 метров

            await checkZoneEntry(newLocation);
            
            lastLocationRef.current = {
              lat: newLocation.latitude,
              lng: newLocation.longitude,
              timestamp: Date.now(),
            };
          }
        }
      );

      watchIdRef.current = watchId;
      setIsTracking(true);

      console.log('📍 Геofencing отслеживание запущено');

    } catch (error) {
      console.error('Ошибка запуска отслеживания:', error);
    }
  }, [settings.enabled, settings.highAccuracy, isTracking, getCurrentLocation, checkZoneEntry, calculateDistance]);

  // Остановка отслеживания
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      try {
        // В web окружении stopLocationUpdatesAsync может не работать
        if (Platform.OS === 'web') {
          console.log('📍 Web platform: stopping location tracking by clearing watchId');
        } else {
          // Проверяем, что watchIdRef.current является строкой или числом
          const taskName = typeof watchIdRef.current === 'string' ? watchIdRef.current : String(watchIdRef.current);
          require('expo-location').stopLocationUpdatesAsync(taskName);
          console.log('📍 Location tracking stopped for task:', taskName);
        }
      } catch (error) {
        console.error('❌ Error stopping location tracking:', error);
      }
      watchIdRef.current = null;
    }
    setIsTracking(false);
    console.log('📍 Геofencing отслеживание остановлено');
  }, []);

  // Добавление зоны
  const addZone = useCallback(async (zone: Omit<GeofenceZone, 'id' | 'entered'>) => {
    const newZone: GeofenceZone = {
      ...zone,
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entered: false,
    };

    const updatedZones = [...zones, newZone];
    setZones(updatedZones);
    await saveZones(updatedZones);

    console.log('📍 Добавлена новая зона:', newZone.title);
  }, [zones, saveZones]);

  // Удаление зоны
  const removeZone = useCallback(async (zoneId: string) => {
    const updatedZones = zones.filter(z => z.id !== zoneId);
    setZones(updatedZones);
    await saveZones(updatedZones);

    console.log('📍 Удалена зона:', zoneId);
  }, [zones, saveZones]);

  // Обновление зоны
  const updateZone = useCallback(async (zoneId: string, updates: Partial<GeofenceZone>) => {
    const updatedZones = zones.map(z => 
      z.id === zoneId ? { ...z, ...updates } : z
    );
    setZones(updatedZones);
    await saveZones(updatedZones);

    console.log('📍 Обновлена зона:', zoneId);
  }, [zones, saveZones]);

  // Получение ближайших зон
  const getNearbyZones = useCallback((location?: { latitude: number; longitude: number }) => {
    if (!location && !currentLocation) return [];

    const loc = location || currentLocation!;
    
    return zones
      .map(zone => ({
        ...zone,
        distance: calculateDistance(
          loc.latitude,
          loc.longitude,
          zone.latitude,
          zone.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [zones, currentLocation, calculateDistance]);

  // Инициализация
  useEffect(() => {
    loadSettings();
    loadZones();
  }, [loadSettings, loadZones]);

  // Создание зон при изменении постов
  useEffect(() => {
    if (posts.length > 0) {
      createZonesFromPosts();
    }
  }, [posts, createZonesFromPosts]);

  // Управление отслеживанием
  useEffect(() => {
    if (settings.enabled && currentUser?.id) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, currentUser?.id]); // Убрали startTracking и stopTracking из зависимостей

  return {
    // Состояние
    zones,
    settings,
    isTracking,
    currentLocation,
    
    // Действия
    startTracking,
    stopTracking,
    addZone,
    removeZone,
    updateZone,
    saveSettings,
    
    // Утилиты
    getNearbyZones,
    calculateDistance,
  };
}
