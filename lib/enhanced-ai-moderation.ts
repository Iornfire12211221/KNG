/**
 * Улучшенная ИИ-модерация для дорожных происшествий
 * Оптимизирована для маленького города (Кингисепп)
 */

import { prisma } from './prisma';

export interface ModerationResult {
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED';
  confidence: number;
  reasoning: string;
  toxicityScore?: number;
  relevanceScore?: number;
  severityScore?: number;
  categoryScore?: number;
  detectedLanguage?: string;
  keyPhrases?: string[];
  entities?: string[];
  processingTime?: number;
}

export interface PostAnalysis {
  type: string;
  description: string;
  severity: string;
  hasPhoto: boolean;
  location?: string;
}

export class EnhancedAIModeration {
  private static readonly API_URL = 'https://toolkit.rork.com/text/llm/';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш
  private static cache = new Map<string, { result: ModerationResult; timestamp: number }>();

  /**
   * Основная функция модерации поста
   */
  static async moderatePost(post: PostAnalysis): Promise<ModerationResult> {
    const startTime = Date.now();
    
    try {
      // Проверяем кэш
      const cacheKey = this.generateCacheKey(post);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`🎯 Cache hit for post moderation`);
        return cached;
      }

      // Выполняем многоуровневый анализ
      const result = await this.performMultiLevelAnalysis(post);
      
      // Сохраняем в кэш
      this.setCache(cacheKey, result);
      
      // Сохраняем результат в базу данных
      await this.saveModerationResult(post, result);
      
      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;
      
      console.log(`✅ Post moderated: ${result.decision} (${processingTime}ms, confidence: ${result.confidence})`);
      
