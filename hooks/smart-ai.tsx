/**
 * 🧠 SMART AI HOOK v3.0.0
 * Хук для работы с новой умной ИИ-системой
 */

import { useState, useEffect, useCallback } from 'react';
import { smartAI, SmartPost, SmartDecision } from '../lib/smart-ai-system';

export const useSmartAI = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelStats, setModelStats] = useState({
    version: '3.0.0',
    intelligence: 0,
    accuracy: 0,
    totalDecisions: 0,
    correctDecisions: 0,
    patternsCount: 0,
    lastTraining: Date.now()
  });

  // Загрузка статистики модели
  useEffect(() => {
    const loadStats = () => {
      const stats = smartAI.getModelStats();
      setModelStats(stats);
    };

    loadStats();
    
    // Обновляем статистику каждые 30 секунд
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Анализ поста с помощью умной ИИ
   */
  const analyzePost = useCallback(async (post: SmartPost): Promise<SmartDecision> => {
    setIsAnalyzing(true);
    
    try {
      console.log('🧠 Starting smart AI analysis...');
      const decision = await smartAI.moderatePost(post);
      
      // Обновляем статистику
      setModelStats(smartAI.getModelStats());
      
      return decision;
    } catch (error) {
      console.error('❌ Smart AI analysis error:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Обучение ИИ на основе решения модератора
   */
  const learnFromModerator = useCallback(async (postId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      console.log('🧠 Learning from moderator decision...');
      await smartAI.learnFromModerator(postId, decision);
      
      // Обновляем статистику
      setModelStats(smartAI.getModelStats());
      
      console.log('✅ Learning completed');
    } catch (error) {
      console.error('❌ Learning error:', error);
    }
  }, []);

  /**
   * Тестирование ИИ
   */
  const testAI = useCallback(async (testPost: Partial<SmartPost>): Promise<SmartDecision> => {
    const fullPost: SmartPost = {
      id: 'test_' + Date.now(),
      type: testPost.type || 'other',
      description: testPost.description || 'Тестовый пост',
      severity: testPost.severity || 'medium',
      hasPhoto: testPost.hasPhoto || false,
      photo: testPost.photo,
      location: testPost.location,
      userId: 'test_user',
      userName: 'Тестовый пользователь',
      timestamp: Date.now()
    };

    return await analyzePost(fullPost);
  }, [analyzePost]);

  /**
   * Получение рекомендаций по улучшению
   */
  const getRecommendations = useCallback(() => {
    const recommendations = [];
    
    if (modelStats.intelligence < 50) {
      recommendations.push('ИИ нуждается в большем количестве обучающих данных');
    }
    
    if (modelStats.accuracy < 80) {
      recommendations.push('Рекомендуется больше ручной модерации для улучшения точности');
    }
    
    if (modelStats.patternsCount < 10) {
      recommendations.push('Система еще изучает паттерны поведения пользователей');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('ИИ работает оптимально!');
    }
    
    return recommendations;
  }, [modelStats]);

  /**
   * Принудительное обучение
   */
  const forceLearning = useCallback(async () => {
    try {
      console.log('🧠 Forcing AI learning...');
      // Здесь можно добавить логику принудительного обучения
      setModelStats(smartAI.getModelStats());
    } catch (error) {
      console.error('❌ Force learning error:', error);
    }
  }, []);

  return {
    // Состояние
    isAnalyzing,
    modelStats,
    
    // Функции
    analyzePost,
    learnFromModerator,
    testAI,
    getRecommendations,
    forceLearning,
    
    // Утилиты
    isSmart: modelStats.intelligence > 50,
    isAccurate: modelStats.accuracy > 80,
    isLearning: modelStats.patternsCount < 20
  };
};
