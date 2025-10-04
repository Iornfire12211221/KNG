import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AITrainingData, AIModelStats, DPSPost } from '@/types';

const INITIAL_MODEL_STATS: AIModelStats = {
  totalDecisions: 0,
  correctDecisions: 0,
  falsePositives: 0,
  falseNegatives: 0,
  accuracy: 0,
  lastTrainingDate: Date.now(),
  modelVersion: '2.0.0' // Умная самообучающаяся версия
};

const TRAINING_INTERVAL = 5 * 60 * 1000; // 5 минут - очень частое обучение
const MIN_TRAINING_SAMPLES = 5; // Минимум для быстрого обучения
const ADVANCED_TRAINING_SAMPLES = 50; // Для продвинутого обучения

export const [AILearningProvider, useAILearning] = createContextHook(() => {
  const [trainingData, setTrainingData] = useState<AITrainingData[]>([]);
  const [modelStats, setModelStats] = useState<AIModelStats>(INITIAL_MODEL_STATS);
  const [isTraining, setIsTraining] = useState(false);
  const lastSyncTimeRef = useRef(0);

  // Загрузка данных обучения
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedTraining, storedStats] = await Promise.all([
          AsyncStorage.getItem('ai_training_data'),
          AsyncStorage.getItem('ai_model_stats')
        ]);

        if (storedTraining) {
          const parsed = JSON.parse(storedTraining);
          setTrainingData(parsed.slice(-1000)); // Храним только последние 1000 записей
        }

        if (storedStats) {
          setModelStats(JSON.parse(storedStats));
        }
      } catch (error) {
        console.error('Error loading AI training data:', error);
      }
    };

    loadData();
  }, []);

  // Сохранение данных обучения
  const saveTrainingData = useCallback(async (data: AITrainingData[]) => {
    try {
      await AsyncStorage.setItem('ai_training_data', JSON.stringify(data.slice(-1000)));
    } catch (error) {
      console.error('Error saving training data:', error);
    }
  }, []);

  // Сохранение статистики модели
  const saveModelStats = useCallback(async (stats: AIModelStats) => {
    try {
      await AsyncStorage.setItem('ai_model_stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving model stats:', error);
    }
  }, []);

  // Определение времени суток
  const getTimeOfDay = useCallback((hour: number): 'morning' | 'day' | 'evening' | 'night' => {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }, []);

  // Определение сезона
  const getSeason = useCallback((month: number): 'winter' | 'spring' | 'summer' | 'autumn' => {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }, []);

  // Умное обучение модели с машинным обучением
  const trainModelInternal = useCallback(async (data: AITrainingData[]) => {
    if (isTraining) return;
    
    setIsTraining(true);
    console.log('🧠 Starting SMART AI model training with', data.length, 'samples');

    try {
      // Фильтруем данные с решениями модераторов
      const labeledData = data.filter(item => item.moderatorDecision);
      
      if (labeledData.length < MIN_TRAINING_SAMPLES) {
        console.log('Not enough labeled data for training');
        setIsTraining(false);
        return;
      }

      // УМНЫЕ ПАТТЕРНЫ - расширенный анализ
      const smartPatterns = {
        // Базовые паттерны
        timePatterns: {} as Record<string, { correct: number; total: number; confidence: number }>,
        typePatterns: {} as Record<string, { correct: number; total: number; confidence: number }>,
        photoPatterns: { withPhoto: { correct: 0, total: 0, confidence: 0 }, withoutPhoto: { correct: 0, total: 0, confidence: 0 } },
        seasonPatterns: {} as Record<string, { correct: number; total: number; confidence: number }>,
        
        // НОВЫЕ УМНЫЕ ПАТТЕРНЫ
        confidencePatterns: {} as Record<string, { correct: number; total: number }>, // По уровням уверенности
        descriptionLengthPatterns: {} as Record<string, { correct: number; total: number }>, // По длине описания
        keywordPatterns: {} as Record<string, { correct: number; total: number }>, // По ключевым словам
        userBehaviorPatterns: {} as Record<string, { correct: number; total: number }>, // По поведению пользователей
        contextPatterns: {} as Record<string, { correct: number; total: number }>, // По контексту
        errorPatterns: {} as Record<string, { correct: number; total: number }>, // Паттерны ошибок
        successPatterns: {} as Record<string, { correct: number; total: number }> // Паттерны успеха
      };

      // Анализируем каждый пример для обучения
      labeledData.forEach(item => {
        const wasCorrect = 
          (item.aiDecision === 'approve' && item.moderatorDecision === 'approved') ||
          (item.aiDecision === 'reject' && item.moderatorDecision === 'rejected');

        // Базовые паттерны с улучшенной логикой
        updatePattern(smartPatterns.timePatterns, item.timeOfDay, wasCorrect);
        updatePattern(smartPatterns.typePatterns, item.postType, wasCorrect);
        updatePattern(smartPatterns.seasonPatterns, item.season, wasCorrect);
        
        const photoKey = item.hasPhoto ? 'withPhoto' : 'withoutPhoto';
        smartPatterns.photoPatterns[photoKey].total++;
        if (wasCorrect) smartPatterns.photoPatterns[photoKey].correct++;

        // НОВЫЕ УМНЫЕ АНАЛИЗЫ
        
        // 1. Анализ по уровню уверенности ИИ
        const confidenceLevel = getConfidenceLevel(item.aiConfidence);
        updatePattern(smartPatterns.confidencePatterns, confidenceLevel, wasCorrect);

        // 2. Анализ по длине описания
        const descLength = getDescriptionLengthCategory(item.description);
        updatePattern(smartPatterns.descriptionLengthPatterns, descLength, wasCorrect);

        // 3. Анализ ключевых слов
        const keywords = extractKeywords(item.description);
        keywords.forEach(keyword => {
          updatePattern(smartPatterns.keywordPatterns, keyword, wasCorrect);
        });

        // 4. Анализ контекста (время + тип + фото)
        const context = `${item.timeOfDay}_${item.postType}_${item.hasPhoto ? 'photo' : 'no_photo'}`;
        updatePattern(smartPatterns.contextPatterns, context, wasCorrect);

        // 5. Анализ ошибок и успехов
        if (wasCorrect) {
          const successPattern = `${item.postType}_${item.timeOfDay}_success`;
          updatePattern(smartPatterns.successPatterns, successPattern, true);
        } else {
          const errorPattern = `${item.postType}_${item.timeOfDay}_error`;
          updatePattern(smartPatterns.errorPatterns, errorPattern, true);
        }
      });

      // Вычисляем уверенность для каждого паттерна
      calculatePatternConfidence(smartPatterns);

      // Сохраняем умные паттерны
      await AsyncStorage.setItem('ai_smart_patterns', JSON.stringify(smartPatterns));
      await AsyncStorage.setItem('ai_learned_patterns', JSON.stringify(smartPatterns)); // Для совместимости

      // Создаем умную модель с адаптивными весами
      const smartModel = createSmartModel(smartPatterns, labeledData);
      await AsyncStorage.setItem('ai_smart_model', JSON.stringify(smartModel));

      // Обновляем версию модели с учетом "умности"
      const intelligenceLevel = Math.min(Math.floor(labeledData.length / 10), 10);
      const newVersion = `2.${intelligenceLevel}.${labeledData.length % 100}`;
      
      const updatedStats: AIModelStats = {
        ...modelStats,
        totalDecisions: modelStats.totalDecisions + labeledData.length,
        correctDecisions: modelStats.correctDecisions + labeledData.filter(item => 
          (item.aiDecision === 'approve' && item.moderatorDecision === 'approved') ||
          (item.aiDecision === 'reject' && item.moderatorDecision === 'rejected')
        ).length,
        lastTrainingDate: Date.now(),
        modelVersion: newVersion,
        accuracy: modelStats.totalDecisions > 0 
          ? ((modelStats.correctDecisions + labeledData.filter(item => 
              (item.aiDecision === 'approve' && item.moderatorDecision === 'approved') ||
              (item.aiDecision === 'reject' && item.moderatorDecision === 'rejected')
            ).length) / (modelStats.totalDecisions + labeledData.length)) * 100
          : 0
      };

      setModelStats(updatedStats);
      await saveModelStats(updatedStats);
      lastSyncTimeRef.current = Date.now();

      console.log('🧠 SMART AI model training completed!');
      console.log('📊 New version:', newVersion);
      console.log('🎯 Intelligence level:', intelligenceLevel);
      console.log('📈 Accuracy:', updatedStats.accuracy.toFixed(1) + '%');
      console.log('🔍 Learned patterns:', Object.keys(smartPatterns).length);
      
    } catch (error) {
      console.error('❌ Error training SMART AI model:', error);
    } finally {
      setIsTraining(false);
    }
  }, [isTraining, modelStats, saveModelStats]);

  // Вспомогательные функции для умного обучения
  const updatePattern = (patterns: Record<string, { correct: number; total: number }>, key: string, wasCorrect: boolean) => {
    if (!patterns[key]) {
      patterns[key] = { correct: 0, total: 0 };
    }
    patterns[key].total++;
    if (wasCorrect) patterns[key].correct++;
  };

  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.7) return 'medium_high';
    if (confidence >= 0.6) return 'medium';
    if (confidence >= 0.5) return 'medium_low';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  };

  const getDescriptionLengthCategory = (description: string): string => {
    const length = description.length;
    if (length === 0) return 'empty';
    if (length < 20) return 'very_short';
    if (length < 50) return 'short';
    if (length < 100) return 'medium';
    if (length < 200) return 'long';
    return 'very_long';
  };

  const extractKeywords = (description: string): string[] => {
    const keywords = [];
    const text = description.toLowerCase();
    
    // Дорожные ключевые слова
    const roadKeywords = ['дпс', 'дтп', 'камера', 'ремонт', 'дорог', 'патруль', 'пробк', 'светофор', 'объезд', 'знак', 'машин', 'авто'];
    roadKeywords.forEach(keyword => {
      if (text.includes(keyword)) keywords.push(`road_${keyword}`);
    });

    // Эмоциональные слова
    const emotionalWords = ['срочно', 'внимание', 'осторожно', 'опасно', 'быстро', 'медленно'];
    emotionalWords.forEach(word => {
      if (text.includes(word)) keywords.push(`emotion_${word}`);
    });

    // Временные слова
    const timeWords = ['сейчас', 'только что', 'недавно', 'сегодня', 'вчера'];
    timeWords.forEach(word => {
      if (text.includes(word)) keywords.push(`time_${word}`);
    });

    return keywords;
  };

  const calculatePatternConfidence = (patterns: any) => {
    Object.keys(patterns).forEach(patternType => {
      if (typeof patterns[patternType] === 'object' && patterns[patternType] !== null) {
        Object.keys(patterns[patternType]).forEach(key => {
          const pattern = patterns[patternType][key];
          if (pattern.total > 0) {
            pattern.confidence = pattern.correct / pattern.total;
          }
        });
      }
    });
  };

  const createSmartModel = (patterns: any, data: AITrainingData[]) => {
    return {
      version: '2.0.0',
      trainedAt: Date.now(),
      sampleCount: data.length,
      patterns: patterns,
      weights: {
        timeWeight: 0.2,
        typeWeight: 0.3,
        photoWeight: 0.2,
        confidenceWeight: 0.15,
        contextWeight: 0.15
      },
      thresholds: {
        approveThreshold: 0.75,
        rejectThreshold: 0.25,
        moderateThreshold: 0.5
      }
    };
  };

  // Запись решения ИИ
  const recordAIDecision = useCallback(
    async (
      post: DPSPost,
      aiDecision: 'approve' | 'reject',
      confidence: number
    ) => {
      const now = new Date();
      const newRecord: AITrainingData = {
        id: `training_${Date.now()}_${Math.random()}`,
        postId: post.id,
        postType: post.type,
        description: post.description.slice(0, 200),
        hasPhoto: !!post.photo,
        aiDecision,
        aiConfidence: confidence,
        timestamp: Date.now(),
        timeOfDay: getTimeOfDay(now.getHours()),
        season: getSeason(now.getMonth() + 1)
      };

      const updatedData = [...trainingData, newRecord];
      setTrainingData(updatedData);
      await saveTrainingData(updatedData);

      // Обновляем статистику
      const updatedStats = {
        ...modelStats,
        totalDecisions: modelStats.totalDecisions + 1
      };
      setModelStats(updatedStats);
      await saveModelStats(updatedStats);
    },
    [trainingData, modelStats, getTimeOfDay, getSeason, saveTrainingData, saveModelStats]
  );

  // Запись решения модератора
  const recordModeratorDecision = useCallback(
    async (postId: string, decision: 'approved' | 'rejected') => {
      const updatedData = trainingData.map(item => {
        if (item.postId === postId && !item.moderatorDecision) {
          const wasCorrect = 
            (item.aiDecision === 'approve' && decision === 'approved') ||
            (item.aiDecision === 'reject' && decision === 'rejected');

          // Обновляем статистику
          const updatedStats = {
            ...modelStats,
            correctDecisions: wasCorrect 
              ? modelStats.correctDecisions + 1 
              : modelStats.correctDecisions,
            falsePositives: !wasCorrect && item.aiDecision === 'approve'
              ? modelStats.falsePositives + 1
              : modelStats.falsePositives,
            falseNegatives: !wasCorrect && item.aiDecision === 'reject'
              ? modelStats.falseNegatives + 1
              : modelStats.falseNegatives,
            accuracy: modelStats.totalDecisions > 0
              ? ((wasCorrect ? modelStats.correctDecisions + 1 : modelStats.correctDecisions) / 
                 modelStats.totalDecisions) * 100
              : 0
          };
          setModelStats(updatedStats);
          saveModelStats(updatedStats);

          return { ...item, moderatorDecision: decision };
        }
        return item;
      });

      setTrainingData(updatedData);
      await saveTrainingData(updatedData);

      // Проверяем, нужно ли запустить обучение
      if (updatedData.length >= MIN_TRAINING_SAMPLES && 
          Date.now() - lastSyncTimeRef.current > TRAINING_INTERVAL) {
        await trainModelInternal(updatedData);
      }
    },
    [trainingData, modelStats, saveTrainingData, saveModelStats, trainModelInternal]
  );

  // Запись обратной связи от пользователя
  const recordUserFeedback = useCallback(
    async (postId: string, feedback: 'positive' | 'negative') => {
      const updatedData = trainingData.map(item => {
        if (item.postId === postId) {
          return { ...item, userFeedback: feedback };
        }
        return item;
      });

      setTrainingData(updatedData);
      await saveTrainingData(updatedData);
    },
    [trainingData, saveTrainingData]
  );

  // Получение УМНОГО решения на основе машинного обучения
  const getEnhancedDecision = useCallback(async (
    baseDecision: 'approve' | 'reject',
    confidence: number,
    postType: string,
    hasPhoto: boolean,
    description?: string
  ): Promise<{ decision: 'approve' | 'reject'; confidence: number; reasoning?: string }> => {
    try {
      // Загружаем умную модель
      const [smartModelStr, patternsStr] = await Promise.all([
        AsyncStorage.getItem('ai_smart_model'),
        AsyncStorage.getItem('ai_smart_patterns')
      ]);

      if (!smartModelStr || !patternsStr) {
        return { decision: baseDecision, confidence, reasoning: 'No smart model available' };
      }

      const smartModel = JSON.parse(smartModelStr);
      const patterns = JSON.parse(patternsStr);
      const now = new Date();
      const timeOfDay = getTimeOfDay(now.getHours());
      const season = getSeason(now.getMonth() + 1);

      console.log('🧠 Using SMART AI decision making...');

      // УМНЫЙ АНАЛИЗ с весами
      let smartScore = 0;
      let totalWeight = 0;
      const reasoning: string[] = [];

      // 1. Анализ по времени суток (вес 0.2)
      if (patterns.timePatterns[timeOfDay]) {
        const timeConfidence = patterns.timePatterns[timeOfDay].confidence || 0.5;
        smartScore += timeConfidence * smartModel.weights.timeWeight;
        totalWeight += smartModel.weights.timeWeight;
        reasoning.push(`Time pattern: ${(timeConfidence * 100).toFixed(1)}%`);
      }

      // 2. Анализ по типу поста (вес 0.3)
      if (patterns.typePatterns[postType]) {
        const typeConfidence = patterns.typePatterns[postType].confidence || 0.5;
        smartScore += typeConfidence * smartModel.weights.typeWeight;
        totalWeight += smartModel.weights.typeWeight;
        reasoning.push(`Type pattern: ${(typeConfidence * 100).toFixed(1)}%`);
      }

      // 3. Анализ по наличию фото (вес 0.2)
      const photoKey = hasPhoto ? 'withPhoto' : 'withoutPhoto';
      if (patterns.photoPatterns[photoKey].total > 0) {
        const photoConfidence = patterns.photoPatterns[photoKey].confidence || 0.5;
        smartScore += photoConfidence * smartModel.weights.photoWeight;
        totalWeight += smartModel.weights.photoWeight;
        reasoning.push(`Photo pattern: ${(photoConfidence * 100).toFixed(1)}%`);
      }

      // 4. Анализ по уровню уверенности (вес 0.15)
      const confidenceLevel = getConfidenceLevel(confidence);
      if (patterns.confidencePatterns[confidenceLevel]) {
        const confPatternConfidence = patterns.confidencePatterns[confidenceLevel].correct / patterns.confidencePatterns[confidenceLevel].total;
        smartScore += confPatternConfidence * smartModel.weights.confidenceWeight;
        totalWeight += smartModel.weights.confidenceWeight;
        reasoning.push(`Confidence pattern: ${(confPatternConfidence * 100).toFixed(1)}%`);
      }

      // 5. Анализ контекста (вес 0.15)
      const context = `${timeOfDay}_${postType}_${hasPhoto ? 'photo' : 'no_photo'}`;
      if (patterns.contextPatterns[context]) {
        const contextConfidence = patterns.contextPatterns[context].correct / patterns.contextPatterns[context].total;
        smartScore += contextConfidence * smartModel.weights.contextWeight;
        totalWeight += smartModel.weights.contextWeight;
        reasoning.push(`Context pattern: ${(contextConfidence * 100).toFixed(1)}%`);
      }

      // 6. Анализ ключевых слов (если есть описание)
      if (description) {
        const keywords = extractKeywords(description);
        let keywordScore = 0;
        let keywordCount = 0;
        
        keywords.forEach(keyword => {
          if (patterns.keywordPatterns[keyword]) {
            const keywordConfidence = patterns.keywordPatterns[keyword].correct / patterns.keywordPatterns[keyword].total;
            keywordScore += keywordConfidence;
            keywordCount++;
          }
        });
        
        if (keywordCount > 0) {
          const avgKeywordConfidence = keywordScore / keywordCount;
          smartScore += avgKeywordConfidence * 0.1; // Дополнительный вес 0.1
          totalWeight += 0.1;
          reasoning.push(`Keywords: ${(avgKeywordConfidence * 100).toFixed(1)}%`);
        }
      }

      // 7. Анализ длины описания
      if (description) {
        const descLength = getDescriptionLengthCategory(description);
        if (patterns.descriptionLengthPatterns[descLength]) {
          const lengthConfidence = patterns.descriptionLengthPatterns[descLength].correct / patterns.descriptionLengthPatterns[descLength].total;
          smartScore += lengthConfidence * 0.05; // Дополнительный вес 0.05
          totalWeight += 0.05;
          reasoning.push(`Length pattern: ${(lengthConfidence * 100).toFixed(1)}%`);
        }
      }

      // Вычисляем финальную умную уверенность
      const smartConfidence = totalWeight > 0 ? smartScore / totalWeight : confidence;
      
      // Применяем умные пороги
      let finalDecision = baseDecision;
      let finalConfidence = smartConfidence;

      if (smartConfidence >= smartModel.thresholds.approveThreshold) {
        finalDecision = 'approve';
        finalConfidence = Math.min(smartConfidence, 0.95);
      } else if (smartConfidence <= smartModel.thresholds.rejectThreshold) {
        finalDecision = 'reject';
        finalConfidence = Math.max(1 - smartConfidence, 0.05);
      } else {
        // Средняя зона - используем исходное решение с корректировкой
        finalConfidence = smartConfidence;
      }

      console.log('🧠 SMART AI Decision:', {
        baseDecision,
        smartConfidence: (smartConfidence * 100).toFixed(1) + '%',
        finalDecision,
        finalConfidence: (finalConfidence * 100).toFixed(1) + '%',
        reasoning: reasoning.join(', ')
      });

      return { 
        decision: finalDecision, 
        confidence: finalConfidence,
        reasoning: `Smart analysis: ${reasoning.join(', ')}`
      };
    } catch (error) {
      console.error('❌ Error getting SMART decision:', error);
      return { decision: baseDecision, confidence, reasoning: 'Smart analysis failed' };
    }
  }, [getTimeOfDay, getSeason]);

  // Функция для ручного запуска обучения
  const trainModel = useCallback(() => {
    return trainModelInternal(trainingData);
  }, [trainModelInternal, trainingData]);

  // АВТОМАТИЧЕСКОЕ САМООБУЧЕНИЕ - очень частое и умное
  useEffect(() => {
    const interval = setInterval(() => {
      const labeledData = trainingData.filter(item => item.moderatorDecision);
      
      // Быстрое обучение при малом количестве данных
      if (labeledData.length >= MIN_TRAINING_SAMPLES && 
          Date.now() - lastSyncTimeRef.current > TRAINING_INTERVAL) {
        console.log('🤖 Auto-training triggered:', labeledData.length, 'samples');
        trainModelInternal(trainingData);
      }
      
      // Продвинутое обучение при большом количестве данных
      if (labeledData.length >= ADVANCED_TRAINING_SAMPLES && 
          Date.now() - lastSyncTimeRef.current > TRAINING_INTERVAL * 2) {
        console.log('🧠 Advanced auto-training triggered:', labeledData.length, 'samples');
        trainModelInternal(trainingData);
      }
    }, TRAINING_INTERVAL); // Каждые 5 минут

    return () => clearInterval(interval);
  }, [trainingData, trainModelInternal]);

  // ДОПОЛНИТЕЛЬНОЕ САМООБУЧЕНИЕ при каждом новом решении модератора
  useEffect(() => {
    const labeledData = trainingData.filter(item => item.moderatorDecision);
    if (labeledData.length >= MIN_TRAINING_SAMPLES && 
        labeledData.length % 5 === 0 && // Каждые 5 новых решений
        Date.now() - lastSyncTimeRef.current > 30 * 1000) { // Минимум 30 секунд между обучениями
      console.log('⚡ Quick self-learning triggered:', labeledData.length, 'samples');
      trainModelInternal(trainingData);
    }
  }, [trainingData, trainModelInternal]);

  // Очистка старых данных
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentData = trainingData.filter(item => item.timestamp > oneWeekAgo);
      
      if (recentData.length < trainingData.length) {
        setTrainingData(recentData);
        saveTrainingData(recentData);
      }
    }, 24 * 60 * 60 * 1000); // Раз в день

    return () => clearInterval(cleanupInterval);
  }, [trainingData, saveTrainingData]);

  return useMemo(
    () => ({
      trainingData,
      modelStats,
      isTraining,
      recordAIDecision,
      recordModeratorDecision,
      recordUserFeedback,
      getEnhancedDecision,
      trainModel
    }),
    [
      trainingData,
      modelStats,
      isTraining,
      recordAIDecision,
      recordModeratorDecision,
      recordUserFeedback,
      getEnhancedDecision,
      trainModel
    ]
  );
});