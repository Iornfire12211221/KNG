#!/usr/bin/env node

/**
 * Скрипт для проверки состояния базы данных
 * Показывает всех пользователей, посты и общую статистику
 */

const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database status...\n');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // Статистика пользователей
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    
    const totalUsers = await prisma.user.count();
    console.log(`👥 Total users: ${totalUsers}`);
    console.log('📊 Users by role:');
    userStats.forEach(stat => {
      console.log(`  - ${stat.role}: ${stat._count.role} users`);
    });
    
    // Показываем всех пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        name: true,
        username: true,
        role: true,
        isMuted: true,
        isBanned: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n👤 All users:');
    allUsers.forEach((user, index) => {
      const status = user.isBanned ? '🚫 BANNED' : user.isMuted ? '🔇 MUTED' : '✅ ACTIVE';
      console.log(`  ${index + 1}. ${user.name} (@${user.username || 'no-username'}) - ${user.role} ${status}`);
      console.log(`     ID: ${user.id}, Telegram ID: ${user.telegramId || 'none'}`);
      console.log(`     Created: ${user.createdAt.toISOString()}`);
    });
    
    // Статистика постов
    const totalPosts = await prisma.post.count();
    const postsByType = await prisma.post.groupBy({
      by: ['type'],
      _count: { type: true }
    });
    
    console.log(`\n📝 Total posts: ${totalPosts}`);
    console.log('📊 Posts by type:');
    postsByType.forEach(stat => {
      console.log(`  - ${stat.type}: ${stat._count.type} posts`);
    });
    
    // Последние посты
    const recentPosts = await prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        type: true,
        severity: true,
        userName: true,
        createdAt: true
      }
    });
    
    console.log('\n📝 Recent posts:');
    recentPosts.forEach((post, index) => {
      console.log(`  ${index + 1}. ${post.type.toUpperCase()} (${post.severity}) by ${post.userName}`);
      console.log(`     "${post.description.substring(0, 50)}${post.description.length > 50 ? '...' : ''}"`);
      console.log(`     Created: ${post.createdAt.toISOString()}`);
    });
    
    // Проверяем конкретного пользователя herlabsn
    const herlabsnUser = await prisma.user.findFirst({
      where: { username: 'herlabsn' }
    });
    
    console.log('\n🔍 herlabsn user check:');
    if (herlabsnUser) {
      console.log(`✅ Found: ${herlabsnUser.name} (@${herlabsnUser.username})`);
      console.log(`   Role: ${herlabsnUser.role}`);
      console.log(`   Admin: ${herlabsnUser.role === 'FOUNDER' || herlabsnUser.role === 'ADMIN' ? 'YES' : 'NO'}`);
      console.log(`   ID: ${herlabsnUser.id}`);
    } else {
      console.log('❌ User "herlabsn" not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем скрипт
checkDatabase();
