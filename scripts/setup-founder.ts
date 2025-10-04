/**
 * Скрипт для назначения основателя системы
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function setupFounder() {
  try {
    console.log('🏗️ Настройка основателя системы...');
    
    const founderTelegramId = '6014412239';
    
    // Проверяем, существует ли пользователь с таким Telegram ID
    let user = await prisma.user.findUnique({
      where: { telegramId: founderTelegramId }
    });
    
    if (!user) {
      // Создаем пользователя-основателя
      user = await prisma.user.create({
        data: {
          telegramId: founderTelegramId,
          name: 'Основатель системы',
          username: 'founder',
          role: 'FOUNDER',
          isMuted: false,
          isBanned: false,
          isKicked: false,
          locationPermission: true
        }
      });
      console.log('✅ Создан новый пользователь-основатель:', user.id);
    } else {
      // Обновляем роль существующего пользователя
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'FOUNDER' }
      });
      console.log('✅ Обновлена роль пользователя на FOUNDER:', user.id);
    }
    
    console.log('👑 Основатель системы настроен:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram ID: ${user.telegramId}`);
    console.log(`   Имя: ${user.name}`);
    console.log(`   Роль: ${user.role}`);
    
    // Проверяем общее количество пользователей
    const totalUsers = await prisma.user.count();
    const moderators = await prisma.user.count({ where: { role: 'MODERATOR' } });
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    const founders = await prisma.user.count({ where: { role: 'FOUNDER' } });
    
    console.log('\n📊 Статистика пользователей:');
    console.log(`   Всего пользователей: ${totalUsers}`);
    console.log(`   Основателей: ${founders}`);
    console.log(`   Админов: ${admins}`);
    console.log(`   Модераторов: ${moderators}`);
    console.log(`   Обычных пользователей: ${totalUsers - founders - admins - moderators}`);
    
  } catch (error) {
    console.error('❌ Ошибка настройки основателя:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем скрипт
setupFounder();
