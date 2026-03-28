import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AISettings {
  confidenceThreshold: number; // Порог уверенности для автоодобрения (0-100)
  autoModeration: boolean; // Автоматическая модерация
  fallbackSystem: boolean; // Fallback система
  maxPostsOnMap: number; // Максимум постов на карте
  cacheTimeMinutes: number; // Время кэширования в минутах
  aiEnabled: boolean; // Включен ли ИИ
  strictMode: boolean; // Строгий режим модерации
  learningEnabled: boolean; // Включено ли обучение
}

const DEFAULT_SETTINGS: AISettings = {
  confidenceThreshold: 85,
  autoModeration: true,
  fallbackSystem: true,
  maxPostsOnMap: 55,
  cacheTimeMinutes: 1,
  aiEnabled: true,
  strictMode: false,
  learningEnabled: true,
};

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем настройки при инициализации
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('ai_settings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AISettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('ai_settings', JSON.stringify(updatedSettings));
      
      // Логируем изменение настроек
      console.log('AI Settings updated:', newSettings);
      
      return true;
    } catch (error) {
      console.error('Error saving AI settings:', error);
      return false;
    }
  };

  const updateConfidenceThreshold = async (value: number) => {
    return await saveSettings({ confidenceThreshold: Math.max(0, Math.min(100, value)) });
  };

  const toggleAutoModeration = async () => {
    return await saveSettings({ autoModeration: !settings.autoModeration });
  };

  const toggleFallbackSystem = async () => {
    return await saveSettings({ fallbackSystem: !settings.fallbackSystem });
  };

  const updateMaxPosts = async (value: number) => {
    return await saveSettings({ maxPostsOnMap: Math.max(1, Math.min(200, value)) });
  };

  const updateCacheTime = async (value: number) => {
    return await saveSettings({ cacheTimeMinutes: Math.max(1, Math.min(60, value)) });
  };

  const toggleAI = async () => {
    return await saveSettings({ aiEnabled: !settings.aiEnabled });
  };

  const toggleStrictMode = async () => {
    return await saveSettings({ strictMode: !settings.strictMode });
  };

  const toggleLearning = async () => {
    return await saveSettings({ learningEnabled: !settings.learningEnabled });
  };

  const resetToDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem('ai_settings', JSON.stringify(DEFAULT_SETTINGS));
    console.log('AI Settings reset to defaults');
  };

  // Тестирование ИИ
  const testAI = async (testText: string) => {
    try {
      // Имитируем тест ИИ
      const confidence = Math.random() * 100;
      const decision = confidence >= settings.confidenceThreshold ? 'approve' : 'reject';
      
      return {
        success: true,
        result: {
          decision,
          confidence: Math.round(confidence),
          reasoning: decision === 'approve' 
            ? 'Текст содержит дорожную информацию'
            : 'Текст не содержит дорожной информации',
          settings: settings
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Ошибка тестирования ИИ'
      };
    }
  };

  // Получение рекомендаций по настройкам
  const getRecommendations = () => {
    const recommendations = [];
    
    if (settings.confidenceThreshold < 70) {
      recommendations.push({
        type: 'warning',
        message: 'Низкий порог уверенности может привести к ложным одобрениям'
      });
    }
    
    if (settings.maxPostsOnMap > 100) {
      recommendations.push({
        type: 'info',
        message: 'Большое количество постов может замедлить работу карты'
      });
    }
    
    if (settings.cacheTimeMinutes > 10) {
      recommendations.push({
        type: 'info',
        message: 'Долгое кэширование может показывать устаревшие данные'
      });
    }
    
    if (!settings.fallbackSystem) {
      recommendations.push({
        type: 'warning',
        message: 'Отключение fallback системы может привести к ошибкам'
      });
    }
    
    return recommendations;
  };

  return {
    settings,
    isLoading,
    updateConfidenceThreshold,
    toggleAutoModeration,
    toggleFallbackSystem,
    updateMaxPosts,
    updateCacheTime,
    toggleAI,
    toggleStrictMode,
    toggleLearning,
    resetToDefaults,
    testAI,
    getRecommendations,
    saveSettings,
  };
}
