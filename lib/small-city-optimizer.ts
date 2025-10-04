/**
 * Оптимизатор производительности для маленького города
 * Специально настроен для Кингисеппа и подобных городов
 */

import { prisma } from './prisma';

export class SmallCityOptimizer {
  private static readonly MAX_USERS = 50; // Максимум пользователей для маленького города
  private static readonly CACHE_TTL = 60000; // 1 минута кэш
  private static readonly BATCH_SIZE = 5; // Маленькие батчи для быстрой обработки
  
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Очистка кэша
   */
  static clearCache() {
    this.cache.clear();
  }

  /**
   * Получение данных из кэша
   */
  private static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Сохранение в кэш
   */
  private static setCache<T>(key: string, data: T) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Оптимизированное получение постов для карты (для маленького города)
   */
  static async getOptimizedPosts(bounds: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  }) {
    const cacheKey = `posts_${JSON.stringify(bounds)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = Date.now();
    
    // Для маленького города используем более агрессивное кэширование
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          { expiresAt: { gt: now } },
          { needsModeration: false }, // Только одобренные
          { latitude: { gte: bounds.southWest.latitude, lte: bounds.northEast.latitude } },
          { longitude: { gte: bounds.southWest.longitude, lte: bounds.northEast.longitude } },
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 30, // Ограничиваем для маленького города
      select: {
        id: true,
        description: true,
        latitude: true,
        longitude: true,
        type: true,
        severity: true,
        timestamp: true,
        userName: true,
        likes: true,
        likedBy: true,
        photos: true,
        address: true,
        landmark: true,
        moderationStatus: true,
        moderationScore: true,
        moderationReason: true,
        viewCount: true,
        verifiedBy: true,
      }
    });

    this.setCache(cacheKey, posts);
    return posts;
  }

  /**
   * Оптимизированное получение статистики для маленького города
   */
  static async getOptimizedStats() {
    const cacheKey = 'stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = Date.now();
    
    const [total, byType, bySeverity, activeUsers] = await Promise.all([
      prisma.post.count({
        where: { expiresAt: { gt: now } }
      }),
      prisma.post.groupBy({
        by: ['type'],
        where: { expiresAt: { gt: now } },
        _count: { type: true }
      }),
      prisma.post.groupBy({
        by: ['severity'],
        where: { expiresAt: { gt: now } },
        _count: { severity: true }
      }),
      prisma.user.count({
        where: { 
          isBanned: false,
          isKicked: false 
        }
      })
    ]);

    const stats = {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {} as Record<string, number>),
      activeUsers,
      maxUsers: this.MAX_USERS,
      utilizationPercent: Math.round((activeUsers / this.MAX_USERS) * 100),
      citySize: 'small',
      recommendations: this.getCityRecommendations(activeUsers, total)
    };

    this.setCache(cacheKey, stats);
    return stats;
  }

  /**
   * Получение рекомендаций для маленького города
   */
  private static getCityRecommendations(activeUsers: number, totalPosts: number) {
    const recommendations = [];

    if (activeUsers < 10) {
      recommendations.push('Низкая активность пользователей - рассмотрите рекламу в местных группах');
    }

    if (totalPosts < 5) {
      recommendations.push('Мало постов - добавьте примеры для мотивации пользователей');
    }

    if (activeUsers > 30) {
      recommendations.push('Хорошая активность - система работает эффективно');
    }

    recommendations.push('Для маленького города система оптимизирована');
    recommendations.push('Используйте кэширование для быстрой работы');

    return recommendations;
  }

  /**
   * Оптимизированная очистка данных для маленького города
   */
  static async cleanupForSmallCity() {
    const now = Date.now();
    
    // Удаляем просроченные посты
    const expiredPosts = await prisma.post.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    });

    // Очищаем старые записи модерации (старше 7 дней для маленького города)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const expiredModeration = await prisma.aIModeration.deleteMany({
      where: {
        processedAt: { lt: new Date(sevenDaysAgo) }
      }
    });

    // Очищаем старые статистики (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const expiredStats = await prisma.postStats.deleteMany({
      where: {
        date: { lt: new Date(thirtyDaysAgo) }
      }
    });

    console.log(`🧹 Small city cleanup: ${expiredPosts.count} posts, ${expiredModeration.count} moderation, ${expiredStats.count} stats`);

    // Очищаем кэш после очистки данных
    this.clearCache();

    return {
      expiredPosts: expiredPosts.count,
      expiredModeration: expiredModeration.count,
      expiredStats: expiredStats.count
    };
  }

  /**
   * Кластеризация постов для маленького города
   */
  static async clusterPostsForSmallCity() {
    const now = Date.now();
    const posts = await prisma.post.findMany({
      where: {
        expiresAt: { gt: now },
        needsModeration: false,
        clusterId: null // Только некластеризованные
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        type: true,
        severity: true,
      }
    });

    const clusters: Array<{
      id: string;
      centerLat: number;
      centerLng: number;
      radius: number;
      posts: string[];
      severity: string;
      type: string;
    }> = [];

    const CLUSTER_RADIUS = 200; // 200 метров для маленького города

    for (const post of posts) {
      let addedToCluster = false;

      // Ищем существующий кластер поблизости
      for (const cluster of clusters) {
        const distance = this.calculateDistance(
          post.latitude, post.longitude,
          cluster.centerLat, cluster.centerLng
        );

        if (distance <= CLUSTER_RADIUS && post.type === cluster.type) {
          cluster.posts.push(post.id);
          // Пересчитываем центр кластера
          cluster.centerLat = (cluster.centerLat + post.latitude) / 2;
          cluster.centerLng = (cluster.centerLng + post.longitude) / 2;
          addedToCluster = true;
          break;
        }
      }

      // Создаем новый кластер если не нашли подходящий
      if (!addedToCluster) {
        clusters.push({
          id: `cluster_${post.id}`,
          centerLat: post.latitude,
          centerLng: post.longitude,
          radius: CLUSTER_RADIUS,
          posts: [post.id],
          severity: post.severity,
          type: post.type
        });
      }
    }

    // Сохраняем кластеры в базу данных
    for (const cluster of clusters) {
      if (cluster.posts.length > 1) {
        await prisma.postCluster.create({
          data: {
            id: cluster.id,
            centerLat: cluster.centerLat,
            centerLng: cluster.centerLng,
            radius: cluster.radius,
            postCount: cluster.posts.length,
            severity: cluster.severity as any,
            type: cluster.type as any,
          }
        });

        // Обновляем посты с ID кластера
        await prisma.post.updateMany({
          where: {
            id: { in: cluster.posts }
          },
          data: {
            clusterId: cluster.id
          }
        });
      }
    }

    console.log(`🔗 Created ${clusters.length} clusters for small city`);
    return clusters;
  }

  /**
   * Вычисление расстояния между двумя точками (в метрах)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Получение рекомендаций по оптимизации для маленького города
   */
  static getOptimizationRecommendations() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: 50, // Меньше для маленького города
      cityType: 'small',
      recommendations: [
        'Используйте короткие интервалы кэширования (1 минута)',
        'Ограничивайте количество постов на карте (30 максимум)',
        'Частая очистка данных (каждые 6 часов)',
        'Кластеризация с радиусом 200 метров',
        'Мониторинг активности пользователей',
        'Оптимизация для мобильных устройств'
      ],
      performanceTips: [
        'Кэшируйте часто запрашиваемые данные',
        'Используйте индексы базы данных',
        'Ограничивайте размер батчей',
        'Регулярно очищайте старые данные',
        'Мониторьте использование памяти'
      ]
    };
  }

  /**
   * Создание статистики для маленького города
   */
  static async createSmallCityStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Получаем статистику по постам
    const totalPosts = await prisma.post.count({
      where: { expiresAt: { gt: Date.now() } }
    });

    const byType = await prisma.post.groupBy({
      by: ['type'],
      where: { expiresAt: { gt: Date.now() } },
      _count: { type: true }
    });

    const bySeverity = await prisma.post.groupBy({
      by: ['severity'],
      where: { expiresAt: { gt: Date.now() } },
      _count: { severity: true }
    });

    const byModeration = await prisma.post.groupBy({
      by: ['moderationStatus'],
      where: { expiresAt: { gt: Date.now() } },
      _count: { moderationStatus: true }
    });

    // Создаем запись статистики
    await prisma.postStats.create({
      data: {
        date: today,
        totalPosts,
        dpsPosts: byType.find(t => t.type === 'dps')?._count.type || 0,
        patrolPosts: byType.find(t => t.type === 'patrol')?._count.type || 0,
        accidentPosts: byType.find(t => t.type === 'accident')?._count.type || 0,
        cameraPosts: byType.find(t => t.type === 'camera')?._count.type || 0,
        roadworkPosts: byType.find(t => t.type === 'roadwork')?._count.type || 0,
        animalPosts: byType.find(t => t.type === 'animals')?._count.type || 0,
        lowSeverity: bySeverity.find(s => s.severity === 'low')?._count.severity || 0,
        mediumSeverity: bySeverity.find(s => s.severity === 'medium')?._count.severity || 0,
        highSeverity: bySeverity.find(s => s.severity === 'high')?._count.severity || 0,
        pendingModeration: byModeration.find(m => m.moderationStatus === 'PENDING')?._count.moderationStatus || 0,
        approvedPosts: byModeration.find(m => m.moderationStatus === 'APPROVED')?._count.moderationStatus || 0,
        rejectedPosts: byModeration.find(m => m.moderationStatus === 'REJECTED')?._count.moderationStatus || 0,
        aiModerationTime: 0,
        activeUsers: await prisma.user.count(),
        uniqueLocations: await prisma.post.groupBy({
          by: ['latitude', 'longitude'],
          where: { expiresAt: { gt: Date.now() } },
          _count: { latitude: true }
        }).then(result => result.length),
      }
    });

    console.log('✅ Small city stats created');
  }
}
