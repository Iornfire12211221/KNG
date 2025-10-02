import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useApp } from '@/hooks/app-store';
import { MapPin, AlertCircle, Shield, AlertTriangle, Camera, Construction, Rabbit, X, Car, MoreHorizontal, Plus, RefreshCw } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { DPSPost, POST_LIFETIMES } from '@/types';
import LoadingOverlay from '@/components/LoadingOverlay';
import { getLandmarkForAddress, getRandomLandmark } from '@/constants/kingisepp-landmarks';

const KINGISEPP_CENTER = {
  latitude: 59.3733,
  longitude: 28.6134,
};

const POST_TYPES = [
  { id: 'dps' as const, label: 'Пост ДПС', icon: Shield, color: '#FF3B30' },
  { id: 'patrol' as const, label: 'Патруль', icon: Car, color: '#007AFF' },
  { id: 'accident' as const, label: 'ДТП', icon: AlertTriangle, color: '#DC2626' },
  { id: 'camera' as const, label: 'Камера', icon: Camera, color: '#0066FF' },
  { id: 'roadwork' as const, label: 'Ремонт дороги', icon: Construction, color: '#F59E0B' },
  { id: 'animals' as const, label: 'Замечены животные', icon: Rabbit, color: '#059669' },
  { id: 'other' as const, label: 'Остальное', icon: MoreHorizontal, color: '#6B7280' },
];

const SEVERITY_LEVELS = [
  { id: 'low' as const, label: 'Низкая', color: '#34C759' },
  { id: 'medium' as const, label: 'Средняя', color: '#FF9500' },
  { id: 'high' as const, label: 'Высокая', color: '#FF3B30' },
];

