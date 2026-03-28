/**
 * 🧠 SMART AI SYSTEM v3.0.0
 * Полностью новая умная самообучающаяся ИИ-система
 * Создана с нуля для максимальной эффективности
 */

import { prisma } from './prisma';

// Типы для новой ИИ-системы
export interface SmartPost {
  id: string;
  type: string;
  description: string;
  severity: string;
  hasPhoto: boolean;
  photo?: string;
  location?: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface SmartDecision {
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED';
  confidence: number;
  reasoning: string;
  factors: {
    toxicity: number;
    relevance: number;
    quality: number;
    context: number;
    image: number;
  };
  patterns: string[];
  learningData: {
    timeOfDay: string;
    season: string;
    postType: string;
    hasPhoto: boolean;
    descriptionLength: string;
    keywords: string[];
  };
}

export interface LearningPattern {
  id: string;
  type: 'time' | 'type' | 'photo' | 'keyword' | 'context' | 'quality';
  value: string;
  accuracy: number;
  confidence: number;
  samples: number;
  lastUpdated: number;
}

export interface SmartModel {
  version: string;
  intelligence: number; // 0-100
  accuracy: number;
  totalDecisions: number;
  correctDecisions: number;
  patterns: LearningPattern[];
  weights: {
    toxicity: number;
    relevance: number;
    quality: number;
    context: number;
    image: number;
  };
  thresholds: {
    approve: number;
    reject: number;
    moderate: number;
  };
  lastTraining: number;
}

export class SmartAISystem {
  private static instance: SmartAISystem;
  private model: SmartModel;
  private patterns: Map<string, LearningPattern> = new Map();
  private cache: Map<string, { decision: SmartDecision; timestamp: number }> = new Map();
  
  private constructor() {
    this.model = this.initializeModel();
  }

  public static getInstance(): SmartAISystem {
    if (!SmartAISystem.instance) {
      SmartAISystem.instance = new SmartAISystem();
    }
    return SmartAISystem.instance;
  }

  /**
   * Инициализация умной модели
   */
  private initializeModel(): SmartModel {
    return {
      version: '3.0.0',
      intelligence: 0,
      accuracy: 0,
      totalDecisions: 0,
      correctDecisions: 0,
      patterns: [],
      weights: {
        toxicity: 0.40,  // Токсичность - самый важный фактор
        relevance: 0.35, // Релевантность - второй по важности
        quality: 0.10,   // Качество - менее важно (даже короткие посты полезны)
        context: 0.10,   // Контекст - менее важно
        image: 0.05      // Изображение - наименее важно
      },
      thresholds: {
        approve: 0.50,   // Одобряем посты с score >= 0.5 (более лояльно)
        reject: 0.10,    // Отклоняем только явно плохие посты (score <= 0.1)
        moderate: 0.30   // На модерацию только сомнительные посты (0.1 < score < 0.5)
      },
      lastTraining: Date.now()
    };
  }

  /**
   * 🧠 ОСНОВНАЯ ФУНКЦИЯ: Умная модерация поста
   */
  public async moderatePost(post: SmartPost): Promise<SmartDecision> {
    console.log('🧠 SMART AI v3.0.0 analyzing post:', post.type);
    
    try {
      // Проверяем кэш
      const cacheKey = this.generateCacheKey(post);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 минут кэш
        console.log('🎯 Cache hit for smart AI');
        return cached.decision;
      }

      // Собираем данные для анализа
      const learningData = this.extractLearningData(post);
      
      // Выполняем многоуровневый анализ
      const factors = await this.analyzeFactors(post, learningData);
      
      // Применяем умные паттерны
      const patternAdjustments = await this.applySmartPatterns(learningData);
      
      // Вычисляем финальную оценку
      const finalScore = this.calculateFinalScore(factors, patternAdjustments);
      
      // Принимаем решение
      const decision = this.makeSmartDecision(finalScore, factors, learningData);
      
      // Кэшируем результат
      this.cache.set(cacheKey, { decision, timestamp: Date.now() });
      
      // Записываем для обучения
      await this.recordDecision(post, decision);
      
      console.log('🧠 SMART AI Decision:', {
        decision: decision.decision,
        confidence: (decision.confidence * 100).toFixed(1) + '%',
        intelligence: this.model.intelligence
      });
      
      return decision;
      
    } catch (error) {
      console.error('❌ Smart AI error:', error);
      return this.getFallbackDecision(post);
    }
  }

