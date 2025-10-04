#!/usr/bin/env bun

/**
 * Скрипт для автоматического обслуживания системы дорожных происшествий
 * Оптимизирован для маленького города
 */

import { SmallCityOptimizer } from '../lib/small-city-optimizer';
import { EnhancedAIModeration } from '../lib/enhanced-ai-moderation';

async function runMaintenance() {
  console.log('🔧 Запуск автоматического обслуживания системы');
  console.log('===============================================');
  console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}\n`);

  try {
    // 1. Очистка данных
    console.log('🧹 Очистка данных...');
    const cleanupResult = await SmallCityOptimizer.cleanupForSmallCity();
    console.log(`   ✅ Удалено: ${cleanupResult.expiredPosts} постов, ${cleanupResult.expiredModeration} модераций, ${cleanupResult.expiredStats} статистик`);

    // 2. ИИ-модерация ожидающих постов
    console.log('\n🤖 ИИ-модерация ожидающих постов...');
    await EnhancedAIModeration.moderatePendingPosts();
    console.log('   ✅ ИИ-модерация завершена');

    // 3. Кластеризация постов
    console.log('\n🔗 Кластеризация постов...');
    const clusters = await SmallCityOptimizer.clusterPostsForSmallCity();
    console.log(`   ✅ Создано ${clusters.length} кластеров`);

    // 4. Получение статистики
    console.log('\n📊 Получение статистики...');
    const stats = await SmallCityOptimizer.getOptimizedStats();
    console.log(`   📈 Всего постов: ${stats.total}`);
    console.log(`   👥 Активных пользователей: ${stats.activeUsers}/${stats.maxUsers} (${stats.utilizationPercent}%)`);

    // 5. Рекомендации по оптимизации
    console.log('\n💡 Рекомендации по оптимизации:');
    const recommendations = SmallCityOptimizer.getOptimizationRecommendations();
    recommendations.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    // 6. Проверка производительности
    console.log('\n⚡ Проверка производительности:');
    console.log(`   🗄️ Размер кэша: ${recommendations.cacheSize}/${recommendations.maxCacheSize}`);
    console.log(`   🏙️ Тип города: ${recommendations.cityType}`);

    console.log('\n✅ Обслуживание завершено успешно!');

  } catch (error) {
    console.error('\n❌ Ошибка обслуживания:', error);
    process.exit(1);
  }
}

// Запускаем обслуживание
if (require.main === module) {
  runMaintenance();
}

export { runMaintenance };
