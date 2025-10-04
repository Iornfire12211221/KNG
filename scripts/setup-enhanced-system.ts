#!/usr/bin/env bun

/**
 * Скрипт для настройки улучшенной системы дорожных происшествий
 * Оптимизирован для маленького города (Кингисепп)
 */

import { PrismaClient } from '../lib/generated/prisma';
import { EnhancedAIModeration } from '../lib/enhanced-ai-moderation';
import { SmallCityOptimizer } from '../lib/small-city-optimizer';

const prisma = new PrismaClient();

async function setupEnhancedSystem() {
  console.log('🚀 Настройка улучшенной системы дорожных происшествий');
  console.log('====================================================');

  try {
    // Проверяем подключение к базе данных
    await prisma.$connect();
    console.log('✅ Подключение к базе данных установлено\n');

    // 1. Применяем миграции базы данных
    console.log('📦 Применение миграций базы данных...');
    await applyDatabaseMigrations();
    console.log('✅ Миграции применены\n');

    // 2. Создаем начальную статистику
    console.log('📊 Создание начальной статистики...');
    await SmallCityOptimizer.createSmallCityStats();
    console.log('✅ Статистика создана\n');

    // 3. Запускаем ИИ-модерацию для существующих постов
    console.log('🤖 Запуск ИИ-модерации для существующих постов...');
    await EnhancedAIModeration.moderatePendingPosts();
    console.log('✅ ИИ-модерация завершена\n');

    // 4. Создаем кластеры постов
    console.log('🔗 Создание кластеров постов...');
    await SmallCityOptimizer.clusterPostsForSmallCity();
    console.log('✅ Кластеры созданы\n');

    // 5. Очищаем старые данные
    console.log('🧹 Очистка старых данных...');
    await SmallCityOptimizer.cleanupForSmallCity();
    console.log('✅ Очистка завершена\n');

    // 6. Показываем статистику
    console.log('📈 Текущая статистика системы:');
    await showSystemStats();

    console.log('\n🎉 Настройка завершена успешно!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Запустите приложение: bun run dev');
    console.log('2. Проверьте работу ИИ-модерации');
    console.log('3. Настройте автоматические задачи в crontab');
    console.log('4. Мониторьте производительность системы');

  } catch (error) {
    console.error('\n💥 Ошибка настройки:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function applyDatabaseMigrations() {
  // Обновляем существующие посты с новыми полями
  const posts = await prisma.post.findMany({
    where: {
      moderationStatus: null
    }
  });

  console.log(`📝 Обновление ${posts.length} постов с новыми полями...`);

  for (const post of posts) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        moderationStatus: post.needsModeration ? 'PENDING' : 'APPROVED',
        moderationScore: post.needsModeration ? 0.5 : 0.9,
        moderationReason: post.needsModeration ? 'Мигрировано из старой системы' : 'Автоматически одобрено при миграции',
        moderatedAt: post.needsModeration ? null : BigInt(Date.now()),
        moderatedBy: post.needsModeration ? null : 'MIGRATION',
        trafficImpact: 'MINOR',
        emergencyServices: false,
        casualties: 0,
        viewCount: 0,
        reportCount: 0,
        verifiedBy: []
      }
    });
  }

  console.log(`✅ Обновлено ${posts.length} постов`);
}

async function showSystemStats() {
  try {
    const stats = await SmallCityOptimizer.getOptimizedStats();
    
    console.log(`   📊 Всего постов: ${stats.total}`);
    console.log(`   👥 Активных пользователей: ${stats.activeUsers}/${stats.maxUsers} (${stats.utilizationPercent}%)`);
    console.log(`   🏙️ Тип города: ${stats.citySize}`);
    
    console.log('\n   📈 По типам:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`      ${type}: ${count}`);
    });
    
    console.log('\n   ⚠️ По серьезности:');
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      console.log(`      ${severity}: ${count}`);
    });

    console.log('\n   💡 Рекомендации:');
    stats.recommendations.forEach(rec => {
      console.log(`      • ${rec}`);
    });

    // Показываем статистику модерации
    try {
      const moderationStats = await EnhancedAIModeration.getModerationStats();
      console.log('\n   🤖 Статистика ИИ-модерации:');
      console.log(`      Всего обработано: ${moderationStats.total}`);
      Object.entries(moderationStats.byDecision).forEach(([decision, data]) => {
        console.log(`      ${decision}: ${data.count} (уверенность: ${(data.avgConfidence * 100).toFixed(1)}%)`);
      });
    } catch (error) {
      console.log('\n   🤖 ИИ-модерация: Данные недоступны');
    }

  } catch (error) {
    console.error('   ❌ Ошибка получения статистики:', error);
  }
}

// Запускаем настройку
if (require.main === module) {
  setupEnhancedSystem();
}

export { setupEnhancedSystem };
