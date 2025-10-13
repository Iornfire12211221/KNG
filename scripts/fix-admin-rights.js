#!/usr/bin/env node

/**
 * Скрипт для исправления админских прав в базе данных
 * Устанавливает роль FOUNDER для пользователя herlabsn
 */

const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function fixAdminRights() {
  try {
    console.log('🔧 Starting admin rights fix...');
    
    // Находим пользователя herlabsn
    const user = await prisma.user.findFirst({
      where: { username: 'herlabsn' }
    });
    
    if (!user) {
      console.log('❌ User with username "herlabsn" not found');
      
      // Показываем всех пользователей
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          telegramId: true,
          name: true,
          username: true,
          role: true,
          createdAt: true
        }
      });
      
      console.log('📋 All users in database:');
      allUsers.forEach(u => {
        console.log(`  - ${u.name} (@${u.username}) - ${u.role} (ID: ${u.id})`);
      });
      
      return;
    }
    
    console.log(`👤 Found user: ${user.name} (@${user.username}) - Current role: ${user.role}`);
    
    if (user.role === 'FOUNDER') {
      console.log('✅ User already has FOUNDER role');
      return;
    }
    
    // Обновляем роль на FOUNDER
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'FOUNDER' }
    });
    
    console.log(`🎉 Successfully updated user role: ${updatedUser.name} -> ${updatedUser.role}`);
    
    // Показываем статистику
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    
    console.log('\n📊 User roles statistics:');
    stats.forEach(stat => {
      console.log(`  - ${stat.role}: ${stat._count.role} users`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing admin rights:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем скрипт
fixAdminRights();
