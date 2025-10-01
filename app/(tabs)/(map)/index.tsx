import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
  FlatList,
  PanResponder,
  Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useApp } from '@/hooks/app-store';
import { useTelegram } from '@/hooks/telegram';
import { router } from 'expo-router';
import { Plus, Navigation, AlertCircle, Clock, Trash2, Heart, Shield, Car, AlertTriangle, Camera, Construction, CheckCircle2, X, Settings, Rabbit, TrendingUp, Filter, MapPin as MapPinIcon, Zap, Target, Users, CarFront, Wrench, MoreHorizontal, CheckCheck } from 'lucide-react-native';
import { getLandmarkForAddress, getRandomLandmark } from '@/constants/kingisepp-landmarks';

import * as Location from 'expo-location';
const MapViewComponent = Platform.select({
  web: () => require('@/components/MapView.web').default,
  default: () => require('@/components/MapView').default,
})();
const MarkerComponent = Platform.select({
  web: () => require('@/components/MapView.web').Marker,
  default: () => require('@/components/MapView').Marker,
})();
import { DPSPost, POST_LIFETIMES } from '@/types';
import LoadingOverlay from '@/components/LoadingOverlay';
import GlassView from '@/components/GlassView';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Кингисепп координаты
const KINGISEPP_CENTER = {
  latitude: 59.3733,
  longitude: 28.6134,
};

const getPostTypeIcon = (type: string) => {
  switch (type) {
    case 'dps': return DPSIcon;
    case 'patrol': return PatrolIcon;
    case 'accident': return AccidentIcon;
    case 'camera': return CameraIcon;
    case 'roadwork': return RoadworkIcon;
    case 'animals': return AnimalsIcon;
    case 'other': return OtherIcon;
    default: return OtherIcon;
  }
};

const getPostTypeColor = (type: string) => {
  switch (type) {
    case 'dps': return '#FF3B30';
    case 'patrol': return '#007AFF';
    case 'accident': return '#DC2626';
    case 'camera': return '#0066FF';
    case 'roadwork': return '#F59E0B';
    case 'animals': return '#059669';
    case 'other': return '#6B7280';
    default: return '#8E8E93';
  }
};

const getPostTypeLabel = (type: string) => {
  switch (type) {
    case 'dps': return 'ДПС';
    case 'patrol': return 'Патруль';
    case 'accident': return 'ДТП';
    case 'camera': return 'Камера';
    case 'roadwork': return 'Ремонт';
    case 'animals': return 'Животные';
    case 'other': return 'Другое';
    default: return 'Событие';
  }
};

const getPostTypeDescription = (type: string) => {
  switch (type) {
    case 'dps': return 'Пост ДПС';
    case 'patrol': return 'Патруль ГИБДД';
    case 'accident': return 'Дорожное происшествие';
    case 'camera': return 'Камера контроля';
    case 'roadwork': return 'Дорожные работы';
    case 'animals': return 'Животные на дороге';
    case 'other': return 'Прочее событие';
    default: return 'Дорожное событие';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return '#FF3B30';
    case 'medium': return '#FF9500';
    case 'low': return '#34C759';
    default: return '#8E8E93';
  }
};

// Создаем минималистичные SVG иконки
const DPSIcon = ({ size, color }: { size: number; color: string }) => (
  <Shield size={size} color={color} />
);

const PatrolIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Основной корпус автомобиля */}
    <Path 
      d="M3 12h2l1.5-4h11l1.5 4h2v6h-2v-2H5v2H3v-6z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
    {/* Колеса */}
    <Circle cx="6" cy="18" r="2" fill={color} />
    <Circle cx="18" cy="18" r="2" fill={color} />
  </Svg>
);

const AccidentIcon = ({ size, color }: { size: number; color: string }) => (
  <AlertTriangle size={size} color={color} />
);

const CameraIcon = ({ size, color }: { size: number; color: string }) => (
  <Camera size={size} color={color} />
);

const RoadworkIcon = ({ size, color }: { size: number; color: string }) => (
  <Construction size={size} color={color} />
);

const AnimalsIcon = ({ size, color }: { size: number; color: string }) => (
  <Rabbit size={size} color={color} />
);

const OtherIcon = ({ size, color }: { size: number; color: string }) => (
  <MoreHorizontal size={size} color={color} />
);

const POST_TYPES = [
  { id: 'dps' as const, label: 'Пост ДПС', icon: DPSIcon, color: '#FF3B30' },
  { id: 'patrol' as const, label: 'Патруль', icon: PatrolIcon, color: '#007AFF' },
  { id: 'accident' as const, label: 'ДТП', icon: AccidentIcon, color: '#FF9500' },
  { id: 'camera' as const, label: 'Камера', icon: CameraIcon, color: '#34C759' },
  { id: 'roadwork' as const, label: 'Ремонт дороги', icon: RoadworkIcon, color: '#FF9500' },
  { id: 'animals' as const, label: 'Замечены животные', icon: AnimalsIcon, color: '#8E44AD' },
  { id: 'other' as const, label: 'Остальное', icon: OtherIcon, color: '#6C757D' },
];

const SEVERITY_LEVELS = [
  { id: 'low' as const, label: 'Низкая', color: '#34C759' },
  { id: 'medium' as const, label: 'Средняя', color: '#FF9500' },
  { id: 'high' as const, label: 'Высокая', color: '#FF3B30' },
];

