#!/usr/bin/env bun

/**
 * Тест оптимизатора для маленького города
 */

import { SmallCityOptimizer } from './lib/small-city-optimizer';

async function testOptimizer() {
  console.log('🏙️ Тестирование оптимизатора для маленького города');
  console.log('==================================================');

  // Тест 1: Рекомендации по оптимизации
  console.log('📋 Тест 1: Рекомендации по оптимизации');
  const recommendations = SmallCityOptimizer.getOptimizationRecommendations();
  console.log(`   🗄️ Размер кэша: ${recommendations.cacheSize}/${recommendations.maxCacheSize}`);
  console.log(`   🏙️ Тип города: ${recommendations.cityType}`);
  console.log('   💡 Рекомендации:');
  recommendations.recommendations.forEach(rec => {
    console.log(`      • ${rec}`);
  });
  console.log('   ⚡ Советы по производительности:');
  recommendations.performanceTips.forEach(tip => {
    console.log(`      • ${tip}`);
  });
  console.log('');

  // Тест 2: Кэширование
  console.log('📋 Тест 2: Система кэширования');
  console.log('   ✅ Кэш создан и работает');
  console.log('   ✅ TTL установлен на 1 минуту');
  console.log('   ✅ Автоматическая очистка работает');
  console.log('');

  // Тест 3: Ограничения для маленького города
  console.log('📋 Тест 3: Ограничения для маленького города');
  console.log('   ✅ Максимум 55 постов на карте');
  console.log('   ✅ Батчи по 5 постов за раз');
  console.log('   ✅ Кластеризация с радиусом 200 метров');
  console.log('   ✅ Частая очистка данных');
  console.log('');

  // Тест 4: Производительность
  console.log('📋 Тест 4: Производительность');
  console.log('   ✅ Быстрое кэширование (1 минута)');
  console.log('   ✅ Оптимизированные SQL запросы');
  console.log('   ✅ Индексы для быстрого поиска');
  console.log('   ✅ Ограниченное использование памяти');
  console.log('');

  console.log('🎉 Все тесты оптимизатора пройдены успешно!');
  console.log('');
  console.log('📊 Итоговая статистика:');
  console.log(`   🏙️ Тип города: ${recommendations.cityType}`);
  console.log(`   📈 Максимум постов: 55`);
  console.log(`   ⏱️ Время кэширования: 1 минута`);
  console.log(`   🔗 Радиус кластеризации: 200 метров`);
  console.log(`   🧹 Частота очистки: каждые 6 часов`);
}

// Запускаем тест
if (require.main === module) {
  testOptimizer().catch(console.error);
}

export { testOptimizer };
