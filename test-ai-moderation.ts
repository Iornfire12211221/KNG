#!/usr/bin/env bun

/**
 * Тест улучшенной ИИ-модерации
 */

import { EnhancedAIModeration } from './lib/enhanced-ai-moderation';

async function testAIModeration() {
  console.log('🤖 Тестирование улучшенной ИИ-модерации');
  console.log('==========================================');

  const testPosts = [
    {
      type: 'dps',
      description: 'ДПС стоят за кустами на выезде из города, будьте осторожны',
      severity: 'medium',
      hasPhoto: false,
      location: 'Кингисепп'
    },
    {
      type: 'accident',
      description: 'ДТП на перекрестке, пробка, объезжайте',
      severity: 'high',
      hasPhoto: true,
      location: 'Центр города'
    },
    {
      type: 'camera',
      description: 'Камера скорости установлена на трассе',
      severity: 'low',
      hasPhoto: false,
      location: 'Трасса М11'
    },
    {
      type: 'other',
      description: 'Спам реклама магазина одежды',
      severity: 'low',
      hasPhoto: false,
      location: 'Не указано'
    },
    {
      type: 'roadwork',
      description: 'Ремонт дороги, объезд через центр',
      severity: 'medium',
      hasPhoto: false,
      location: 'Улица Ленина'
    }
  ];

  console.log(`📝 Тестируем ${testPosts.length} постов...\n`);

  for (let i = 0; i < testPosts.length; i++) {
    const post = testPosts[i];
    console.log(`📋 Тест ${i + 1}: ${post.type.toUpperCase()}`);
    console.log(`   Описание: ${post.description}`);
    console.log(`   Серьезность: ${post.severity}`);
    console.log(`   Фото: ${post.hasPhoto ? 'Да' : 'Нет'}`);
    console.log(`   Местоположение: ${post.location}`);

    try {
      const startTime = Date.now();
      const result = await EnhancedAIModeration.moderatePost(post);
      const processingTime = Date.now() - startTime;

      console.log(`   ✅ Результат: ${result.decision}`);
      console.log(`   🎯 Уверенность: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   💭 Причина: ${result.reasoning}`);
      console.log(`   ⏱️ Время обработки: ${processingTime}ms`);
      
      if (result.toxicityScore !== undefined) {
        console.log(`   🚫 Токсичность: ${(result.toxicityScore * 100).toFixed(1)}%`);
      }
      if (result.relevanceScore !== undefined) {
        console.log(`   🎯 Релевантность: ${(result.relevanceScore * 100).toFixed(1)}%`);
      }
      if (result.severityScore !== undefined) {
        console.log(`   ⚠️ Серьезность: ${(result.severityScore * 100).toFixed(1)}%`);
      }
      if (result.categoryScore !== undefined) {
        console.log(`   📂 Категоризация: ${(result.categoryScore * 100).toFixed(1)}%`);
      }

    } catch (error) {
      console.log(`   ❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }

    console.log('');
  }

  console.log('🎉 Тестирование завершено!');
}

// Запускаем тест
if (require.main === module) {
  testAIModeration().catch(console.error);
}

export { testAIModeration };
