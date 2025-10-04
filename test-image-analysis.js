// Тест анализа изображений
const { EnhancedAIModeration } = require('./lib/enhanced-ai-moderation');

async function testImageAnalysis() {
  console.log('🧪 Тестирование анализа изображений...');
  
  // Тестовые данные
  const testPosts = [
    {
      type: 'roadwork',
      description: 'Дорожные работы на трассе',
      severity: 'medium',
      hasPhoto: true,
      photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Минимальный base64 для теста
      location: 'Кингисепп'
    },
    {
      type: 'dps',
      description: 'ДПС на посту',
      severity: 'high',
      hasPhoto: true,
      photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      location: 'Кингисепп'
    }
  ];

  for (const post of testPosts) {
    try {
      console.log(`\n📝 Тестируем пост типа: ${post.type}`);
      console.log(`📄 Описание: ${post.description}`);
      
      const result = await EnhancedAIModeration.moderatePost(post);
      
      console.log(`✅ Результат: ${result.decision}`);
      console.log(`🎯 Уверенность: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`💭 Обоснование: ${result.reasoning}`);
      
      if (result.toxicityScore !== undefined) {
        console.log(`☠️ Токсичность: ${(result.toxicityScore * 100).toFixed(1)}%`);
      }
      if (result.relevanceScore !== undefined) {
        console.log(`🔗 Релевантность: ${(result.relevanceScore * 100).toFixed(1)}%`);
      }
      if (result.severityScore !== undefined) {
        console.log(`⚠️ Серьезность: ${(result.severityScore * 100).toFixed(1)}%`);
      }
      if (result.categoryScore !== undefined) {
        console.log(`📂 Категория: ${(result.categoryScore * 100).toFixed(1)}%`);
      }
      
      if (result.keyPhrases && result.keyPhrases.length > 0) {
        console.log(`🔑 Ключевые фразы: ${result.keyPhrases.join(', ')}`);
      }
      if (result.entities && result.entities.length > 0) {
        console.log(`🏷️ Объекты: ${result.entities.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Ошибка при тестировании поста ${post.type}:`, error.message);
    }
  }
  
  console.log('\n🎉 Тестирование завершено!');
}

// Запускаем тест
testImageAnalysis().catch(console.error);
