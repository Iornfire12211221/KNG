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
  photo?: string; // Base64 изображение для анализа
  location?: string;
}

export class EnhancedAIModeration {
  private static readonly API_URL = 'https://toolkit.rork.com/text/llm/';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут кэш
  private static cache = new Map<string, { result: ModerationResult; timestamp: number }>();

  /**
   * Основная функция УМНОЙ модерации поста с самообучением
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
      
      // 🧠 УМНОЕ САМООБУЧЕНИЕ - применяем обученную модель
      const smartResult = await this.applySmartLearning(post, result);
      
      // Сохраняем в кэш
      this.setCache(cacheKey, smartResult);
      
      // Сохраняем результат в базу данных
      await this.saveModerationResult(post, smartResult);
      
      const processingTime = Date.now() - startTime;
      smartResult.processingTime = processingTime;
      
      console.log(`🧠 SMART Post moderated: ${smartResult.decision} (${processingTime}ms, confidence: ${smartResult.confidence})`);
      
      return smartResult;
      
    } catch (error) {
      console.error('❌ SMART AI moderation error:', error);
      
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

    // Уровень 3: Анализ изображения (если есть)
    let imageAnalysis = null;
    if (post.hasPhoto && post.photo) {
      imageAnalysis = await this.analyzeImage(post.photo, post.type, post.description);
      
      // Если изображение явно не соответствует тематике, отклоняем
      if (imageAnalysis && imageAnalysis.relevanceScore < 0.2) {
        return {
          decision: 'REJECTED',
          confidence: 0.9,
          reasoning: 'Изображение не соответствует дорожной тематике',
          toxicityScore: toxicityCheck.toxicityScore,
          relevanceScore: imageAnalysis.relevanceScore,
          severityScore: 0.1,
          categoryScore: 0.1,
          detectedLanguage: toxicityCheck.language,
          keyPhrases: [...toxicityCheck.keyPhrases, ...relevanceCheck.keyPhrases],
          entities: relevanceCheck.entities
        };
      }
    }

    // Уровень 4: Детальный анализ серьезности и категоризации
    const detailedAnalysis = await this.performDetailedAnalysis(post);
    
    // Принимаем решение на основе всех факторов
    const decision = this.makeDecision({
      toxicity: toxicityCheck.toxicityScore,
      relevance: relevanceCheck.relevanceScore,
      severity: detailedAnalysis.severityScore,
      category: detailedAnalysis.categoryScore,
      imageRelevance: imageAnalysis?.relevanceScore || 1.0
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
    imageRelevance?: number;
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

    // Учитываем анализ изображения при принятии решения
    const imageRelevance = scores.imageRelevance || 1.0;
    const combinedRelevance = (scores.relevance + imageRelevance) / 2;

    // Высокая релевантность + низкая токсичность = одобрение
    if (combinedRelevance > 0.7 && scores.toxicity < 0.3) {
      let reasoning = 'Качественный контент о дорожной ситуации';
      if (scores.imageRelevance && scores.imageRelevance < 0.8) {
        reasoning += ' (изображение требует проверки)';
      }
      return {
        decision: 'APPROVED',
        confidence: 0.9,
        reasoning
      };
    }

    // Если изображение не соответствует тематике, отклоняем
    if (scores.imageRelevance && scores.imageRelevance < 0.3) {
      return {
        decision: 'REJECTED',
        confidence: 0.8,
        reasoning: 'Изображение не соответствует дорожной тематике'
      };
    }

    // Средние показатели = флаг для ручной проверки
    if (combinedRelevance > 0.5 && scores.toxicity < 0.5) {
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
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Ты эксперт по модерации контента дорожных происшествий в Кингисеппе. Отвечай только в формате JSON без дополнительного текста.'
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
      let content = data.completion || data.content || data.message || '';
      
      // Очищаем ответ от лишних символов и форматируем JSON
      content = content.trim();
      
      // Убираем markdown код блоки если есть
      if (content.startsWith('```json')) {
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Убираем лишние символы и пробелы
      content = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Ищем JSON объект в тексте
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      // Проверяем, что это валидный JSON
      try {
        JSON.parse(content);
        return content;
      } catch (parseError) {
        console.warn('AI returned invalid JSON, using fallback:', content);
        // Возвращаем fallback JSON вместо ошибки
        return JSON.stringify({
          toxicityScore: 0.1,
          language: 'ru',
          isRelevant: true,
          relevanceScore: 0.8,
          severityScore: 0.5,
          categoryScore: 0.7,
          keyPhrases: [],
          entities: []
        });
      }
    } catch (error) {
      console.error('AI API call failed:', error);
      throw error;
    }
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
            photo: post.photo || undefined,
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

  /**
   * Анализ изображения
   */
  private static async analyzeImage(imageBase64: string, postType: string, description?: string): Promise<{ relevanceScore: number; keyPhrases: string[]; entities: string[] } | null> {
    try {
      console.log('🖼️ Analyzing image for post type:', postType);
      
      // Определяем текущее время суток и дату
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
      
      // Определяем ожидаемое содержимое по тематике
      const getThemeExpectations = (type: string) => {
        switch (type) {
          case 'roadwork':
            return {
              name: 'Дорожные работы',
              expected: 'дорожная техника (экскаваторы, асфальтоукладчики, катки, грузовики, краны), рабочие в спецодежде, ограждения, конусы, знаки "Дорожные работы", свежий асфальт, ремонт дорожного покрытия, строительные материалы, желтая спецтехника'
            };
          case 'other':
            return {
              name: 'Остальное (проблемы инфраструктуры)',
              expected: 'ямы на дороге, поврежденное покрытие, сломанные светофоры, поврежденные дорожные знаки, проблемы с освещением, разрушенные бордюры, проблемы с дренажем'
            };
          case 'dps':
            return {
              name: 'ДПС/Патруль',
              expected: 'полицейские автомобили, сотрудники ДПС, радары, камеры скорости, посты ГИБДД, патрульные машины'
            };
          case 'accident':
            return {
              name: 'ДТП',
              expected: 'поврежденные автомобили, следы аварии, эвакуаторы, скорая помощь, пожарные, полиция на месте ДТП'
            };
          case 'camera':
            return {
              name: 'Камеры',
              expected: 'камеры видеонаблюдения, радары скорости, стационарные посты контроля'
            };
          case 'animals':
            return {
              name: 'Животные',
              expected: 'животные на проезжей части или рядом с дорогой (лоси, кабаны, собаки, кошки и др.)'
            };
          default:
            return {
              name: 'Дорожная ситуация',
              expected: 'любая дорожная информация'
            };
        }
      };
      
      const themeInfo = getThemeExpectations(postType);
      
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Ты анализируешь фотографии для приложения дорожной информации в городе Кингисепп, Ленинградская область.

ВАЖНО: Если на фото есть спецтехника (желтые грузовики, экскаваторы, краны) - это ВСЕГДА дорожные работы, даже без описания!

СПРАВОЧНАЯ ИНФОРМАЦИЯ О ВРЕМЕНИ:
- Текущее время: ${currentTime} (${timeOfDay})
- Дата: ${currentDate}
- Сезон: ${season}
- Местоположение: Кингисепп, Ленинградская область

ТЕМАТИКА ПОСТА: ${themeInfo.name}
ОЖИДАЕМОЕ СОДЕРЖИМОЕ: ${themeInfo.expected}
${description ? `ОПИСАНИЕ ОТ ПОЛЬЗОВАТЕЛЯ: ${description}` : 'ОПИСАНИЕ ОТСУТСТВУЕТ'}

ПРАВИЛА АНАЛИЗА:
1. СПЕЦТЕХНИКА = ДОРОЖНЫЕ РАБОТЫ:
   - Желтые грузовики, экскаваторы, краны = дорожные работы
   - Даже без описания, спецтехника указывает на работы
   - Техника может стоять без активных работ - это тоже важно

2. БЕЗ ОПИСАНИЯ АНАЛИЗИРУЙ ВИЗУАЛЬНО:
   - Ищи ключевые объекты на фото
   - Спецтехника, ДПС, камеры, животные - всё важно
   - Контекст определяй по визуальным признакам

3. ПРОВЕРКА ВРЕМЕНИ СУТОК (ОБЯЗАТЕЛЬНО):
   - Сравни освещение на фото с текущим временем
   - Если сейчас ${timeOfDay} (${currentTime}), фото должно соответствовать этому времени
   - ОТКЛОНЯЙ фото, если время съемки явно не соответствует текущему времени
   - Дневное фото вечером/ночью = MODERATE
   - Ночное фото днем = MODERATE

4. ТЕМАТИЧЕСКОЕ СООТВЕТСТВИЕ:
   - Для "Дорожные работы": любая спецтехника, рабочие, ремонт
   - Для "Остальное": проблемы инфраструктуры
   - Автоматически определяй тему по содержимому

ОДОБРЯЙ (APPROVE) если:
- Есть спецтехника (даже без описания)
- Есть дорожные работы или их признаки
- Есть ДПС, камеры, животные на дороге
- Есть проблемы с дорогой (ямы, поломки)
- Фото связано с дорожной ситуацией
- Качество фото позволяет определить содержимое

ОТКЛОНЯЙ (MODERATE) если:
- Совсем не связано с дорогой
- Явный спам или оффтоп
- Невозможно определить содержимое из-за плохого качества
- Подозрение на поддельное фото (скриншот сайта и т.п.)
- Время съемки не соответствует текущему времени (дневное фото вечером/ночью или наоборот)

Ответь в формате JSON:
{
  "decision": "APPROVE" или "MODERATE",
  "relevanceScore": число от 0 до 1,
  "reasoning": "краткое обоснование",
  "keyPhrases": ["ключевые фразы"],
  "entities": ["обнаруженные объекты"]
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Проанализируй это изображение.

ВАЖНО: Сейчас ${currentTime} (${timeOfDay}). Проверь, соответствует ли освещение на фото текущему времени суток!

${description ? `Описание от пользователя: "${description}"` : 'Пользователь не добавил описание'}

Тематика поста: ${themeInfo.name}
Ожидаемое содержимое: ${themeInfo.expected}

ПОРЯДОК ПРОВЕРКИ:
1. ПРОВЕРЬ ВРЕМЯ: Соответствует ли освещение на фото текущему времени (${timeOfDay})?
2. Определи основное содержимое фото
3. Если видишь спецтехнику - это дорожные работы, но проверь время!
4. Проверь соответствие дорожной тематике
5. Без описания определяй контекст по визуальным признакам
6. Оцени качество и подлинность фото

Ответь в формате JSON с полями: decision, relevanceScore, reasoning, keyPhrases, entities.`
                },
                {
                  type: 'image',
                  image: imageBase64
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        console.log('Image analysis failed: Response not OK');
        return null;
      }

      const data = await response.json();
      let content = data.completion || data.content || data.message || '';
      
      // Очищаем ответ от лишних символов и форматируем JSON
      content = content.trim();
      
      // Убираем markdown код блоки если есть
      if (content.startsWith('```json')) {
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Убираем лишние символы и пробелы
      content = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Ищем JSON объект в тексте
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      // Проверяем, что это валидный JSON
      try {
        const result = JSON.parse(content);
        console.log('🖼️ Image analysis result:', result);
        
        return {
          relevanceScore: result.relevanceScore || 0.5,
          keyPhrases: result.keyPhrases || [],
          entities: result.entities || []
        };
      } catch (parseError) {
        console.warn('AI returned invalid JSON for image analysis, using fallback:', content);
        // Возвращаем fallback результат
        return {
          relevanceScore: 0.5,
          keyPhrases: [],
          entities: []
        };
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      return null;
    }
  }

  /**
   * Применение умного самообучения к результату модерации
   */
  private static async applySmartLearning(post: PostAnalysis, baseResult: ModerationResult): Promise<ModerationResult> {
    try {
      // Получаем умное решение
      const smartDecision = await this.getSmartDecision(
        baseResult.decision === 'APPROVED' ? 'approve' : 'reject',
        baseResult.confidence,
        post.type,
        post.hasPhoto,
        post.description
      );

      // Обновляем результат с умными данными
      const smartResult: ModerationResult = {
        ...baseResult,
        decision: smartDecision.decision === 'approve' ? 'APPROVED' : 'REJECTED',
        confidence: smartDecision.confidence,
        reasoning: smartDecision.reasoning || baseResult.reasoning
      };

      console.log('🧠 Applied smart learning:', {
        original: baseResult.decision,
        smart: smartResult.decision,
        confidence: (smartResult.confidence * 100).toFixed(1) + '%',
        reasoning: smartDecision.reasoning
      });

      return smartResult;
    } catch (error) {
      console.error('❌ Error applying smart learning:', error);
      return baseResult; // Возвращаем исходный результат при ошибке
    }
  }

  /**
   * Получение умного решения через систему обучения
   */
  private static async getSmartDecision(
    baseDecision: 'approve' | 'reject',
    confidence: number,
    postType: string,
    hasPhoto: boolean,
    description?: string
  ): Promise<{ decision: 'approve' | 'reject'; confidence: number; reasoning?: string }> {
    try {
      // Загружаем умную модель
      const [smartModelStr, patternsStr] = await Promise.all([
        this.getFromStorage('ai_smart_model'),
        this.getFromStorage('ai_smart_patterns')
      ]);

      if (!smartModelStr || !patternsStr) {
        return { decision: baseDecision, confidence, reasoning: 'No smart model available' };
      }

      const smartModel = JSON.parse(smartModelStr);
      const patterns = JSON.parse(patternsStr);
      const now = new Date();
      
      // Определяем время суток и сезон
      const hour = now.getHours();
      const timeOfDay = hour >= 6 && hour < 12 ? 'morning' : 
                       hour >= 12 && hour < 18 ? 'day' : 
                       hour >= 18 && hour < 22 ? 'evening' : 'night';
      
      const month = now.getMonth() + 1;
      const season = month >= 3 && month <= 5 ? 'spring' : 
                    month >= 6 && month <= 8 ? 'summer' : 
                    month >= 9 && month <= 11 ? 'autumn' : 'winter';

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
        reasoning.push(`Time: ${(timeConfidence * 100).toFixed(1)}%`);
      }

      // 2. Анализ по типу поста (вес 0.3)
      if (patterns.typePatterns[postType]) {
        const typeConfidence = patterns.typePatterns[postType].confidence || 0.5;
        smartScore += typeConfidence * smartModel.weights.typeWeight;
        totalWeight += smartModel.weights.typeWeight;
        reasoning.push(`Type: ${(typeConfidence * 100).toFixed(1)}%`);
      }

      // 3. Анализ по наличию фото (вес 0.2)
      const photoKey = hasPhoto ? 'withPhoto' : 'withoutPhoto';
      if (patterns.photoPatterns[photoKey].total > 0) {
        const photoConfidence = patterns.photoPatterns[photoKey].confidence || 0.5;
        smartScore += photoConfidence * smartModel.weights.photoWeight;
        totalWeight += smartModel.weights.photoWeight;
        reasoning.push(`Photo: ${(photoConfidence * 100).toFixed(1)}%`);
      }

      // 4. Анализ контекста (вес 0.15)
      const context = `${timeOfDay}_${postType}_${hasPhoto ? 'photo' : 'no_photo'}`;
      if (patterns.contextPatterns[context]) {
        const contextConfidence = patterns.contextPatterns[context].correct / patterns.contextPatterns[context].total;
        smartScore += contextConfidence * smartModel.weights.contextWeight;
        totalWeight += smartModel.weights.contextWeight;
        reasoning.push(`Context: ${(contextConfidence * 100).toFixed(1)}%`);
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
      }

      return { 
        decision: finalDecision, 
        confidence: finalConfidence,
        reasoning: `Smart: ${reasoning.join(', ')}`
      };
    } catch (error) {
      console.error('❌ Error getting smart decision:', error);
      return { decision: baseDecision, confidence, reasoning: 'Smart analysis failed' };
    }
  }

  /**
   * Получение данных из хранилища
   */
  private static async getFromStorage(key: string): Promise<string | null> {
    try {
      // В браузере используем localStorage, в React Native - AsyncStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error('Error getting from storage:', error);
      return null;
    }
  }
}