export default function MapScreen() {
  const { posts, removePost, currentUser, clearExpiredPosts, likePost, verifyPost, addPost } = useApp();
  const { requestLocation, isTelegramWebApp, hapticFeedback } = useTelegram();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLocation, setQuickAddLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [quickAddType, setQuickAddType] = useState<DPSPost['type']>('dps');
  const [quickAddSeverity, setQuickAddSeverity] = useState<DPSPost['severity']>('medium');
  const [quickAddDescription, setQuickAddDescription] = useState('');
  const [quickAddPhotos, setQuickAddPhotos] = useState<string[]>([]);
  const [isAnalyzingSeverity, setIsAnalyzingSeverity] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [showActivePosts, setShowActivePosts] = useState<boolean>(true);
  const [showEventDetails, setShowEventDetails] = useState<boolean>(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const longPressScale = useRef(new Animated.Value(1)).current;
  const [showWeeklySummary, setShowWeeklySummary] = useState<boolean>(false);
  const [userHasMovedMap, setUserHasMovedMap] = useState<boolean>(false);
  const panY = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Animation values for map press and plus button
  const mapPressScale = useRef(new Animated.Value(1)).current;
  const mapPressOpacity = useRef(new Animated.Value(0)).current;
  const plusButtonScale = useRef(new Animated.Value(1)).current;
  const plusButtonRotation = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  
  // Animation values for modal
  const modalTranslateY = useRef(new Animated.Value(height)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const savePulseValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const saveOpacityValue = useRef(new Animated.Value(1)).current;


  const mapRef = useRef<any>(null);
  const mapInitialized = useRef(false);

  // Убираем PanResponder, чтобы активные посты всегда были видны

  useEffect(() => {
    // Clear old posts every minute
    const interval = setInterval(() => {
      clearExpiredPosts();
    }, 60000);

    return () => clearInterval(interval);
  }, [clearExpiredPosts]);

  useEffect(() => {
      console.log('🔵🔵🔵 useEffect calling requestLocationPermission 🔵🔵🔵');
      requestLocationPermission();
  }, []);

  const lastMyPostTs = React.useMemo(() => {
    try {
      if (!currentUser) return 0;
      const myPosts = posts.filter(p => p.userId === currentUser.id);
      if (myPosts.length === 0) return 0;
      const ts = Math.max(...myPosts.map(p => p.timestamp ?? 0));
      return Number.isFinite(ts) ? ts : 0;
    } catch (e) {
      console.log('calc last post ts error', e);
      return 0;
    }
  }, [posts, currentUser]);

  useEffect(() => {
    if (!lastMyPostTs) return;
    const diffMs = Date.now() - lastMyPostTs;
    const remain = Math.max(0, Math.ceil((60 * 1000 - diffMs) / 1000));
    setCooldownSeconds(remain);
  }, [lastMyPostTs]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  // Убираем автоматический ИИ анализ - теперь только при сохранении

  // Pulsing animation for AI indicator
  useEffect(() => {
    if (isAnalyzingSeverity) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseValue, {
              toValue: 1.3,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
              toValue: 0.6,
              duration: 800,
              useNativeDriver: true,
            })
          ]),
          Animated.parallel([
            Animated.timing(pulseValue, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            })
          ])
        ])
      );
      pulseAnimation.start();
      return () => {
        pulseAnimation.stop();
        pulseValue.setValue(1);
        opacityValue.setValue(1);
      };
    }
  }, [isAnalyzingSeverity, pulseValue, opacityValue]);

  // Pulsing animation for save indicator
  useEffect(() => {
    if (isSavingPost) {
      const savePulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(savePulseValue, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(saveOpacityValue, {
              toValue: 0.7,
              duration: 600,
              useNativeDriver: true,
            })
          ]),
          Animated.parallel([
            Animated.timing(savePulseValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(saveOpacityValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            })
          ])
        ])
      );
      savePulseAnimation.start();
      return () => {
        savePulseAnimation.stop();
        savePulseValue.setValue(1);
        saveOpacityValue.setValue(1);
      };
    }
  }, [isSavingPost, savePulseValue, saveOpacityValue]);

  // Мемоизируем начальный регион карты - СТАТИЧНЫЙ, НЕ ЗАВИСИТ ОТ userLocation
  const initialRegion = useMemo(() => {
    console.log('🚫🚫🚫 initialRegion computed (STATIC) 🚫🚫🚫');
    // Всегда используем центр Кингисеппа, не зависим от userLocation
    return {
      latitude: KINGISEPP_CENTER.latitude,
      longitude: KINGISEPP_CENTER.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, []); // Пустой массив зависимостей - вычисляется только один раз

  // Центрируем карту на пользователе ТОЛЬКО один раз при загрузке
  useEffect(() => {
    console.log('🚫🚫🚫 useEffect triggered (AUTO-CENTER ONCE) 🚫🚫🚫:', {
      userLocation: !!userLocation,
      mapRef: !!mapRef.current,
      mapInitialized: mapInitialized.current,
      userHasMovedMap: userHasMovedMap
    });
    
    // Центрируем карту на пользователе только один раз при первой загрузке
    if (userLocation && mapRef.current && !mapInitialized.current) {
      console.log('🚫🚫🚫 Centering map on user location ONCE 🚫🚫🚫');
      setTimeout(() => {
        if (mapRef.current && !userHasMovedMap) {
          mapRef.current.animateToRegion({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }, 1500);
        }
      }, 1000);
      mapInitialized.current = true;
    }
  }, [userLocation, userHasMovedMap]);

  const requestLocationPermission = async () => {
    console.log('🔵🔵🔵 requestLocationPermission called 🔵🔵🔵');
    try {
      setIsLoadingLocation(true);
      setLocationError(null);
      console.log('Requesting location permission...');

      if (Platform.OS === 'web' && isTelegramWebApp) {
        // Для Telegram WebApp используем специальный API
        const result = await requestLocation();
        if (result.granted && result.location) {
          const webLoc: Location.LocationObject = {
            coords: {
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              altitude: null as unknown as number,
              accuracy: 10,
              altitudeAccuracy: null as unknown as number,
              heading: 0,
              speed: 0,
            },
            timestamp: Date.now(),
          } as unknown as Location.LocationObject;
          console.log('🔵🔵🔵 Setting userLocation (Telegram):', webLoc.coords);
          setUserLocation(webLoc);
          // Не центрируем карту автоматически - только при нажатии кнопки
        } else {
          setLocationError('Доступ к геолокации запрещен');
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: KINGISEPP_CENTER.latitude,
                longitude: KINGISEPP_CENTER.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 1000);
            }
          }, 300);
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);

      if (status !== 'granted') {
        console.log('Location permission denied');
        setLocationError('Доступ к геолокации запрещен');
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: KINGISEPP_CENTER.latitude,
              longitude: KINGISEPP_CENTER.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 1000);
          }
        }, 300);
        return;
      }

      // 1) Try last known location for instant result
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          console.log('Using last known location instantly:', last.coords);
          console.log('🔵🔵🔵 Setting userLocation (last known):', last.coords);
          setUserLocation(last);
          // Не центрируем карту автоматически - только при нажатии кнопки
        }
      } catch (e) {
        console.log('No last known location available', e);
      }

      // 2) Quickly fetch a fresh but fast reading
      let quickGot = false;
      try {
        const quick = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        quickGot = true;
        console.log('Quick location obtained:', quick.coords);
        console.log('🔵🔵🔵 Setting userLocation (quick):', quick.coords);
        setUserLocation(quick);
        // Не центрируем карту автоматически - только при нажатии кнопки
      } catch (e) {
        console.log('Quick location timeout, will refine in background', e);
      }

      // 3) Start high accuracy watch to refine
      startLocationTracking();

      // 4) If quick didn't return, do one more background try with higher accuracy (short timeout)
      if (!quickGot) {
        try {
          const precise = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          console.log('Precise location obtained (background):', precise.coords);
          console.log('🔵🔵🔵 Setting userLocation (precise):', precise.coords);
          setUserLocation(precise);
          // Не центрируем карту автоматически - только при нажатии кнопки
        } catch (e) {
          console.log('Precise background fetch failed', e);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: KINGISEPP_CENTER.latitude,
            longitude: KINGISEPP_CENTER.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      }, 300);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('Starting location tracking...');
      
      // Для Telegram WebApp используем периодический запрос через API
      if (Platform.OS === 'web' && isTelegramWebApp) {
        const intervalId = setInterval(async () => {
          try {
            const result = await requestLocation();
            if (result.granted && result.location) {
              const location: Location.LocationObject = {
                coords: {
                  latitude: result.location.latitude,
                  longitude: result.location.longitude,
                  altitude: null as unknown as number,
                  accuracy: 10,
                  altitudeAccuracy: null as unknown as number,
                  heading: 0,
                  speed: 0,
                },
                timestamp: Date.now(),
              } as unknown as Location.LocationObject;
              console.log('Telegram location updated:', location.coords);
              setUserLocation(location);
            }
          } catch (error) {
            console.log('Telegram location tracking error:', error);
          }
        }, 1000);
        
        return () => {
          clearInterval(intervalId);
        };
      } else {
        // Для мобильных устройств используем стандартный API
        const locationSubscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          mayShowUserSettingsDialog: false,
        },
        (location) => {
          console.log('Location updated:', location.coords);
          setUserLocation(location);
        }
      );
      return () => {
        locationSubscription.remove();
      };
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };


  const getDistanceFromUser = (postLat: number, postLng: number) => {
    if (!userLocation) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (postLat - userLocation.coords.latitude) * Math.PI / 180;
    const dLon = (postLng - userLocation.coords.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.coords.latitude * Math.PI / 180) * Math.cos(postLat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Мемоизируем отфильтрованные посты
  const filteredPosts = useMemo(() => {
    return posts.filter(post => !post.needsModeration || post.userId === currentUser?.id);
  }, [posts, currentUser?.id]);

  const getWeeklyEvents = () => {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const weeklyPosts = posts.filter(post => post.timestamp >= weekAgo);
    
    const summary = {
      total: weeklyPosts.length,
      dps: weeklyPosts.filter(p => p.type === 'dps').length,
      accidents: weeklyPosts.filter(p => p.type === 'accident').length,
      cameras: weeklyPosts.filter(p => p.type === 'camera').length,
      roadwork: weeklyPosts.filter(p => p.type === 'roadwork').length,
      animals: weeklyPosts.filter(p => p.type === 'animals').length,
      patrol: weeklyPosts.filter(p => p.type === 'patrol').length,
      other: weeklyPosts.filter(p => p.type === 'other').length,
      highSeverity: weeklyPosts.filter(p => p.severity === 'high').length,
      mostActiveDay: getMostActiveDay(weeklyPosts),
      averagePerDay: Math.round(weeklyPosts.length / 7 * 10) / 10
    };
    
    return { posts: weeklyPosts, summary };
  };

  const getMostActiveDay = (weeklyPosts: DPSPost[]) => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayCount: { [key: string]: number } = {};
    
    weeklyPosts.forEach(post => {
      const day = days[new Date(post.timestamp).getDay()];
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    
    let maxDay = 'Понедельник';
    let maxCount = 0;
    
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > maxCount) {
        maxDay = day;
        maxCount = count;
      }
    });
    
    return { day: maxDay, count: maxCount };
  };



  const getTrafficStatus = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
      return { status: 'Пробки', color: '#FF3B30', level: 'high' };
    } else if (hour >= 12 && hour <= 14) {
      return { status: 'Средний трафик', color: '#FF9500', level: 'medium' };
    }
    return { status: 'Свободно', color: '#34C759', level: 'low' };
  };

  const handleDeletePost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post?.userId === currentUser?.id) {
      Alert.alert(
        'Удалить пост?',
        'Вы уверены, что хотите удалить этот пост?',
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Удалить', 
            style: 'destructive',
            onPress: () => {
              removePost(postId);
              setSelectedPost(null);
            }
          },
        ]
      );
    }
  };

  const centerOnUser = useCallback(() => {
    console.log('🔵🔵🔵 centerOnUser called 🔵🔵🔵:', {
      hasUserLocation: !!userLocation,
      userLocation: userLocation?.coords,
      hasMapRef: !!mapRef.current,
      stack: new Error().stack
    });
    if (userLocation && mapRef.current) {
      console.log('🔵🔵🔵 centerOnUser: calling animateToRegion 🔵🔵🔵');
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else {
      console.log('🔵🔵🔵 centerOnUser: missing userLocation or mapRef 🔵🔵🔵');
      if (!userLocation) {
        console.log('🔵🔵🔵 No userLocation, requesting permission... 🔵🔵🔵');
        requestLocationPermission();
      }
    }
  }, [userLocation]);

  const handleMapPress = (event: any) => {
    // Обычное нажатие - ничего не делаем
  };

  const handleRegionChange = () => {
    // Отмечаем, что пользователь переместил карту
    console.log('handleRegionChange called, userHasMovedMap:', userHasMovedMap);
    if (!userHasMovedMap) {
      console.log('Setting userHasMovedMap to true');
      setUserHasMovedMap(true);
    }
  };

  const handleMapLongPress = (event: any) => {
    console.log('Map long press triggered', event);
    console.log('Current cooldown seconds:', cooldownSeconds);
    console.log('Current showQuickAdd state:', showQuickAdd);
    
    // Проверяем кулдаун
    if (cooldownSeconds > 0) {
      console.log('Long press blocked by cooldown');
      Alert.alert(
        'Подождите',
        `Можно создать новый пост через ${cooldownSeconds} секунд`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    console.log('Setting temp pin location:', { latitude, longitude });
    
    // Анимация нажатия на карту
    hapticFeedback('medium');
    
    // Анимация масштабирования
    Animated.sequence([
      Animated.timing(mapPressScale, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(mapPressScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Анимация ripple эффекта
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(rippleOpacity, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      rippleScale.setValue(0);
      rippleOpacity.setValue(0);
    });
    
    setQuickAddLocation({ latitude, longitude });
    setQuickAddDescription('');
    setQuickAddType('dps');
    setQuickAddSeverity('medium');
    setQuickAddPhotos([]);
    
    // Анимация открытия модального окна (снизу вверх как в Telegram)
    console.log('Setting showQuickAdd to true');
    console.log('Current animation values:', {
      modalTranslateY: modalTranslateY._value,
      modalOpacity: modalOpacity._value,
      modalBackdropOpacity: modalBackdropOpacity._value,
      height: height
    });
    setShowQuickAdd(true);
    console.log('Starting modal animation');
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalTranslateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getAddressFromCoords = async (lat: number, lng: number) => {
    if (Platform.OS === 'web') {
      // Для веб-версии используем OpenStreetMap Nominatim API
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'KNG-App/1.0'
            }
          }
        );
        const data = await response.json();
        
        if (data && data.display_name) {
          // Извлекаем основные части адреса
          const parts = [];
          if (data.address) {
            if (data.address.road) parts.push(data.address.road);
            if (data.address.house_number) parts.push(data.address.house_number);
            if (data.address.suburb) parts.push(data.address.suburb);
            if (data.address.city) parts.push(data.address.city);
          }
          
          return parts.length > 0 ? parts.join(', ') : data.display_name.split(',')[0];
        }
      } catch (error) {
        console.error('Error getting address from Nominatim:', error);
      }
      return 'Неизвестный адрес';
    }
    
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result && result.length > 0) {
        const location = result[0];
        const parts = [];
        if (location.street) parts.push(location.street);
        if (location.streetNumber) parts.push(location.streetNumber);
        if (location.district) parts.push(location.district);
        if (location.city) parts.push(location.city);
        return parts.join(', ') || 'Неизвестный адрес';
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    }
    return 'Неизвестный адрес';
  };

  const getLocationWithLandmarks = (post: DPSPost) => {
    // Если у поста уже есть сохраненный ориентир, используем его
    if (post.landmark) {
      return post.address ? `${post.address}, ${post.landmark}` : post.landmark;
    }
    
    // Если адрес пустой или неизвестный, возвращаем только ориентир
    if (!post.address || post.address === 'Неизвестный адрес') {
      return getRandomLandmark();
    }
    
    // Получаем подходящий ориентир на основе адреса
    const landmark = getLandmarkForAddress(post.address);
    
    // Возвращаем адрес с ориентиром
    return `${post.address}, ${landmark}`;
  };

  const moderatePostWithAI = async (post: DPSPost): Promise<{ approved: boolean; reason?: string }> => {
    try {
      const prompt = `Проанализируй пост для модерации:

Тип события: ${POST_TYPES.find(t => t.id === post.type)?.label || post.type}
Описание: ${post.description}
Важность: ${SEVERITY_LEVELS.find(s => s.id === post.severity)?.label || post.severity}
Есть фото: ${post.photo ? 'Да' : 'Нет'}

Определи, можно ли опубликовать этот пост. Отклони если:
- Содержит нецензурную лексику
- Содержит спам или рекламу
- Не относится к дорожной ситуации
- Содержит ложную информацию
- Нарушает правила сообщества

Ответь в формате JSON:
{"approved": true/false, "reason": "причина отклонения если approved=false"}`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const data = await response.json();
      try {
        const result = JSON.parse(data.completion);
        return {
          approved: result.approved === true,
          reason: result.reason || undefined
        };
      } catch {
        // Fallback if JSON parsing fails
        const approved = data.completion.toLowerCase().includes('true') || 
                        data.completion.toLowerCase().includes('одобрен') ||
                        data.completion.toLowerCase().includes('разрешен');
        return { approved };
      }
    } catch (error) {
      console.error('AI moderation error:', error);
      // Default to approved if AI fails
      return { approved: true };
    }
  };

  const analyzeSeverityWithAI = async (typeId: DPSPost['type'], desc: string) => {
    try {
      setIsAnalyzingSeverity(true);
      
      const selectedTypeData = POST_TYPES.find(t => t.id === typeId);
      const typeLabel = selectedTypeData?.label || typeId;
      
      const prompt = `Проанализируй важность дорожного события и определи уровень серьезности.

Тип события: ${typeLabel}
${desc.trim() ? `Описание: ${desc.trim()}` : 'Описание отсутствует'}

Определи уровень важности:
- low (низкая): обычные проверки, плановые мероприятия, незначительные события
- medium (средняя): активные проверки, небольшие ДТП, временные ограничения
- high (высокая): серьезные ДТП, крупные пробки, опасные ситуации, чрезвычайные происшествия

Ответь только одним словом: low, medium или high`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const data = await response.json();
      const aiSeverity = data.completion?.trim().toLowerCase();
      
      if (aiSeverity === 'low' || aiSeverity === 'medium' || aiSeverity === 'high') {
        setQuickAddSeverity(aiSeverity as DPSPost['severity']);
      } else {
        const defaultSeverity = typeId === 'accident' ? 'high' : typeId === 'dps' ? 'low' : 'medium';
        setQuickAddSeverity(defaultSeverity);
      }
    } catch (error) {
      console.error('AI severity analysis error:', error);
      const defaultSeverity = typeId === 'accident' ? 'high' : typeId === 'dps' ? 'low' : 'medium';
      setQuickAddSeverity(defaultSeverity);
    } finally {
      setIsAnalyzingSeverity(false);
    }
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddLocation || !currentUser) return;

    // Валидация: пост должен иметь либо описание, либо фото
    const hasDescription = quickAddDescription.trim().length > 0;
    const hasPhoto = quickAddPhotos.length > 0;
    
    if (!hasDescription && !hasPhoto) {
      Alert.alert(
        'Недостаточно информации',
        'Добавьте описание или фото для публикации поста',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsSavingPost(true);
      
      // Запускаем ИИ анализ только при сохранении
      await analyzeSeverityWithAI(quickAddType, quickAddDescription);
      
      const address = await getAddressFromCoords(quickAddLocation.latitude, quickAddLocation.longitude);

      const now = Date.now();
      const postLifetime = POST_LIFETIMES[quickAddType];
      
      // Получаем ориентир один раз при создании поста
      const landmark = address && address !== 'Неизвестный адрес' 
        ? getLandmarkForAddress(address) 
        : getRandomLandmark();

      const post: DPSPost = {
        id: now.toString(),
        description: quickAddDescription.trim() || 'Без описания',
        latitude: quickAddLocation.latitude,
        longitude: quickAddLocation.longitude,
        address: address,
        landmark: landmark,
        timestamp: now,
        expiresAt: now + postLifetime,
        userId: currentUser.id,
        userName: currentUser.name,
        type: quickAddType,
        severity: quickAddSeverity,
        likes: 0,
        likedBy: [],
        photo: quickAddPhotos.length > 0 ? quickAddPhotos[0] : undefined,
        photos: quickAddPhotos.length > 0 ? quickAddPhotos : undefined,
        needsModeration: false,
        isRelevant: true,
        relevanceCheckedAt: now,
      };

      // AI moderation check
      const moderationResult = await moderatePostWithAI(post);
      
      if (!moderationResult.approved) {
        post.needsModeration = true;
        post.moderationReason = moderationResult.reason;
      }
      
      const result = await addPost(post);
      if (result.success) {
        console.log('Post saved successfully, closing modal');
        console.log('Current state before closing:', {
          userHasMovedMap,
          mapInitialized: mapInitialized.current,
          userLocation: !!userLocation
        });
        
        setShowQuickAdd(false);
        setQuickAddLocation(null);
        setQuickAddDescription('');
        setQuickAddPhotos([]);
        
        // Принудительно устанавливаем userHasMovedMap в true, чтобы предотвратить центрирование
        if (!userHasMovedMap) {
          console.log('Setting userHasMovedMap to true to prevent auto-centering');
          setUserHasMovedMap(true);
        }
        
        // Принудительно обновляем масштабирование маркеров
        setTimeout(() => {
          console.log('Force updating markers after post save');
          if (mapRef.current && mapRef.current.forceUpdateMarkers) {
            mapRef.current.forceUpdateMarkers();
          }
        }, 100);
      } else {
        if (result.error && result.error.includes('1 пост в минуту')) {
          return;
        }
        Alert.alert('Ошибка', result.error || 'Не удалось создать пост');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      // Не показываем ошибку, просто закрываем модал
      setShowQuickAdd(false);
      setQuickAddLocation(null);
      setQuickAddDescription('');
      setQuickAddPhotos([]);
      // НЕ сбрасываем userHasMovedMap - пользователь должен остаться на том же месте
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleQuickAddCancel = () => {
    // Анимация закрытия модального окна (вниз как в Telegram)
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
    setShowQuickAdd(false);
    setQuickAddLocation(null);
    setQuickAddDescription('');
    setQuickAddPhotos([]);
      
      // Сброс анимационных значений
      modalTranslateY.setValue(height);
      modalOpacity.setValue(0);
      modalBackdropOpacity.setValue(0);
    });
  };

  const pickPhoto = async () => {
    if (Platform.OS === 'web') {
      try {
        setIsUploadingImage(true);
        // Используем HTML5 file input для выбора файлов
        if (typeof document !== 'undefined') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          
          input.onchange = async (e: any) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
              for (const file of files.slice(0, 5 - quickAddPhotos.length)) {
                const reader = new FileReader();
                reader.onload = (event: any) => {
                  setQuickAddPhotos(prev => [...prev, event.target.result]);
                };
                reader.readAsDataURL(file);
              }
            }
            setIsUploadingImage(false);
          };
          
          input.click();
          return;
        } else {
          setIsUploadingImage(false);
      return;
        }
      } catch (error) {
        console.error('Error picking photo:', error);
        setIsUploadingImage(false);
        return;
      }
    }

    try {
      setIsUploadingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нет доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - quickAddPhotos.length, // Ограничиваем выбор до 5 фото всего
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages: string[] = [];
        for (const asset of result.assets) {
          if (asset.base64) {
            newImages.push(asset.base64);
          }
        }
        if (newImages.length > 0) {
          setQuickAddPhotos(prev => [...prev, ...newImages].slice(0, 5)); // Максимум 5 фото
        }
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить изображение');
      console.error('Image picker error:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web' && !isTelegramWebApp) {
      Alert.alert('Недоступно', 'Камера недоступна в веб-версии');
      return;
    }

    // Для Telegram WebApp используем встроенный API
    if (Platform.OS === 'web' && isTelegramWebApp) {
      try {
        setIsUploadingImage(true);
        // Используем Telegram WebApp API для камеры
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Используем заднюю камеру
        
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
              setQuickAddPhotos(prev => [...prev, event.target.result]);
            };
            reader.readAsDataURL(file);
          }
          setIsUploadingImage(false);
        };
        
        input.click();
        return;
      } catch (error) {
        console.error('Error taking photo in Telegram WebApp:', error);
        setIsUploadingImage(false);
        return;
      }
    }

    try {
      setIsUploadingImage(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нет доступа к камере');
        setIsUploadingImage(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Photo taken, has base64:', !!result.assets[0].base64);
        if (result.assets[0].base64) {
          setQuickAddPhotos(prev => [...prev, result.assets[0].base64!].slice(0, 5)); // Максимум 5 фото
        } else {
          console.log('No base64 data available');
        }
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сделать фото');
      console.error('Camera error:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const showImagePicker = () => {
    // Для веб-версии сразу открываем файловый диалог
    if (Platform.OS === 'web') {
      pickPhoto();
      return;
    }
    
    // Для других платформ показываем выбор
    Alert.alert(
      'Фото',
      'Выберите способ добавления фотографии',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Камера', onPress: takePhoto },
        { text: 'Галерея', onPress: pickPhoto },
      ]
    );
  };

  const removeQuickAddImage = (index: number) => {
    setQuickAddPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const PermissionDialog = () => {
    if (!showPermissionDialog) return null;

    return (
      <View style={styles.permissionOverlay}>
        <View style={styles.permissionDialog}>
          <Text style={styles.permissionTitle}>Ошибка</Text>
          <Text style={styles.permissionMessage}>
            Необходимо разрешение для доступа к камере
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => setShowPermissionDialog(false)}
          >
            <Text style={styles.permissionButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        
        {Platform.OS === 'web' ? (
          MapViewComponent && (
            <MapViewComponent
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              onPress={handleMapPress}
              onLongPress={handleMapLongPress}
              onRegionChange={handleRegionChange}
              onMapReady={() => {
                console.log('Map ready (web)');
              }}
              loadingEnabled={true}
              loadingIndicatorColor="#007AFF"
              loadingBackgroundColor="#FFFFFF"
            >
              {/* DPS Posts Markers */}
              {filteredPosts.map((post) => {
                const PostIcon = getPostTypeIcon(post.type);
                const typeLabel = getPostTypeLabel(post.type);
                return (
                  <MarkerComponent
                    key={post.id}
                    coordinate={{
                      latitude: post.latitude,
                      longitude: post.longitude,
                    }}
                    title={`${post.severity === 'high' ? '⚠️ ' : post.severity === 'medium' ? '⚠ ' : ''}${post.description}`}
                    description=""
                    postType={post.type}
                    severity={post.severity}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      setSelectedPost(post.id);
                    }}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[
                        styles.customMarker,
                        { 
                          backgroundColor: getPostTypeColor(post.type),
                          borderColor: post.severity === 'high' ? '#FF3B30' : post.severity === 'medium' ? '#FF9500' : '#FFFFFF'
                        },
                        post.severity === 'high' && styles.markerHigh,
                        post.severity === 'medium' && styles.markerMedium
                      ]}>
                        {post.severity === 'high' && (
                          <View style={styles.severityIndicator} />
                        )}
                        {post.severity === 'medium' && (
                          <View style={[styles.severityIndicator, { backgroundColor: '#FF9500' }]} />
                        )}
                        <PostIcon size={18} color="#FFFFFF" />
                      </View>
                      <View style={[
                        styles.markerLabel,
                        { backgroundColor: getPostTypeColor(post.type) }
                      ]}>
                        <Text style={styles.markerLabelText}>{typeLabel}</Text>
                      </View>
                    </View>
                  </MarkerComponent>
                );
              })}
              

              {/* User location marker with dynamic scaling */}
              {userLocation && (
                <MarkerComponent
                  coordinate={{
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                  }}
                  title="Вы здесь"
                  html={`<div data-role=\"user-marker\" style=\"position:relative;width:20px;height:20px;pointer-events:none;display:flex;align-items:center;justify-content:center;\">\n  <div style=\"position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(0, 122, 255, 0.3);animation:pulse 2s infinite;z-index:1;\"></div>\n  <div style=\"position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(0, 122, 255, 0.2);animation:pulse 2s infinite;animation-delay:0.5s;z-index:1;\"></div>\n  <div style=\"width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);border:2px solid #FFFFFF;box-shadow: 0 2px 6px rgba(0, 122, 255, 0.4);z-index:2;position:relative;\"></div>\n</div>\n<style>@keyframes pulse{0%{transform:scale(0.8);opacity:0.8;}50%{transform:scale(1.2);opacity:0.3;}100%{transform:scale(1.5);opacity:0;}}</style>`}
                />
              )}
              {console.log('🔵🔵🔵 Rendering user location marker:', !!userLocation, userLocation?.coords)}
            </MapViewComponent>
          )
        ) : (
          MapViewComponent && (
            <MapViewComponent
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              onPress={handleMapPress}
              onLongPress={handleMapLongPress}
              onRegionChange={handleRegionChange}
              onMapReady={() => {
                console.log('Map ready (native)');
              }}
              loadingEnabled={true}
              loadingIndicatorColor="#007AFF"
              loadingBackgroundColor="#FFFFFF"
              cacheEnabled={true}
              maxZoomLevel={18}
              minZoomLevel={8}
            >

              {/* DPS Posts Markers */}
              {filteredPosts.map((post) => {
                const PostIcon = getPostTypeIcon(post.type);
                const typeLabel = getPostTypeLabel(post.type);
                return (
                  <MarkerComponent
                    key={post.id}
                    coordinate={{
                      latitude: post.latitude,
                      longitude: post.longitude,
                    }}
                    title={`${post.severity === 'high' ? '⚠️ ' : post.severity === 'medium' ? '⚠ ' : ''}${post.description}`}
                    description=""
                    postType={post.type}
                    severity={post.severity}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      setSelectedPost(post.id);
                    }}
                    onLongPress={(e: any) => {
                      e.stopPropagation();
                      setSelectedPost(post.id);
                      // Анимация нажатия
                      Animated.sequence([
                        Animated.timing(longPressScale, {
                          toValue: 0.95,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                        Animated.timing(longPressScale, {
                          toValue: 1,
                          duration: 150,
                          useNativeDriver: true,
                        })
                      ]).start();
                      
                      // Открываем детали после анимации
                      setTimeout(() => {
                        setShowEventDetails(true);
                      }, 300);
                    }}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[
                        styles.customMarker,
                        { 
                          backgroundColor: getPostTypeColor(post.type),
                          borderColor: post.severity === 'high' ? '#FF3B30' : post.severity === 'medium' ? '#FF9500' : '#FFFFFF'
                        },
                        post.severity === 'high' && styles.markerHigh,
                        post.severity === 'medium' && styles.markerMedium
                      ]}>
                        {post.severity === 'high' && (
                          <View style={styles.severityIndicator} />
                        )}
                        {post.severity === 'medium' && (
                          <View style={[styles.severityIndicator, { backgroundColor: '#FF9500' }]} />
                        )}
                        <PostIcon size={18} color="#FFFFFF" />
                      </View>
                      <View style={[
                        styles.markerLabel,
                        { backgroundColor: getPostTypeColor(post.type) }
                      ]}>
                        <Text style={styles.markerLabelText}>{typeLabel}</Text>
                      </View>
                    </View>
                  </MarkerComponent>
                );
              })}
              
            </MapViewComponent>
          )
        )}
      </View>









      {/* Top Left Settings Button */}
      {currentUser?.isAdmin && (
        <TouchableOpacity
          style={styles.topLeftSettings}
          onPress={() => router.push('/admin')}
          activeOpacity={0.8}
        >
          <Settings size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Right Side Control Buttons - Точь в точь как на скриншоте */}
      <View style={styles.mapControlsContainer} pointerEvents="box-none">
        {/* Зеленая кнопка - тренды/статистика */}
        <TouchableOpacity
          style={styles.mapControlButtonGreen}
          onPress={() => setShowWeeklySummary(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          testID="open-weekly-summary"
        >
          <TrendingUp size={20} color="#34C759" />
        </TouchableOpacity>
        
        {/* Синяя кнопка - навигация/центрирование */}
        <TouchableOpacity
          style={[
            styles.mapControlButtonBlue
          ]}
          onPress={async () => {
            if (Platform.OS === 'web') {
              try {
                setIsLoadingLocation(true);
                setLocationError(null);
                hapticFeedback('light');
                // Упрощённый обработчик — без лишней диагностики
                
                // Используем Telegram API если доступен
                if (isTelegramWebApp) {
                  const result = await requestLocation();
                  if (result.granted && result.location) {
                    const { latitude, longitude } = result.location;
                    // Не центрируем карту автоматически при получении разрешения
                    const webLoc: Location.LocationObject = {
                      coords: {
                        latitude,
                        longitude,
                        altitude: null as unknown as number,
                        accuracy: 10, // Telegram обычно дает точность ~10м
                        altitudeAccuracy: null as unknown as number,
                        heading: 0,
                        speed: 0,
                      },
                      timestamp: Date.now(),
                    } as unknown as Location.LocationObject;
                    setUserLocation(webLoc);
                    hapticFeedback('success');
                  } else {
                    console.log('Telegram location permission denied');
                    hapticFeedback('error');
                    setLocationError('Доступ к геолокации запрещен');
                  }
                } else if (navigator.geolocation) {
                  // Fallback для обычного браузера
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      // Не центрируем карту автоматически при получении геолокации
                      const webLoc: Location.LocationObject = {
                        coords: {
                          latitude,
                          longitude,
                          altitude: null as unknown as number,
                          accuracy: pos.coords.accuracy ?? 0,
                          altitudeAccuracy: null as unknown as number,
                          heading: pos.coords.heading ?? 0,
                          speed: pos.coords.speed ?? 0,
                        },
                        timestamp: pos.timestamp,
                      } as unknown as Location.LocationObject;
                      setUserLocation(webLoc);
                    },
                    (error) => {
                    console.log('Web geolocation error', error);
                      hapticFeedback('error');
                      setLocationError('Ошибка определения местоположения');
                      if (mapRef.current && mapRef.current.resetNorth) {
                        mapRef.current.resetNorth();
                      }
                    },
                    { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
                  );
                } else if (mapRef.current && mapRef.current.resetNorth) {
                  mapRef.current.resetNorth();
                }
              } finally {
                setTimeout(() => setIsLoadingLocation(false), 300);
              }
              
              // Центрируем карту на пользователе после получения локации
              console.log('🔵🔵🔵 Web button: calling centerOnUser 🔵🔵🔵');
              centerOnUser();
            } else {
              // Для мобильных - быстрое центрирование на пользователе
              if (userLocation) {
                console.log('Centering on existing user location:', userLocation.coords);
                centerOnUser();
              } else {
                console.log('No user location, requesting permission...');
                setIsLoadingLocation(true);
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  console.log('Location permission status:', status);

                  if (status !== 'granted') {
                    console.log('Location permission denied');
                    Alert.alert(
                      'Доступ к местоположению',
                      'Для центрирования карты на вашем местоположении необходимо разрешить доступ к геолокации в настройках приложения.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }

                  // Мгновенно пробуем last known
                  const last = await Location.getLastKnownPositionAsync();
                  if (last) {
                    console.log('Button: using last known location:', last.coords);
                    setUserLocation(last);
                    // Центрируем карту только при нажатии кнопки
                    if (mapRef.current) {
                      mapRef.current.animateToRegion({
                        latitude: last.coords.latitude,
                        longitude: last.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }, 600);
                    }
                  }

                  // Быстрый запрос
                  let quick: Location.LocationObject | null = null;
                  try {
                    quick = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced,
                    });
                    console.log('Button: quick current position:', quick.coords);
                    setUserLocation(quick);
                    // Центрируем карту только при нажатии кнопки
                    if (mapRef.current) {
                      mapRef.current.animateToRegion({
                        latitude: quick.coords.latitude,
                        longitude: quick.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }, 700);
                    }
                  } catch (e) {
                    console.log('Button: quick location timeout', e);
                  }

                  // Запускаем трекинг для уточнения
                  startLocationTracking();
                } catch (error) {
                  console.error('Error getting location:', error);
                  Alert.alert(
                    'Ошибка',
                    'Не удалось определить ваше местоположение. Проверьте, включена ли геолокация на устройстве.',
                    [{ text: 'OK' }]
                  );
                } finally {
                  setIsLoadingLocation(false);
                }
              }
            }
          }}
          activeOpacity={0.8}
          disabled={isLoadingLocation}
          accessibilityRole="button"
          testID="center-on-user"
        >
          <Navigation size={20} color="#007AFF" />
        </TouchableOpacity>
        
        {/* Синяя кнопка - добавить пост */}
        <TouchableOpacity
          style={[
            styles.mapControlButtonBlue,
            (cooldownSeconds > 0) && styles.mapControlButtonDisabled
          ]}
          onPress={() => {
            if (cooldownSeconds > 0) {
              Alert.alert(
                'Подождите',
                `Можно создать новый пост через ${cooldownSeconds} секунд`,
                [{ text: 'OK' }]
              );
              return;
            }
            
            // Анимация кнопки плюс
            hapticFeedback('light');
            
            Animated.parallel([
              Animated.sequence([
                Animated.timing(plusButtonScale, {
                  toValue: 0.9,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(plusButtonScale, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]),
              Animated.timing(plusButtonRotation, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              plusButtonRotation.setValue(0);
            });
            
            // Открываем модальное окно вместо перехода на другую страницу
            setQuickAddLocation(null);
            setQuickAddDescription('');
            setQuickAddType('dps');
            setQuickAddSeverity('medium');
            setQuickAddPhotos([]);
            
            // Анимация открытия модального окна (снизу вверх как в Telegram)
            setShowQuickAdd(true);
            Animated.parallel([
              Animated.timing(modalBackdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.spring(modalTranslateY, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              }),
            ]).start();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          testID="add-post-button"
          disabled={cooldownSeconds > 0}
        >
          <Animated.View style={{
            transform: [
              { scale: plusButtonScale },
              { rotate: plusButtonRotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg']
              })}
            ]
          }}>
          <Plus size={20} color={cooldownSeconds > 0 ? "#9CA3AF" : "#007AFF"} />
          </Animated.View>
        </TouchableOpacity>
      </View>





      {/* Posts list - всегда видны */}
      <GlassView style={styles.postsContainer}>
        <View style={styles.postsHeader}>
        </View>
        
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={32} color="#C7C7CC" />
            <Text style={styles.emptyText}>Нет активных постов</Text>
            <Text style={styles.emptySubtext}>Нажмите +, чтобы добавить</Text>
          </View>
        ) : (
          <FlatList 
            data={filteredPosts}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={width}
            decelerationRate="fast"
            snapToAlignment="center"
            contentContainerStyle={styles.flatListContainer}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item: post }) => {
              const PostTypeIcon = getPostTypeIcon(post.type);
              const isLiked = post.likedBy?.includes(currentUser?.id || '') || false;
              const distance = getDistanceFromUser(post.latitude, post.longitude);
              const isRecent = Date.now() - post.timestamp < 300000; // 5 minutes
              
              return (
                <Animated.View
                  style={{
                    transform: [{ scale: selectedPost === post.id ? longPressScale : 1 }]
                  }}
                >
                <TouchableOpacity
                  style={[
                    styles.singlePostCard,
                    selectedPost === post.id && styles.postCardSelected,
                    post.needsModeration && styles.postCardModeration,
                    isRecent && styles.postCardRecent
                  ]}
                  onPress={() => {
                    // Устанавливаем выбранный пост без центрирования карты
                    setSelectedPost(post.id);
                  }}
                  onLongPress={() => {
                    // Анимация нажатия
                    Animated.sequence([
                      Animated.timing(longPressScale, {
                        toValue: 0.95,
                        duration: 150,
                        useNativeDriver: true,
                      }),
                      Animated.timing(longPressScale, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                      })
                    ]).start();
                    
                    // Устанавливаем выбранный пост без центрирования карты
                    setSelectedPost(post.id);
                    
                    // Показываем детали с задержкой после анимации
                    setTimeout(() => {
                      setShowEventDetails(true);
                    }, 900);
                  }}
                >
                  {post.needsModeration && (
                    <View style={styles.moderationBadgeCompact}>
                      <Text style={styles.moderationTextCompact}>На модерации</Text>
                    </View>
                  )}
                  

                  
                  <View style={styles.compactPostHeader}>
                    <PostTypeIcon size={16} color={getPostTypeColor(post.type)} />
                    <View style={styles.compactPostInfo}>
                      <Text style={styles.compactPostUser} numberOfLines={1}>{post.userName}</Text>
                      {post.verified && (
                        <CheckCircle2 size={12} color="#34C759" />
                      )}
                    </View>
                    <View style={styles.compactPostTime}>
                      {post.severity === 'high' && (
                        <View style={styles.compactSeverityIndicatorInline} />
                      )}
                      {post.severity === 'medium' && (
                        <View style={[styles.compactSeverityIndicatorInline, { backgroundColor: '#FF9500' }]} />
                      )}
                    </View>
                  </View>
                  
                  <Text style={styles.compactPostDescription} numberOfLines={2} ellipsizeMode="tail">
                    {post.description}
                  </Text>
                  
                  {post.address && (
                    <View style={styles.compactAddressContainer}>
                      <MapPinIcon size={10} color="#8E8E93" />
                      <Text style={styles.compactAddressText} numberOfLines={2} ellipsizeMode="tail">{getLocationWithLandmarks(post)}</Text>
                    </View>
                  )}
                  
                  {distance && (
                    <View style={styles.compactDistanceContainer}>
                      <MapPinIcon size={10} color="#8E8E93" />
                      <Text style={styles.compactDistanceText}>{distance.toFixed(1)} км от вас</Text>
                    </View>
                  )}
                  
                  <View style={styles.compactPostActions}>
                    <TouchableOpacity 
                      style={styles.compactLikeButton}
                      onPress={() => likePost(post.id)}
                    >
                      <Heart 
                        size={14} 
                        color={isLiked ? '#FF3B30' : '#8E8E93'}
                        fill={isLiked ? '#FF3B30' : 'transparent'}
                      />
                      <Text style={[
                        styles.compactLikeText,
                        isLiked && { color: '#FF3B30' }
                      ]}>
                        {post.likes || 0}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.compactRightActions}>
                      {(post.autoApproved || post.textApproved) && (
                        <View style={styles.compactApprovalContainer}>
                          <CheckCheck size={16} color="#34C759" />
                          <View style={styles.compactAiIndicator}>
                            <Text style={styles.compactAiText}>ИИ</Text>
                          </View>
                        </View>
                      )}
                      
                      {post.verified && !post.autoApproved && !post.textApproved && (
                        <View style={styles.compactApprovalContainer}>
                          <CheckCheck size={16} color="#34C759" />
                        </View>
                      )}
                      
                      {!post.needsModeration && !post.verified && !post.autoApproved && !post.textApproved && post.userId !== currentUser?.id && (
                        <View style={styles.compactApprovalContainer}>
                          <CheckCheck size={16} color="#34C759" />
                        </View>
                      )}
                      
                      {!post.verified && post.userId !== currentUser?.id && (
                        <TouchableOpacity 
                          style={styles.compactActionButton}
                          onPress={() => verifyPost(post.id)}
                        >
                          <CheckCircle2 size={14} color="#34C759" />
                        </TouchableOpacity>
                      )}
                      
                      {(post.userId === currentUser?.id || currentUser?.isAdmin) && (
                        <TouchableOpacity 
                          style={styles.compactActionButton}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <Trash2 size={14} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                </Animated.View>
              );
            }}
            keyExtractor={(item) => item.id}
          />
        )}
        </GlassView>

      {/* Убираем кнопку переключения постов, так как они всегда видны */}





      {/* Quick Add Modal */}
      {showQuickAdd && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={handleQuickAddCancel}
          >
            <Animated.View 
              style={[
                styles.modalBackdrop,
                { opacity: modalBackdropOpacity }
              ]}
            />
          </TouchableOpacity>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacity,
                transform: [{ translateY: modalTranslateY }]
              }
            ]}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ flex: 1 }}
            >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleQuickAddCancel}>
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={{ width: 24 }} />
            <TouchableOpacity 
              style={[
                styles.saveButton,
                (isSavingPost || cooldownSeconds > 0) && styles.saveButtonDisabled
              ]}
              onPress={() => {
                if (isSavingPost || cooldownSeconds > 0) return;
                handleQuickAddSubmit();
              }}
              disabled={isSavingPost || cooldownSeconds > 0}
            >
              {isSavingPost ? (
                <View style={styles.saveButtonContent}>
                  <Animated.View style={{
                    transform: [{ scale: savePulseValue }],
                    opacity: saveOpacityValue
                  }}>
                    <View style={styles.savePulse}>
                      <View style={styles.savePulseInner} />
                    </View>
                  </Animated.View>
                  <Text style={styles.saveButtonText}>AI проверка</Text>
                </View>
              ) : (
                <Text style={[
                  styles.saveButtonText,
                  (cooldownSeconds > 0) && styles.saveButtonTextDisabled
                ]}>
                  {cooldownSeconds > 0 ? `Через ${cooldownSeconds}с` : 'Сохранить'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Type Selection - moved to top */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Тип события</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {POST_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = quickAddType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.quickTypeButton,
                        isSelected && { backgroundColor: type.color, borderColor: type.color }
                      ]}
                      onPress={() => {
                        setQuickAddType(type.id);
                        // ИИ анализ теперь только при сохранении
                      }}
                    >
                      <IconComponent 
                        size={18} 
                        color={isSelected ? '#FFFFFF' : type.color} 
                      />
                      <Text style={[
                        styles.quickTypeButtonText,
                        isSelected && { color: '#FFFFFF' }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Hidden Severity - AI determines automatically */}
            <View style={{ height: 0, overflow: 'hidden' }}>
              {isAnalyzingSeverity && (
                <View style={styles.aiAnalyzeIndicator}>
                  <Animated.View style={{
                    transform: [{ scale: pulseValue }],
                    opacity: opacityValue
                  }}>
                    <View style={styles.aiPulse}>
                      <View style={styles.aiPulseInner} />
                    </View>
                  </Animated.View>
                  <Text style={styles.aiAnalyzeText}>AI определяет важность...</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Описание</Text>
              <TextInput
                style={styles.modalTextInput}
                value={quickAddDescription}
                onChangeText={setQuickAddDescription}
                placeholder="Опишите что происходит..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                maxLength={80}
              />
              <Text style={styles.charCount}>{quickAddDescription.length}/80 (макс. 80 символов)</Text>
            </View>

            {/* Photo Section */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Фото ({quickAddPhotos.length}/5)</Text>
              {quickAddPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {quickAddPhotos.map((image, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image 
                        source={{ uri: `data:image/jpeg;base64,${image}` }} 
                        style={styles.selectedImageSmall}
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => {
                          setQuickAddPhotos(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {quickAddPhotos.length < 5 && (
                    <TouchableOpacity
                      style={styles.addMoreImageButton}
                      onPress={showImagePicker}
                      disabled={isUploadingImage}
                      activeOpacity={0.7}
                    >
                      {isUploadingImage ? (
                        <ActivityIndicator size="small" color="#0066FF" />
                      ) : (
                        <Plus size={20} color="#0066FF" />
                      )}
                    </TouchableOpacity>
                  )}
                </ScrollView>
              ) : (
                <TouchableOpacity
                  style={styles.singlePhotoButton}
                  onPress={showImagePicker}
                  disabled={isUploadingImage}
                  activeOpacity={0.7}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#0066FF" />
                  ) : (
                    <Camera size={24} color="#0066FF" />
                  )}
                </TouchableOpacity>
              )}
              <Text style={styles.imageHint}>
                Максимум 5 фото • ИИ анализ при сохранении
              </Text>
            </View>



            <View style={styles.modalInfoBox}>
              <AlertCircle size={16} color="#64748B" />
              <Text style={styles.modalInfoText}>
                {(() => {
                  const lifetime = POST_LIFETIMES[quickAddType];
                  const hours = Math.floor(lifetime / (60 * 60 * 1000));
                  const days = Math.floor(hours / 24);
                  
                  if (days > 0) {
                    return `Событие актуально ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
                  } else if (hours > 0) {
                    return `Событие актуально ${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
                  } else {
                    const minutes = Math.floor(lifetime / (60 * 1000));
                    return `Событие актуально ${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}`;
                  }
                })()} 
              </Text>
            </View>
          </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        <PermissionDialog />
        </View>
      )}

      {/* Event Details Modal */}
      <Modal
        visible={showEventDetails && selectedPost !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowEventDetails(false);
          setSelectedPost(null);
        }}
      >
        {selectedPost && (() => {
          const post = posts.find(p => p.id === selectedPost);
          if (!post) return null;
          
          const PostTypeIcon = getPostTypeIcon(post.type);
          const isLiked = post.likedBy?.includes(currentUser?.id || '') || false;
          const distance = getDistanceFromUser(post.latitude, post.longitude);
          
          return (
            <View style={styles.eventDetailsContainer}>
              <View style={styles.eventDetailsHeader}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowEventDetails(false);
                    setSelectedPost(null);
                  }}
                >
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
                <Text style={styles.eventDetailsTitle}>Детали события</Text>
                <View style={{ width: 24 }} />
              </View>
              
              <ScrollView style={styles.eventDetailsContent}>
                {/* Event Type and User */}
                <View style={styles.eventDetailsMainInfo}>
                  <View style={[
                    styles.eventTypeIconLarge,
                    { backgroundColor: getPostTypeColor(post.type) }
                  ]}>
                    <PostTypeIcon size={32} color="#FFFFFF" />
                  </View>
                  
                  <View style={styles.eventMainDetails}>
                    <Text style={styles.eventTypeLarge}>
                      {post.type === 'dps' ? 'Пост ДПС' : 
                       post.type === 'patrol' ? 'Патруль' : 
                       post.type === 'accident' ? 'ДТП' : 
                       post.type === 'camera' ? 'Камера' : 
                       post.type === 'roadwork' ? 'Ремонт дороги' : 
                       post.type === 'animals' ? 'Животные на дороге' : 
                       post.type === 'other' ? 'Остальное' : 'Событие'}
                    </Text>
                    
                    <View style={styles.eventUserInfo}>
                      <Text style={styles.eventUserName}>Сообщил: {post.userName}</Text>
                      {post.verified && (
                        <CheckCircle2 size={18} color="#34C759" />
                      )}
                    </View>
                    
                  </View>
                </View>
                

                
                {/* Description */}
                {post.description && (
                  <View style={styles.eventDetailsSection}>
                    <Text style={styles.eventDetailsSectionTitle}>Описание</Text>
                    <Text style={styles.eventDescription}>{post.description}</Text>
                  </View>
                )}
                
                {/* Location */}
                {post.address && (
                  <View style={styles.eventDetailsSection}>
                    <Text style={styles.eventDetailsSectionTitle}>Местоположение</Text>
                    <View style={styles.eventLocationInfo}>
                      <MapPinIcon size={16} color="#8E8E93" />
                      <Text style={styles.eventAddress}>{post.address}</Text>
                    </View>
                    {distance && (
                      <Text style={styles.eventDistance}>{distance.toFixed(1)} км от вас</Text>
                    )}
                  </View>
                )}
                
                {/* Photo */}
                {post.photo && (
                  <View style={styles.eventDetailsSection}>
                    <Text style={styles.eventDetailsSectionTitle}>Фото</Text>
                    <Image 
                      source={{ 
                        uri: post.photo.startsWith('http') 
                          ? post.photo 
                          : post.photo.startsWith('data:') 
                            ? post.photo 
                            : `data:image/jpeg;base64,${post.photo}` 
                      }} 
                      style={styles.eventDetailsPhoto} 
                      resizeMode="cover"
                    />
                  </View>
                )}
                
                {/* Actions */}
                <View style={styles.eventDetailsActions}>
                  <TouchableOpacity 
                    style={styles.eventLikeButton}
                    onPress={() => likePost(post.id)}
                  >
                    <Heart 
                      size={20} 
                      color={isLiked ? '#FF3B30' : '#8E8E93'}
                      fill={isLiked ? '#FF3B30' : 'transparent'}
                    />
                    <Text style={[
                      styles.eventLikeText,
                      isLiked && { color: '#FF3B30' }
                    ]}>
                      {post.likes || 0} отметок &quot;Полезно&quot;
                    </Text>
                  </TouchableOpacity>
                  
                  {!post.verified && post.userId !== currentUser?.id && (
                    <TouchableOpacity 
                      style={styles.eventVerifyButton}
                      onPress={() => {
                        verifyPost(post.id);
                        setShowEventDetails(false);
                        setSelectedPost(null);
                      }}
                    >
                      <CheckCircle2 size={20} color="#34C759" />
                      <Text style={styles.eventVerifyText}>Подтвердить</Text>
                    </TouchableOpacity>
                  )}
                  
                  {(post.userId === currentUser?.id || currentUser?.isAdmin) && (
                    <TouchableOpacity 
                      style={styles.eventDeleteButton}
                      onPress={() => {
                        handleDeletePost(post.id);
                        setShowEventDetails(false);
                      }}
                    >
                      <Trash2 size={20} color="#FF3B30" />
                      <Text style={styles.eventDeleteText}>Удалить</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          );
        })()}
      </Modal>

      {/* Weekly Summary Modal */}
      <Modal
        visible={showWeeklySummary}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowWeeklySummary(false)}
      >
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <TouchableOpacity onPress={() => setShowWeeklySummary(false)}>
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.summaryTitle}>Недельная сводка</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.summaryContent}>
            {(() => {
              const { posts: weeklyPosts, summary } = getWeeklyEvents();
              
              return (
                <>
                  {/* Overview Stats */}
                  <View style={styles.summaryStatsContainer}>
                    <View style={styles.summaryMainStat}>
                      <Text style={styles.summaryMainNumber}>{summary.total}</Text>
                      <Text style={styles.summaryMainLabel}>событий за неделю</Text>
                    </View>
                    
                    <View style={styles.summarySubStats}>
                      <View style={styles.summarySubStat}>
                        <Text style={styles.summarySubNumber}>{summary.averagePerDay}</Text>
                        <Text style={styles.summarySubLabel}>в день</Text>
                      </View>
                      <View style={styles.summarySubStat}>
                        <Text style={styles.summarySubNumber}>{summary.highSeverity}</Text>
                        <Text style={styles.summarySubLabel}>важных</Text>
                      </View>
                    </View>
                  </View>

                  {/* Event Types Breakdown */}
                  <View style={styles.summarySection}>
                    <Text style={styles.summarySectionTitle}>По типам событий</Text>
                    <View style={styles.summaryTypeGrid}>
                      {[
                        { type: 'dps', count: summary.dps, label: 'Посты ДПС', color: '#FF3B30', icon: DPSIcon },
                        { type: 'patrol', count: summary.patrol, label: 'Патрули', color: '#007AFF', icon: PatrolIcon },
                        { type: 'accident', count: summary.accidents, label: 'ДТП', color: '#FF9500', icon: AccidentIcon },
                        { type: 'camera', count: summary.cameras, label: 'Камеры', color: '#34C759', icon: CameraIcon },
                        { type: 'roadwork', count: summary.roadwork, label: 'Ремонт', color: '#FF9500', icon: RoadworkIcon },
                        { type: 'animals', count: summary.animals, label: 'Животные', color: '#8E44AD', icon: AnimalsIcon },
                        { type: 'other', count: summary.other, label: 'Остальное', color: '#6C757D', icon: OtherIcon },
                      ].map(({ type, count, label, color, icon: IconComponent }) => (
                        <View key={type} style={styles.summaryTypeItem}>
                          <View style={[styles.summaryTypeIcon, { backgroundColor: color }]}>
                            <IconComponent size={20} color="#FFFFFF" />
                          </View>
                          <Text style={styles.summaryTypeCount}>{count}</Text>
                          <Text style={styles.summaryTypeLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Most Active Day */}
                  {summary.mostActiveDay.count > 0 && (
                    <View style={styles.summarySection}>
                      <Text style={styles.summarySectionTitle}>Самый активный день</Text>
                      <View style={styles.summaryActiveDay}>
                        <View style={styles.summaryActiveDayIcon}>
                          <Target size={24} color="#0066FF" />
                        </View>
                        <View style={styles.summaryActiveDayInfo}>
                          <Text style={styles.summaryActiveDayName}>{summary.mostActiveDay.day}</Text>
                          <Text style={styles.summaryActiveDayCount}>{summary.mostActiveDay.count} событий</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Recent Events */}
                  {weeklyPosts.length > 0 && (
                    <View style={styles.summarySection}>
                      <Text style={styles.summarySectionTitle}>Последние события</Text>
                      {weeklyPosts.slice(0, 5).map((post) => {
                        const PostIcon = getPostTypeIcon(post.type);
                        return (
                          <View key={post.id} style={styles.summaryEventItem}>
                            <View style={[styles.summaryEventIcon, { backgroundColor: getPostTypeColor(post.type) }]}>
                              <PostIcon size={16} color="#FFFFFF" />
                            </View>
                            <View style={styles.summaryEventInfo}>
                              <Text style={styles.summaryEventDescription} numberOfLines={2}>
                                {post.description}
                              </Text>
                              <Text style={styles.summaryEventTime}>
                                {post.userName}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {summary.total === 0 && (
                    <View style={styles.summaryEmpty}>
                      <Zap size={48} color="#C7C7CC" />
                      <Text style={styles.summaryEmptyTitle}>Тихая неделя</Text>
                      <Text style={styles.summaryEmptyText}>
                        За последние 7 дней не было зарегистрировано событий
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}
          </ScrollView>
        </View>
      </Modal>
      {/* Убрали глобальный лоадер, чтобы не перекрывал карту */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    height: height * 0.7,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  mapPlaceholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
  loader: {
    marginTop: 20,
  },
  locationText: {
    fontSize: 12,
    color: '#0066FF',
    marginTop: 12,
  },
  markerSimulation: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainerWeb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customMarkerWeb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerLabel: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerLabelWeb: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  markerLabelTextWeb: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Стили для маркеров с разной важностью
  markerHigh: {
    borderWidth: 3,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  markerMedium: {
    borderWidth: 3,
    borderColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  markerHighWeb: {
    borderWidth: 3,
    borderColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  markerMediumWeb: {
    borderWidth: 3,
    borderColor: '#FF9500',
  },

  // User location marker
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Старые стили для совместимости
  urgentIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  urgentIndicatorWeb: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  urgentTextWeb: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },


  postsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.26,
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  postsHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },


  postsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  clearButton: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
  },
  postsListContainer: {
    paddingHorizontal: 24,
  },
  flatListContainer: {
    paddingHorizontal: 0,
  },
  compactPostCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    width: width * 0.65,
    height: height * 0.18,
    backdropFilter: 'blur(10px)',
  },
  compactPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  compactPostInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactPostUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  compactPostDescription: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 6,
    fontWeight: '500',
  },
  compactPostDetailedDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  compactPostTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactPostTimeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  compactDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  compactDistanceText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  compactAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  compactAddressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '400',
    flex: 1,
    flexWrap: 'wrap',
  },
  compactPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  compactLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactLikeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  compactActionButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactApprovalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  compactAiIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAiText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  moderationBadgeCompact: {
    position: 'absolute',
    top: -4,
    right: 8,
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  moderationTextCompact: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  autoApprovedBadgeCompact: {
    position: 'absolute',
    top: 8,
    right: 60,
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  autoApprovedTextCompact: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
  },
  postCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    width: (width - 48) * 0.45,
    minHeight: height * 0.25 - 60,
    backdropFilter: 'blur(10px)',
  },
  singlePostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    width: width * 0.9,
    height: height * 0.24,
    marginHorizontal: width * 0.05,
  },
  postCardSelected: {
    shadowOpacity: 0.08,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  postTypeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  postInfo: {
    flex: 1,
    minWidth: 0,
  },
  postUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 1,
  },
  postTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  postTimeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  postDescription: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  postAddress: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 6,
    flexWrap: 'wrap',
    fontStyle: 'italic',
  },
  postCoords: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
  },
  verifyText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
  topLeftSettings: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  leftColumnContainer: {
    position: 'absolute',
    left: 20,
    top: height * 0.3,
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  leftColumnContainerLower: {
    position: 'absolute',
    left: 20,
    top: height * 0.6,
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  leftColumnContainerSameLevel: {
    position: 'absolute',
    left: 20,
    top: height * 0.45,
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  leftColumnButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  rightSideContainer: {
    position: 'absolute',
    right: 20,
    top: height * 0.2,
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  rightSideContainerLower: {
    position: 'absolute',
    right: 20,
    top: height * 0.35,
    alignItems: 'center',
    gap: 16,
    zIndex: 1000,
  },
  mapControlsContainer: {
    position: 'absolute',
    right: 16,
    top: height * 0.25,
    alignItems: 'center',
    gap: 16,
    zIndex: 1000,
  },
  rightSideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    cursor: 'pointer',
  },
  mapControlButtonGreen: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  mapControlButtonBlue: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  mapControlButtonLoading: {
    // отключено подсвечивание при загрузке
  },
  mapControlButtonDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0.05,
  },
  bottomSummaryButton: {
    position: 'absolute',
    bottom: height * 0.25 + 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  bottomSummaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryFab: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  adminFab: {
    backgroundColor: '#FF9500',
    shadowColor: '#FF9500',
  },
  togglePostsButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  togglePostsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  summaryContent: {
    flex: 1,
    padding: 20,
  },
  summaryStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryMainStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryMainNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0066FF',
    lineHeight: 56,
  },
  summaryMainLabel: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  summarySubStats: {
    flexDirection: 'row',
    gap: 40,
  },
  summarySubStat: {
    alignItems: 'center',
  },
  summarySubNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759',
  },
  summarySubLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  summaryTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryTypeItem: {
    alignItems: 'center',
    width: '30%',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTypeCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  summaryTypeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },
  summaryActiveDay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    gap: 16,
  },
  summaryActiveDayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryActiveDayInfo: {
    flex: 1,
  },
  summaryActiveDayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  summaryActiveDayCount: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '500',
  },
  summaryEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  summaryEventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryEventInfo: {
    flex: 1,
  },
  summaryEventDescription: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryEventTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  summaryEmpty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  summaryEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  summaryEmptyText: {
    fontSize: 16,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },

  modalContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
    alignSelf: 'stretch',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066FF',
  },
  saveButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  savePulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  savePulseInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066FF',
  },
  aiPulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  aiPulseInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066FF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  locationInfo: {
    backgroundColor: '#E8F0FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  locationInfoText: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '500',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  typeScroll: {
    marginTop: 4,
  },
  quickTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickTypeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
  },
  quickSeverityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickSeverityButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
  },
  severityContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  modalTextInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  modalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  postCardModeration: {
    opacity: 0.95,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  moderationBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#9CA3AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  moderationText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  postPhotoContainer: {
    width: '100%',
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  postPhoto: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  selectedPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    height: 80,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '500',
  },
  autoApprovedBadge: {
    position: 'absolute',
    top: -6,
    right: 80,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  autoApprovedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  yandexMapContainer: {
    width: '100%',
    height: 400,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },


  postCardRecent: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowOpacity: 0.08,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  eventDetailsContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  eventDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  eventDetailsContent: {
    flex: 1,
    padding: 20,
  },
  eventDetailsMainInfo: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  eventTypeIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventMainDetails: {
    flex: 1,
  },
  eventTypeLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  eventUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  eventUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  eventTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTimeText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  eventDetailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventDescription: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 24,
  },
  eventLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventAddress: {
    fontSize: 15,
    color: '#3C3C43',
    flex: 1,
  },
  eventDistance: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  eventDetailsPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  eventDetailsActions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  eventLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  eventLikeText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  eventVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  eventVerifyText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
  },
  eventDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  eventDeleteText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAnalyzeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAnalyzeText: {
    fontSize: 12,
    color: '#0066FF',
    fontWeight: '500',
  },
  singlePhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 32,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    minHeight: 120,
    marginVertical: 8,
  },
  imageHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  permissionDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 40,
    alignItems: 'center',
    minWidth: 280,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  permissionMessage: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  photosScroll: {
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImageSmall: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  addMoreImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066FF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoApprovedMarker: {
    borderWidth: 3,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
  },
  photoIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#0066FF',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  severityIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  severityIndicatorWeb: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  compactSeverityIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  compactSeverityIndicatorInline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginLeft: 4,
  },
  
  
  // Modal animation styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  modalBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },


});