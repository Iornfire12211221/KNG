// Утилиты для работы с локацией

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface LocationCache {
  lastLocation: LocationData | null;
  lastUpdate: number;
  cachedAddresses: Record<string, string>;
}

const LOCATION_CACHE_KEY = 'kng_location_cache';
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const ADDRESS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Получение кэшированной локации
 */
export async function getCachedLocation(): Promise<LocationData | null> {
  try {
    const cacheData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cacheData) return null;

    const cache: LocationCache = JSON.parse(cacheData);
    const now = Date.now();

    // Проверяем актуальность кэша
    if (now - cache.lastUpdate < LOCATION_CACHE_DURATION && cache.lastLocation) {
      console.log('📍 Using cached location');
      return cache.lastLocation;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached location:', error);
    return null;
  }
}

/**
 * Сохранение локации в кэш
 */
export async function cacheLocation(location: LocationData): Promise<void> {
  try {
    const cacheData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    const cache: LocationCache = cacheData ? JSON.parse(cacheData) : {
      lastLocation: null,
      lastUpdate: 0,
      cachedAddresses: {}
    };

    cache.lastLocation = location;
    cache.lastUpdate = Date.now();

    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
    console.log('📍 Location cached successfully');
  } catch (error) {
    console.error('Error caching location:', error);
  }
}

/**
 * Получение адреса с кэшированием
 */
export async function getCachedAddress(
  latitude: number, 
  longitude: number
): Promise<string | null> {
  try {
    const cacheData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cacheData) return null;

    const cache: LocationCache = JSON.parse(cacheData);
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    if (cache.cachedAddresses[key]) {
      console.log('📍 Using cached address');
      return cache.cachedAddresses[key];
    }

    return null;
  } catch (error) {
    console.error('Error getting cached address:', error);
    return null;
  }
}

/**
 * Кэширование адреса
 */
export async function cacheAddress(
  latitude: number,
  longitude: number,
  address: string
): Promise<void> {
  try {
    const cacheData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    const cache: LocationCache = cacheData ? JSON.parse(cacheData) : {
      lastLocation: null,
      lastUpdate: 0,
      cachedAddresses: {}
    };

    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    cache.cachedAddresses[key] = address;

    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
    console.log('📍 Address cached successfully');
  } catch (error) {
    console.error('Error caching address:', error);
  }
}

/**
 * Получение локации с retry механизмом
 */
export async function getLocationWithRetry(
  maxRetries: number = 3,
  timeout: number = 10000
): Promise<LocationData | null> {
  // Сначала проверяем кэш
  const cachedLocation = await getCachedLocation();
  if (cachedLocation) {
    return cachedLocation;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📍 Location attempt ${attempt}/${maxRetries}`);
      
      // Запрашиваем разрешения
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Получаем текущую позицию
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 30000, // 30 секунд
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), timeout)
        )
      ]);

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };

      // Кэшируем локацию
      await cacheLocation(locationData);

      console.log('📍 Location obtained successfully');
      return locationData;

    } catch (error) {
      console.error(`📍 Location attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error('📍 All location attempts failed');
        return null;
      }

      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return null;
}

/**
 * Получение адреса по координатам
 */
export async function getAddressFromCoords(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // Проверяем кэш
    const cachedAddress = await getCachedAddress(latitude, longitude);
    if (cachedAddress) {
      return cachedAddress;
    }

    // Получаем адрес
    const result = await Location.reverseGeocodeAsync({
      latitude,
      longitude
    });

    if (result && result.length > 0) {
      const location = result[0];
      const parts = [];
      
      if (location.street) parts.push(location.street);
      if (location.streetNumber) parts.push(location.streetNumber);
      if (location.district) parts.push(location.district);
      if (location.city) parts.push(location.city);
      
      const address = parts.join(', ') || 'Неизвестный адрес';
      
      // Кэшируем адрес
      await cacheAddress(latitude, longitude, address);
      
      return address;
    }

    return 'Неизвестный адрес';
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Неизвестный адрес';
  }
}

/**
 * Проверка близости к Кингисеппу
 */
export function isNearKingisepp(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 50
): boolean {
  const KINGISEPP_CENTER = {
    latitude: 59.3753,
    longitude: 28.6114
  };

  const distance = calculateDistance(
    latitude,
    longitude,
    KINGISEPP_CENTER.latitude,
    KINGISEPP_CENTER.longitude
  );

  return distance <= maxDistanceKm;
}

/**
 * Вычисление расстояния между двумя точками
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Форматирование расстояния
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} м`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} км`;
  } else {
    return `${Math.round(distanceKm)} км`;
  }
}

/**
 * Очистка устаревшего кэша
 */
export async function cleanExpiredCache(): Promise<void> {
  try {
    const cacheData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cacheData) return;

    const cache: LocationCache = JSON.parse(cacheData);
    const now = Date.now();

    // Очищаем устаревшие адреса
    const validAddresses: Record<string, string> = {};
    Object.entries(cache.cachedAddresses).forEach(([key, address]) => {
      // Адреса кэшируются на 24 часа
      if (now - cache.lastUpdate < ADDRESS_CACHE_DURATION) {
        validAddresses[key] = address;
      }
    });

    cache.cachedAddresses = validAddresses;

    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
    console.log('📍 Expired cache cleaned');
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

/**
 * Получение локации с fallback на IP
 */
export async function getLocationWithFallback(): Promise<LocationData | null> {
  // Пробуем GPS
  const gpsLocation = await getLocationWithRetry();
  if (gpsLocation) {
    return gpsLocation;
  }

  // Fallback на IP геолокацию
  try {
    console.log('📍 Trying IP geolocation fallback');
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      const locationData: LocationData = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 10000, // Низкая точность для IP
        timestamp: Date.now(),
        address: `${data.city}, ${data.region}, ${data.country_name}`
      };

      await cacheLocation(locationData);
      return locationData;
    }
  } catch (error) {
    console.error('IP geolocation failed:', error);
  }

  return null;
}