export default function AddPostScreen() {
  const { addPost, currentUser, posts } = useApp();
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(KINGISEPP_CENTER.latitude);
  const [longitude, setLongitude] = useState(KINGISEPP_CENTER.longitude);
  const [address, setAddress] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasInitialLocation, setHasInitialLocation] = useState(false);
  const [selectedType, setSelectedType] = useState<DPSPost['type']>('dps');
  const [selectedSeverity, setSelectedSeverity] = useState<DPSPost['severity']>('medium');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const [isAnalyzingSeverity, setIsAnalyzingSeverity] = useState(false);
  const pulseValue = useRef(new Animated.Value(1)).current;
  const savePulseValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const saveOpacityValue = useRef(new Animated.Value(1)).current;
  
  // Animation values for buttons and interactions
  const typeButtonScale = useRef(new Animated.Value(1)).current;
  const locationButtonScale = useRef(new Animated.Value(1)).current;
  const photoButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonScale = useRef(new Animated.Value(1)).current;


  const lastMyPostTs = useMemo(() => {
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
    if (remain > 0) {
      setCooldownSeconds(remain);
    } else {
      setCooldownSeconds(0);
    }
  }, [lastMyPostTs]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds(prev => {
        const next = Math.max(0, prev - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  const getAddressFromCoords = async (lat: number, lng: number) => {
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

  const getCurrentLocation = async (showError = true) => {
    if (Platform.OS === 'web') {
      if (showError) {
        Alert.alert('Недоступно', 'Геолокация недоступна в веб-версии');
      }
      return;
    }

    try {
      setIsGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        if (showError) {
          Alert.alert('Ошибка', 'Нет доступа к геолокации');
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      
      setLatitude(lat);
      setLongitude(lng);
      
      const addressText = await getAddressFromCoords(lat, lng);
      setAddress(addressText);
      setHasInitialLocation(true);
    } catch {
      if (showError) {
        Alert.alert('Ошибка', 'Не удалось получить местоположение');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Автоматически определяем местоположение при открытии
  useEffect(() => {
    if (!hasInitialLocation) {
      getCurrentLocation(false);
    }
  }, []);

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Недоступно', 'Загрузка изображений недоступна в веб-версии');
      return;
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
        selectionLimit: 5 - selectedImages.length, // Ограничиваем выбор до 5 фото всего
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
          setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Максимум 5 фото
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
    if (Platform.OS === 'web') {
      Alert.alert('Недоступно', 'Камера недоступна в веб-версии');
      return;
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
          setSelectedImages(prev => [...prev, result.assets[0].base64!].slice(0, 5)); // Максимум 5 фото
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

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeSeverityWithAI = async (typeId: DPSPost['type'], desc: string) => {
    try {
      setIsAnalyzingSeverity(true);
      
      const selectedTypeData = POST_TYPES.find(t => t.id === typeId);
      const typeLabel = selectedTypeData?.label || typeId;
      
      // Получаем текущие условия для анализа
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDate = now.toLocaleDateString('ru-RU');
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Определяем время суток
      let timeOfDay: string;
      if (currentHour >= 6 && currentHour < 12) {
        timeOfDay = 'утро';
      } else if (currentHour >= 12 && currentHour < 18) {
        timeOfDay = 'день';
      } else if (currentHour >= 18 && currentHour < 22) {
        timeOfDay = 'вечер';
      } else {
        timeOfDay = 'ночь';
      }
      
      // Определяем сезон
      const month = now.getMonth() + 1;
      let season: string;
      if (month >= 3 && month <= 5) {
        season = 'весна';
      } else if (month >= 6 && month <= 8) {
        season = 'лето';
      } else if (month >= 9 && month <= 11) {
        season = 'осень';
      } else {
        season = 'зима';
      }
      
      const prompt = `Проанализируй важность дорожного события с учетом времени суток и погодных условий.

Текущие условия:
- Время: ${currentTime} (${timeOfDay})
- Дата: ${currentDate}
- Сезон: ${season}
- Местоположение: Кингисепп, Ленинградская область

Событие:
- Тип: ${typeLabel}
- Описание: ${desc.trim() || 'Описание отсутствует'}

Учитывай при анализе:
1. Время суток влияет на опасность:
   - Ночь/вечер: повышенная опасность из-за плохой видимости
   - Утро: час пик, больше трафика
   - День: обычные условия

2. Сезонные факторы:
   - Зима: гололед, снег повышают опасность
   - Весна/осень: дожди, слякоть
   - Лето: обычные условия

3. Региональные особенности Кингисеппа

Определи уровень важности:
- low (низкая): обычные проверки, плановые мероприятия в хороших условиях
- medium (средняя): активные проверки, небольшие ДТП, события в сложных условиях
- high (высокая): серьезные ДТП, опасные ситуации, любые события в ночное время или плохую погоду

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
        setSelectedSeverity(aiSeverity as DPSPost['severity']);

      } else {
        // Fallback to default severity based on type
        const defaultSeverity = typeId === 'accident' ? 'high' : typeId === 'dps' ? 'low' : 'medium';
        setSelectedSeverity(defaultSeverity);

      }
    } catch (error) {
      console.error('AI severity analysis error:', error);
      // Fallback to default severity based on type
      const defaultSeverity = typeId === 'accident' ? 'high' : typeId === 'dps' ? 'low' : 'medium';
      setSelectedSeverity(defaultSeverity);

    } finally {
      setIsAnalyzingSeverity(false);
    }
  };

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
    if (isSaving) {
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
  }, [isSaving, savePulseValue, saveOpacityValue]);

  const showImagePicker = () => {
    Alert.alert(
      'Фото',
      'Выберите способ добавления фотографии',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Камера', onPress: takePhoto },
        { text: 'Галерея', onPress: pickImage },
      ]
    );
  };







  const handleSubmit = async () => {
    console.log('🔥 handleSubmit called', { 
      cooldownSeconds, 
      isSaving, 
      description: description.trim(), 
      selectedImages: selectedImages.length 
    });
    
    if (cooldownSeconds > 0) {
      console.log('❌ Blocked by cooldown:', cooldownSeconds);
      Alert.alert('Подождите', `Можно создать новый пост через ${cooldownSeconds} секунд`);
      return;
    }
    if (isSaving) {
      console.log('❌ Already saving');
      return;
    }
    
    // Валидация: пост должен иметь либо описание, либо фото
    const hasDescription = description.trim().length > 0;
    const hasPhoto = selectedImages.length > 0;
    
    console.log('📝 Validation:', { hasDescription, hasPhoto });
    
    if (!hasDescription && !hasPhoto) {
      Alert.alert(
        'Недостаточно информации',
        'Добавьте описание или фото для публикации поста',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const submitPost = async () => {
      try {
        console.log('💾 Starting submitPost');
        setIsSaving(true);
        
        // Запускаем ИИ анализ только при сохранении
        console.log('🤖 Running AI analysis');
        await analyzeSeverityWithAI(selectedType, description);
        
        const finalAddress = address || await getAddressFromCoords(latitude, longitude);
        const now = Date.now();
        const postLifetime = POST_LIFETIMES[selectedType];
        
        // Получаем ориентир один раз при создании поста
        const landmark = finalAddress && finalAddress !== 'Неизвестный адрес' 
          ? getLandmarkForAddress(finalAddress) 
          : getRandomLandmark();
        
        const post: DPSPost = {
          id: now.toString(),
          description: description.trim() || 'Без описания',
          latitude,
          longitude,
          address: finalAddress,
          landmark: landmark,
          timestamp: now,
          expiresAt: now + postLifetime,
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Аноним',
          type: selectedType,
          severity: selectedSeverity,
          likes: 0,
          likedBy: [],
          photo: selectedImages.length > 0 ? selectedImages[0] : undefined,
          photos: selectedImages.length > 0 ? selectedImages : undefined,
          needsModeration: true,
          isRelevant: true,
          relevanceCheckedAt: now,
        };
        
        console.log('📤 Calling addPost with:', post);
        const result = await addPost(post);
        console.log('📥 addPost result:', result);
        
        if (result.success) {
          console.log('✅ Post created successfully, navigating to map');
          router.replace('/(tabs)/(map)');
        } else {
          console.log('❌ Post creation failed:', result.error);
          Alert.alert('Ошибка', result.error || 'Не удалось создать пост');
        }
      } catch (error) {
        console.log('💥 Error in submitPost:', error);
        Alert.alert('Ошибка', 'Произошла ошибка при создании поста');
      } finally {
        console.log('🏁 Finishing submitPost');
        setIsSaving(false);
      }
    };
    
    // Check if coordinates are roughly in Kingisepp area (within ~50km)
    const maxDistance = 0.5; // roughly 50km in degrees
    const isNearKingisepp = !(
      Math.abs(latitude - KINGISEPP_CENTER.latitude) > maxDistance ||
      Math.abs(longitude - KINGISEPP_CENTER.longitude) > maxDistance
    );
    
    console.log('📍 Location check:', { 
      latitude, 
      longitude, 
      isNearKingisepp,
      distance: Math.abs(latitude - KINGISEPP_CENTER.latitude) + Math.abs(longitude - KINGISEPP_CENTER.longitude)
    });
    
    if (!isNearKingisepp) {
      console.log('⚠️ Location is far from Kingisepp, showing confirmation');
      Alert.alert(
        'Внимание',
        'Местоположение находится далеко от Кингисеппа. Продолжить?',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Продолжить', onPress: submitPost },
        ]
      );
    } else {
      console.log('✅ Location is near Kingisepp, proceeding with submitPost');
      await submitPost();
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: '',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => {
                console.log('🔘 Save button pressed');
                handleSubmit();
              }}
              disabled={isSaving || cooldownSeconds > 0}
              style={[
                styles.headerSaveButton,
                (isSaving || cooldownSeconds > 0) && styles.headerSaveButtonDisabled
              ]}
            >
              {isSaving ? (
                <View style={styles.saveIndicator}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.savingText}>Сохранение...</Text>
                </View>
              ) : (
                <Text style={[
                  styles.headerSaveButtonText,
                  (cooldownSeconds > 0) && styles.headerSaveButtonTextDisabled
                ]}>
                  {cooldownSeconds > 0 ? `${cooldownSeconds}с` : 'Сохранить'}
                </Text>
              )}
            </TouchableOpacity>
          ),
        }} 
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Post Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Тип события</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {POST_TYPES.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <Animated.View style={{ transform: [{ scale: typeButtonScale }] }}>
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeButton,
                        isSelected && { backgroundColor: type.color, borderColor: type.color }
                      ]}
                      onPress={() => {
                        // Анимация нажатия
                        Animated.sequence([
                          Animated.timing(typeButtonScale, {
                            toValue: 0.95,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                          Animated.timing(typeButtonScale, {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                        ]).start();
                        
                        setSelectedType(type.id);
                      }}
                    >
                      <IconComponent 
                        size={20} 
                        color={isSelected ? '#FFFFFF' : type.color} 
                      />
                      <Text style={[
                        styles.typeButtonText,
                        isSelected && { color: '#FFFFFF' }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={selectedType === 'other' ? "Например: Плохо припаркованная машина, яма на дороге, упавшее дерево" : "Например: Пост ДПС на въезде в город, проверяют документы"}
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
              maxLength={80}
            />
            <Text style={styles.charCount}>{description.length}/80 (макс. 80 символов)</Text>
          </View>

          {/* Photo Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Фото ({selectedImages.length}/5)</Text>
            {selectedImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image 
                      source={{ uri: `data:image/jpeg;base64,${image}` }} 
                      style={styles.selectedImageSmall}
                      resizeMode="cover"
                    />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedImages.length < 5 && (
                  <Animated.View style={{ transform: [{ scale: photoButtonScale }] }}>
                    <TouchableOpacity
                      style={styles.addMoreImageButton}
                      onPress={() => {
                        // Анимация нажатия
                        Animated.sequence([
                          Animated.timing(photoButtonScale, {
                            toValue: 0.95,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                          Animated.timing(photoButtonScale, {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                        ]).start();
                        
                        showImagePicker();
                      }}
                      disabled={isUploadingImage}
                    >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color="#0066FF" />
                    ) : (
                      <Plus size={20} color="#0066FF" />
                    )}
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </ScrollView>
            ) : (
              <Animated.View style={{ transform: [{ scale: photoButtonScale }] }}>
                <TouchableOpacity
                  style={styles.singlePhotoButton}
                  onPress={() => {
                    // Анимация нажатия
                    Animated.sequence([
                      Animated.timing(photoButtonScale, {
                        toValue: 0.95,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(photoButtonScale, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start();
                    
                    showImagePicker();
                  }}
                  disabled={isUploadingImage}
                >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#0066FF" />
                ) : (
                  <Camera size={24} color="#0066FF" />
                )}
                </TouchableOpacity>
              </Animated.View>
            )}
            <Text style={styles.imageHint}>
              Максимум 5 фото • ИИ анализ при сохранении
            </Text>
          </View>

          {/* Compact Severity Display - Hidden but still functional */}
          <View style={styles.hiddenSeverityContainer}>
            {SEVERITY_LEVELS.map((severity) => {
              const isSelected = selectedSeverity === severity.id;
              return (
                <View
                  key={severity.id}
                  style={[
                    styles.hiddenSeverityButton,
                    isSelected && { backgroundColor: severity.color }
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Местоположение</Text>
            
            {isGettingLocation ? (
              <View style={styles.modernLocationLoading}>
                <ActivityIndicator size="small" color="#0066FF" />
                <Text style={styles.modernLocationLoadingText}>Определение местоположения...</Text>
              </View>
            ) : address ? (
              <View style={styles.modernLocationInfo}>
                <View style={styles.locationIconContainer}>
                  <MapPin size={20} color="#0066FF" />
                </View>
                <Text style={styles.modernLocationText}>{address}</Text>
                <TouchableOpacity onPress={() => getCurrentLocation(true)} style={styles.refreshButton}>
                  <RefreshCw size={18} color="#0066FF" />
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: locationButtonScale }] }}>
                <TouchableOpacity
                  style={styles.modernLocationButton}
                  onPress={() => {
                    // Анимация нажатия
                    Animated.sequence([
                      Animated.timing(locationButtonScale, {
                        toValue: 0.95,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(locationButtonScale, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start();
                    
                    getCurrentLocation(true);
                  }}
                  disabled={isGettingLocation}
                >
                <View style={styles.locationIconContainer}>
                  <MapPin size={20} color="#0066FF" />
                </View>
                <Text style={styles.modernLocationButtonText}>
                  Определить текущее местоположение
                </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          <View style={styles.infoBox}>
            <AlertCircle size={16} color="#FF9500" />
            <Text style={styles.infoText}>
              {(() => {
                const lifetime = POST_LIFETIMES[selectedType];
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
              })()
            }
            </Text>
          </View>
        </View>


      </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay
        visible={isSaving || isUploadingImage || isAnalyzingSeverity || isGettingLocation}
        label={isSaving ? 'Сохранение...' : isUploadingImage ? 'Загрузка фото...' : isAnalyzingSeverity ? 'ИИ анализ...' : isGettingLocation ? 'Определение местоположения...' : 'Загрузка...'}
        testID="add-post-loading"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  modernLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#0066FF',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  locationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modernLocationButtonText: {
    fontSize: 16,
    color: '#0066FF',
    fontWeight: '600',
    flex: 1,
  },
  modernLocationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modernLocationLoadingText: {
    fontSize: 16,
    color: '#6C757D',
    flex: 1,
  },
  modernLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernLocationText: {
    fontSize: 15,
    color: '#212529',
    flex: 1,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 4,
  },
  modernAddressContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF',
  },
  modernAddressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontWeight: '500',
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3C43',
  },
  submitButton: {
    backgroundColor: '#0066FF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typeScroll: {
    marginTop: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    gap: 6,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  severityContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  imageContainer: {
    position: 'relative',
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0066FF',
    borderStyle: 'dashed',
    gap: 8,
  },
  singleImagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0066FF',
    borderStyle: 'dashed',
    minHeight: 80,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#0066FF',
    fontWeight: '500',
  },
  imageHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 80,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 80,
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
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  saveText: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '500',
  },
  headerSaveButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSaveButtonTextDisabled: {
    color: '#FFFFFF80',
  },
  headerSaveButtonDisabled: {
    backgroundColor: '#0066FF80',
  },
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalTimer: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0066FF',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#0066FF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalButtonDisabled: {
    backgroundColor: '#A7C3FF',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextDisabled: {
    color: '#F8FAFC',
  },
  headerSaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  photosScroll: {
    marginTop: 8,
  },
  selectedImageSmall: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  addMoreImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0066FF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  hiddenSeverityContainer: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  hiddenSeverityButton: {
    width: 0,
    height: 0,
  },
});