      return result;
      
    } catch (error) {
      console.error('❌ AI moderation error:', error);
      
      // Fallback: простая эвристическая модерация
      return this.fallbackModeration(post);
    }
  }

  /**
   * Многоуровневый анализ поста
   */
  private static async performMultiLevelAnalysis(post: PostAnalysis): Promise<ModerationResult> {
    // Уровень 1: Быстрая проверка на спам и токсичность
    const toxicityCheck = await this.checkToxicity(post.description);
    if (toxicityCheck.toxicityScore > 0.8) {
      return {
        decision: 'REJECTED',
        confidence: 0.9,
        reasoning: 'Высокий уровень токсичности контента',
        toxicityScore: toxicityCheck.toxicityScore,
        relevanceScore: 0.1,
        severityScore: 0.1,
        categoryScore: 0.1,
        detectedLanguage: toxicityCheck.language,
        keyPhrases: toxicityCheck.keyPhrases,
        entities: []
      };
    }

    // Уровень 2: Анализ релевантности для дорожных происшествий
    const relevanceCheck = await this.checkRelevance(post);
    if (relevanceCheck.relevanceScore < 0.3) {
      return {
        decision: 'REJECTED',
        confidence: 0.8,
        reasoning: 'Контент не относится к дорожным происшествиям',
        toxicityScore: toxicityCheck.toxicityScore,
        relevanceScore: relevanceCheck.relevanceScore,
        severityScore: 0.1,
        categoryScore: 0.1,
        detectedLanguage: toxicityCheck.language,
        keyPhrases: [...toxicityCheck.keyPhrases, ...relevanceCheck.keyPhrases],
        entities: relevanceCheck.entities
      };
    }

    // Уровень 3: Детальный анализ серьезности и категоризации
    const detailedAnalysis = await this.performDetailedAnalysis(post);
    
    // Принимаем решение на основе всех факторов
    const decision = this.makeDecision({
      toxicity: toxicityCheck.toxicityScore,
      relevance: relevanceCheck.relevanceScore,
      severity: detailedAnalysis.severityScore,
      category: detailedAnalysis.categoryScore
    });

    return {
      decision: decision.decision,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      toxicityScore: toxicityCheck.toxicityScore,
      relevanceScore: relevanceCheck.relevanceScore,
      severityScore: detailedAnalysis.severityScore,
      categoryScore: detailedAnalysis.categoryScore,
      detectedLanguage: toxicityCheck.language,
      keyPhrases: [...toxicityCheck.keyPhrases, ...relevanceCheck.keyPhrases, ...detailedAnalysis.keyPhrases],
      entities: [...relevanceCheck.entities, ...detailedAnalysis.entities]
    };
  }

  /**
   * Проверка токсичности контента
   */
  private static async checkToxicity(text: string): Promise<{
    toxicityScore: number;
    language: string;
    keyPhrases: string[];
  }> {
    const prompt = `
Проанализируй текст на токсичность и определи язык:

Текст: "${text}"

Оцени:
1. Токсичность (0-1): оскорбления, угрозы, разжигание ненависти
2. Язык: ru/en/other
3. Ключевые фразы: выдели основные слова/фразы

Ответ в JSON:
{
  "toxicityScore": число от 0 до 1,
  "language": "ru",
  "keyPhrases": ["фраза1", "фраза2"]
}

Правила:
- 0.0-0.3: Низкая токсичность
- 0.3-0.7: Средняя токсичность  
- 0.7-1.0: Высокая токсичность
`;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  /**
   * Проверка релевантности для дорожных происшествий
   */
  private static async checkRelevance(post: PostAnalysis): Promise<{
    relevanceScore: number;
    keyPhrases: string[];
    entities: string[];
  }> {
    const prompt = `
Проанализируй, насколько пост относится к дорожным происшествиям в Кингисеппе:

Тип: ${post.type}
Описание: ${post.description}
Серьезность: ${post.severity}
Фото: ${post.hasPhoto ? 'Да' : 'Нет'}
Местоположение: ${post.location || 'Не указано'}

Оцени релевантность (0-1) и выдели:
1. Ключевые фразы о дороге/транспорте
2. Сущности: места, события, объекты

Ответ в JSON:
{
  "relevanceScore": число от 0 до 1,
  "keyPhrases": ["фраза1", "фраза2"],
  "entities": ["место1", "событие1"]
}

Релевантные темы:
- ДПС, полиция, патруль
- ДТП, аварии, столкновения
- Камеры, радары, контроль скорости
- Дорожные работы, ремонт
- Пробки, заторы
- Животные на дороге
- Погодные условия
- Знаки, светофоры
`;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  /**
   * Детальный анализ серьезности и категоризации
   */
  private static async performDetailedAnalysis(post: PostAnalysis): Promise<{
    severityScore: number;
    categoryScore: number;
    keyPhrases: string[];
    entities: string[];
  }> {
    const prompt = `
Проанализируй серьезность и точность категоризации:

Тип: ${post.type}
Описание: ${post.description}
Серьезность: ${post.severity}

Оцени:
1. Серьезность (0-1): насколько критично происшествие
2. Категоризация (0-1): насколько точно выбран тип
3. Дополнительные ключевые фразы
4. Дополнительные сущности

Ответ в JSON:
{
  "severityScore": число от 0 до 1,
  "categoryScore": число от 0 до 1,
  "keyPhrases": ["фраза1", "фраза2"],
  "entities": ["сущность1", "сущность2"]
}

Критерии серьезности:
- 0.0-0.3: Низкая (обычные посты ДПС, камеры)
- 0.3-0.7: Средняя (пробки, ремонт дорог)
- 0.7-1.0: Высокая (ДТП, экстренные ситуации)
`;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  /**
   * Принятие решения на основе анализа
   */
  private static makeDecision(scores: {
    toxicity: number;
    relevance: number;
    severity: number;
    category: number;
  }): { decision: 'APPROVED' | 'REJECTED' | 'FLAGGED'; confidence: number; reasoning: string } {
    
    // Высокая токсичность = отклонение
    if (scores.toxicity > 0.7) {
      return {
        decision: 'REJECTED',
        confidence: 0.9,
        reasoning: 'Содержит токсичный контент'
      };
    }

    // Низкая релевантность = отклонение
    if (scores.relevance < 0.3) {
      return {
        decision: 'REJECTED',
        confidence: 0.8,
        reasoning: 'Не относится к дорожным происшествиям'
      };
    }

    // Высокая релевантность + низкая токсичность = одобрение
    if (scores.relevance > 0.7 && scores.toxicity < 0.3) {
      return {
        decision: 'APPROVED',
        confidence: 0.9,
        reasoning: 'Качественный контент о дорожной ситуации'
      };
    }

    // Средние показатели = флаг для ручной проверки
    if (scores.relevance > 0.5 && scores.toxicity < 0.5) {
      return {
        decision: 'FLAGGED',
        confidence: 0.6,
        reasoning: 'Требует ручной проверки модератора'
      };
    }

    // Неопределенные случаи
    return {
      decision: 'FLAGGED',
      confidence: 0.5,
      reasoning: 'Неопределенный случай, требует проверки'
    };
  }

  /**
   * Fallback модерация без ИИ
   */
  private static fallbackModeration(post: PostAnalysis): ModerationResult {
    const lowerText = post.description.toLowerCase();
    
    // Простые правила для определения релевантности
    const roadKeywords = [
      'дтп', 'авария', 'пробка', 'дпс', 'полиция', 'камера', 'дорога', 
      'машина', 'автомобиль', 'светофор', 'перекресток', 'патруль',
      'ремонт', 'работа', 'животные', 'снег', 'дождь', 'туман'
    ];
    const relevanceScore = roadKeywords.some(keyword => lowerText.includes(keyword)) ? 0.8 : 0.3;
    
    // Простые правила для токсичности
    const toxicKeywords = ['блять', 'сука', 'хуй', 'пизда', 'ебать', 'спам', 'реклама'];
    const toxicityScore = toxicKeywords.some(keyword => lowerText.includes(keyword)) ? 0.9 : 0.1;
    
    // Определение серьезности
    const severityKeywords = ['критично', 'срочно', 'скорая', 'пожар', 'ранен', 'убит'];
    const severityScore = severityKeywords.some(keyword => lowerText.includes(keyword)) ? 0.9 : 0.5;
    
    // Решение
    let decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' = 'FLAGGED';
    if (relevanceScore > 0.7 && toxicityScore < 0.3) {
      decision = 'APPROVED';
    } else if (toxicityScore > 0.7 || relevanceScore < 0.3) {
      decision = 'REJECTED';
    }
    
    return {
      decision,
      confidence: 0.6,
      reasoning: 'Fallback moderation based on keyword analysis',
      toxicityScore,
      relevanceScore,
      severityScore,
      categoryScore: 0.7,
      detectedLanguage: 'ru',
      keyPhrases: [],
      entities: []
    };
  }

  /**
   * Вызов ИИ API
   */
  private static async callAI(prompt: string): Promise<string> {
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по модерации контента дорожных происшествий в Кингисеппе. Отвечай только в формате JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.completion || data.content || '';
  }

  /**
   * Сохранение результата модерации в базу данных
   */
  private static async saveModerationResult(post: PostAnalysis, result: ModerationResult) {
    try {
      // Находим пост по описанию (временное решение)
      const dbPost = await prisma.post.findFirst({
        where: {
          description: post.description,
          type: post.type as any
        },
        orderBy: { createdAt: 'desc' }
      });

      if (dbPost) {
        // Обновляем пост
        await prisma.post.update({
          where: { id: dbPost.id },
          data: {
            moderationStatus: result.decision as any,
            moderationScore: result.confidence,
            moderationReason: result.reasoning,
            moderatedAt: BigInt(Date.now()),
            moderatedBy: 'AI',
            needsModeration: result.decision === 'FLAGGED',
            relevanceScore: result.relevanceScore,
            relevanceCheckedAt: BigInt(Date.now())
          }
        });

        // Сохраняем детали модерации
        await prisma.aIModeration.create({
          data: {
            postId: dbPost.id,
            content: post.description,
            toxicityScore: result.toxicityScore,
            relevanceScore: result.relevanceScore,
            severityScore: result.severityScore,
            categoryScore: result.categoryScore,
            detectedLanguage: result.detectedLanguage,
            keyPhrases: result.keyPhrases || [],
            entities: result.entities || [],
            decision: result.decision as any,
            confidence: result.confidence,
            reasoning: result.reasoning
          }
        });
      }
    } catch (error) {
      console.error('Error saving moderation result:', error);
    }
  }

  /**
   * Кэширование
   */
  private static generateCacheKey(post: PostAnalysis): string {
    return `${post.type}_${post.description.substring(0, 50)}_${post.severity}`;
  }

  private static getFromCache(key: string): ModerationResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  private static setCache(key: string, result: ModerationResult) {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Получение статистики модерации
   */
  static async getModerationStats() {
    try {
      const stats = await prisma.aIModeration.groupBy({
        by: ['decision'],
        _count: {
          decision: true
        },
        _avg: {
          confidence: true,
          toxicityScore: true,
          relevanceScore: true
        }
      });

      const total = await prisma.aIModeration.count();
      
      return {
        total,
        byDecision: stats.reduce((acc, stat) => {
          acc[stat.decision] = {
            count: stat._count.decision,
            avgConfidence: stat._avg.confidence || 0,
            avgToxicity: stat._avg.toxicityScore || 0,
            avgRelevance: stat._avg.relevanceScore || 0
          };
          return acc;
        }, {} as Record<string, any>)
      };
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      throw error;
    }
  }

  /**
   * Автоматическая модерация всех новых постов
   */
  static async moderatePendingPosts() {
    try {
      const pendingPosts = await prisma.post.findMany({
        where: {
          moderationStatus: 'PENDING',
          needsModeration: true
        },
        take: 10 // Обрабатываем по 10 за раз
      });

      console.log(`🤖 Starting AI moderation for ${pendingPosts.length} posts`);

      for (const post of pendingPosts) {
        try {
          const analysis: PostAnalysis = {
            type: post.type,
            description: post.description,
            severity: post.severity,
            hasPhoto: !!post.photo,
            location: post.address || post.landmark
          };

          const result = await this.moderatePost(analysis);
          
          // Небольшая задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error moderating post ${post.id}:`, error);
        }
      }

      console.log(`✅ AI moderation batch completed`);
    } catch (error) {
      console.error('Error in batch moderation:', error);
      throw error;
    }
  }
}