  /**
   * Извлечение данных для обучения
   */
  private extractLearningData(post: SmartPost) {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1;
    
    return {
      timeOfDay: hour >= 6 && hour < 12 ? 'morning' : 
                 hour >= 12 && hour < 18 ? 'day' : 
                 hour >= 18 && hour < 22 ? 'evening' : 'night',
      season: month >= 3 && month <= 5 ? 'spring' : 
              month >= 6 && month <= 8 ? 'summer' : 
              month >= 9 && month <= 11 ? 'autumn' : 'winter',
      postType: post.type,
      hasPhoto: post.hasPhoto,
      descriptionLength: this.getDescriptionLengthCategory(post.description),
      keywords: this.extractKeywords(post.description)
    };
  }

  /**
   * Анализ факторов поста
   */
  private async analyzeFactors(post: SmartPost, learningData: any) {
    const factors = {
      toxicity: await this.analyzeToxicity(post.description),
      relevance: await this.analyzeRelevance(post, learningData),
      quality: await this.analyzeQuality(post, learningData),
      context: await this.analyzeContext(post, learningData),
      image: await this.analyzeImage(post)
    };

    console.log('📊 Factors analysis:', factors);
    return factors;
  }

  /**
   * Анализ токсичности
   */
  private async analyzeToxicity(description: string): Promise<number> {
    const toxicWords = ['спам', 'реклама', 'оскорбление', 'мат', 'ругательство'];
    const text = description.toLowerCase();
    
    let toxicityScore = 0;
    toxicWords.forEach(word => {
      if (text.includes(word)) toxicityScore += 0.5; // Больший штраф за токсичность
    });
    
    // Проверяем длину (только очень длинные могут быть спамом)
    if (description.length > 500) toxicityScore += 0.2; // Увеличили штраф
    
    return Math.min(toxicityScore, 1.0);
  }

  /**
   * Анализ релевантности
   */
  private async analyzeRelevance(post: SmartPost, learningData: any): Promise<number> {
    const roadKeywords = [
      'дпс', 'дтп', 'камера', 'ремонт', 'дорог', 'патруль', 'пробк', 
      'светофор', 'объезд', 'знак', 'машин', 'авто', 'трасс', 'шоссе',
      'стоят', 'сидят', 'есть', 'тут', 'внимание', 'осторожно'
    ];
    
    const text = post.description.toLowerCase();
    let relevanceScore = 0.5; // Базовый score (выше, чем раньше)
    
    roadKeywords.forEach(keyword => {
      if (text.includes(keyword)) relevanceScore += 0.15; // Больший бонус
    });
    
    // Бонус за фото
    if (post.hasPhoto) relevanceScore += 0.2;
    
    // Бонус за местоположение
    if (post.location && post.location !== 'Неизвестный адрес') {
      relevanceScore += 0.1;
    }
    
    return Math.min(relevanceScore, 1.0);
  }

  /**
   * Анализ качества
   */
  private async analyzeQuality(post: SmartPost, learningData: any): Promise<number> {
    let qualityScore = 0.7; // Базовое качество (выше, чем раньше)
    
    // Проверяем длину описания (более лояльно к коротким постам)
    if (post.description.length >= 10) {
      qualityScore += 0.2; // Любой пост с описанием >= 10 символов получает бонус
    }
    
    // Проверяем наличие полезной информации
    const usefulWords = ['сейчас', 'только что', 'внимание', 'осторожно', 'срочно', 'стоят', 'сидят', 'есть', 'тут'];
    const text = post.description.toLowerCase();
    usefulWords.forEach(word => {
      if (text.includes(word)) qualityScore += 0.05; // Меньший бонус
    });
    
    // Проверяем время суток (дневные посты обычно качественнее)
    if (learningData.timeOfDay === 'day' || learningData.timeOfDay === 'morning') {
      qualityScore += 0.05; // Меньший бонус
    }
    
    return Math.min(qualityScore, 1.0);
  }

  /**
   * Анализ контекста
   */
  private async analyzeContext(post: SmartPost, learningData: any): Promise<number> {
    let contextScore = 0.5;
    
    // Анализируем соответствие типа и описания
    const typeKeywords = {
      'roadwork': ['ремонт', 'работа', 'техник', 'асфальт', 'дорожн'],
      'dps': ['дпс', 'полиц', 'патруль', 'пост', 'радар'],
      'accident': ['дтп', 'авария', 'столкновен', 'поврежден'],
      'camera': ['камера', 'фотофиксац', 'радар', 'контрол'],
      'animals': ['животн', 'лос', 'кабан', 'собак', 'кошк']
    };
    
    const keywords = typeKeywords[post.type as keyof typeof typeKeywords] || [];
    const text = post.description.toLowerCase();
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) contextScore += 0.2;
    });
    
    return Math.min(contextScore, 1.0);
  }

  /**
   * Анализ изображения
   */
  private async analyzeImage(post: SmartPost): Promise<number> {
    if (!post.hasPhoto || !post.photo) {
      return 0.5; // Нейтральная оценка без фото
    }
    
    try {
      // Здесь можно добавить реальный анализ изображения
      // Пока используем простую эвристику
      return 0.7; // Предполагаем, что фото обычно полезны
    } catch (error) {
      console.error('Image analysis error:', error);
      return 0.5;
    }
  }

  /**
   * Применение умных паттернов
   */
  private async applySmartPatterns(learningData: any): Promise<Record<string, number>> {
    const adjustments: Record<string, number> = {};
    
    // Ищем паттерны для каждого фактора
    const patternTypes = ['time', 'type', 'photo', 'keyword', 'context'];
    
    for (const type of patternTypes) {
      const patternKey = this.getPatternKey(type, learningData);
      const pattern = this.patterns.get(patternKey);
      
      if (pattern && pattern.samples >= 5) {
        adjustments[type] = pattern.accuracy;
      } else {
        adjustments[type] = 0.5; // Нейтральная оценка
      }
    }
    
    return adjustments;
  }

  /**
   * Вычисление финальной оценки
   */
  private calculateFinalScore(factors: any, patternAdjustments: any): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    // Взвешенная оценка факторов
    Object.keys(factors).forEach(factor => {
      const weight = this.model.weights[factor as keyof typeof this.model.weights];
      const factorScore = factors[factor];
      const patternScore = patternAdjustments[factor] || 0.5;
      
      // Комбинируем фактор и паттерн
      const combinedScore = (factorScore * 0.7) + (patternScore * 0.3);
      
      totalScore += combinedScore * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  /**
   * Принятие умного решения
   */
  private makeSmartDecision(score: number, factors: any, learningData: any): SmartDecision {
    let decision: 'APPROVED' | 'REJECTED' | 'FLAGGED';
    let confidence: number;
    let reasoning: string;
    
    if (score >= this.model.thresholds.approve) {
      decision = 'APPROVED';
      confidence = Math.min(score, 0.95);
      reasoning = 'Высокое качество и релевантность контента';
    } else if (score <= this.model.thresholds.reject) {
      decision = 'REJECTED';
      confidence = Math.max(1 - score, 0.05);
      reasoning = 'Низкое качество или нерелевантный контент';
    } else {
      decision = 'FLAGGED';
      confidence = 0.5;
      reasoning = 'Требует ручной проверки модератора';
    }
    
    // Собираем паттерны для объяснения
    const patterns = this.getRelevantPatterns(learningData);
    
    return {
      decision,
      confidence,
      reasoning,
      factors,
      patterns,
      learningData
    };
  }

  /**
   * Запись решения для обучения
   */
  private async recordDecision(post: SmartPost, decision: SmartDecision): Promise<void> {
    try {
      // Сохраняем в базу данных для обучения
      await prisma.aIModeration.create({
        data: {
          postId: post.id,
          content: post.description,
          imageUrl: post.photo,
          toxicityScore: decision.factors.toxicity,
          relevanceScore: decision.factors.relevance,
          severityScore: decision.factors.quality,
          categoryScore: decision.factors.context,
          detectedLanguage: 'ru',
          keyPhrases: decision.learningData.keywords,
          entities: [],
          decision: decision.decision === 'APPROVED' ? 'APPROVED' : 
                   decision.decision === 'REJECTED' ? 'REJECTED' : 'PENDING',
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          processedAt: new Date()
        }
      });
      
      // Обновляем статистику модели
      this.model.totalDecisions++;
      
    } catch (error) {
      console.error('Error recording decision:', error);
    }
  }

  /**
   * Обучение на основе решений модераторов
   */
  public async learnFromModerator(postId: string, moderatorDecision: 'APPROVED' | 'REJECTED'): Promise<void> {
    try {
      console.log('🧠 Learning from moderator decision:', moderatorDecision);
      
      // Находим наше решение
      const aiDecision = await prisma.aIModeration.findFirst({
        where: { postId }
      });
      
      if (!aiDecision) return;
      
      // Определяем, было ли наше решение правильным
      const wasCorrect = aiDecision.decision === moderatorDecision;
      
      if (wasCorrect) {
        this.model.correctDecisions++;
      }
      
      // Обновляем точность
      this.model.accuracy = this.model.correctDecisions / this.model.totalDecisions;
      
      // Обновляем интеллект
      this.model.intelligence = Math.min(this.model.accuracy * 100, 100);
      
      // Обновляем паттерны
      await this.updatePatterns(aiDecision, wasCorrect);
      
      console.log('🧠 Learning completed. Intelligence:', this.model.intelligence.toFixed(1));
      
    } catch (error) {
      console.error('Error learning from moderator:', error);
    }
  }

  /**
   * Обновление паттернов
   */
  private async updatePatterns(aiDecision: any, wasCorrect: boolean): Promise<void> {
    // Здесь можно добавить логику обновления паттернов
    // на основе решений модераторов
  }

  /**
   * Вспомогательные методы
   */
  private generateCacheKey(post: SmartPost): string {
    return `${post.type}_${post.hasPhoto}_${post.description.length}_${post.userId}`;
  }

  private getDescriptionLengthCategory(description: string): string {
    const length = description.length;
    if (length === 0) return 'empty';
    if (length < 20) return 'short';
    if (length < 100) return 'medium';
    if (length < 300) return 'long';
    return 'very_long';
  }

  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    const text = description.toLowerCase();
    
    const roadKeywords = ['дпс', 'дтп', 'камера', 'ремонт', 'дорог', 'патруль'];
    roadKeywords.forEach(keyword => {
      if (text.includes(keyword)) keywords.push(keyword);
    });
    
    return keywords;
  }

  private getPatternKey(type: string, learningData: any): string {
    switch (type) {
      case 'time': return `time_${learningData.timeOfDay}`;
      case 'type': return `type_${learningData.postType}`;
      case 'photo': return `photo_${learningData.hasPhoto}`;
      case 'keyword': return `keyword_${learningData.keywords.join('_')}`;
      case 'context': return `context_${learningData.timeOfDay}_${learningData.postType}`;
      default: return '';
    }
  }

  private getRelevantPatterns(learningData: any): string[] {
    const patterns: string[] = [];
    
    if (learningData.timeOfDay) patterns.push(`time:${learningData.timeOfDay}`);
    if (learningData.postType) patterns.push(`type:${learningData.postType}`);
    if (learningData.hasPhoto) patterns.push('has_photo');
    if (learningData.keywords.length > 0) patterns.push(`keywords:${learningData.keywords.join(',')}`);
    
    return patterns;
  }

  private getFallbackDecision(post: SmartPost): SmartDecision {
    return {
      decision: 'FLAGGED',
      confidence: 0.5,
      reasoning: 'Ошибка анализа, требуется ручная проверка',
      factors: {
        toxicity: 0.5,
        relevance: 0.5,
        quality: 0.5,
        context: 0.5,
        image: 0.5
      },
      patterns: [],
      learningData: this.extractLearningData(post)
    };
  }

  /**
   * Получение статистики модели
   */
  public getModelStats() {
    return {
      version: this.model.version,
      intelligence: this.model.intelligence,
      accuracy: this.model.accuracy,
      totalDecisions: this.model.totalDecisions,
      correctDecisions: this.model.correctDecisions,
      patternsCount: this.patterns.size,
      lastTraining: this.model.lastTraining
    };
  }
}

// Экспортируем синглтон
export const smartAI = SmartAISystem.getInstance();
