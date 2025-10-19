import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '../../create-context';

// Схемы валидации
const PostTypeSchema = z.enum(['dps', 'patrol', 'accident', 'camera', 'roadwork', 'animals', 'other']);
const PostSeveritySchema = z.enum(['low', 'medium', 'high']);

const CreatePostSchema = z.object({
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  landmark: z.string().optional(),
  timestamp: z.number(),
  expiresAt: z.number(),
  userId: z.string(),
  userName: z.string(),
  type: PostTypeSchema,
  severity: PostSeveritySchema,
  likes: z.number().default(0),
  likedBy: z.array(z.string()).default([]),
  photo: z.string().optional(),
  photos: z.array(z.string()).default([]),
  needsModeration: z.boolean().default(true),
  isRelevant: z.boolean().default(true),
  relevanceCheckedAt: z.number().optional(),
  // Новые поля для улучшенной модерации
  roadType: z.enum(['HIGHWAY', 'CITY_ROAD', 'RESIDENTIAL', 'RURAL', 'BRIDGE', 'TUNNEL', 'INTERSECTION']).optional(),
  weather: z.enum(['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'FOG', 'ICE', 'WIND', 'STORM']).optional(),
  trafficImpact: z.enum(['NONE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']).default('MINOR'),
  emergencyServices: z.boolean().default(false),
  casualties: z.number().min(0).default(0),
  accuracy: z.number().optional(),
});

export const postsRouter = createTRPCRouter({
  // Получить все активные посты (только одобренные для обычных пользователей)
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const now = Date.now();
      
      // Fallback для локальной разработки
      if (!ctx.prisma) {
        console.log('🔄 Using mock data for local development');
        return [
          {
            id: "1",
            description: "Тестовый пост для локальной разработки",
            latitude: 59.3765,
            longitude: 28.6123,
            address: "Кингисепп, ул. Тестовая",
            timestamp: now,
            expiresAt: now + 3600000,
            userId: "test-user",
            userName: "Тестовый пользователь",
            type: "dps",
            severity: "medium",
            likes: 0,
            likedBy: [],
            needsModeration: false,
            isRelevant: true
          }
        ];
      }
      
      const posts = await ctx.prisma.post.findMany({
        where: {
          expiresAt: {
            gt: BigInt(now)
          },
          moderationStatus: 'APPROVED' // Показываем только одобренные посты
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      
      // Преобразуем BigInt в число для клиента
      const postsWithNumbers = posts.map(post => ({
        ...post,
        timestamp: Number(post.timestamp),
        expiresAt: Number(post.expiresAt),
        relevanceCheckedAt: post.relevanceCheckedAt ? Number(post.relevanceCheckedAt) : null,
      }));
      
      console.log(`📥 Fetched ${postsWithNumbers.length} approved posts from database`);
      return postsWithNumbers;
    } catch (error) {
      console.error('❌ Error fetching posts from database:', error);
      
      // Fallback на mock данные при ошибке базы
      console.log('🔄 Falling back to mock data due to database error');
      const now = Date.now();
      return [
        {
          id: "1",
          description: "Тестовый пост (fallback)",
          latitude: 59.3765,
          longitude: 28.6123,
          address: "Кингисепп, ул. Тестовая",
          timestamp: now,
          expiresAt: now + 3600000,
          userId: "test-user",
          userName: "Тестовый пользователь",
          type: "dps",
          severity: "medium",
          likes: 0,
          likedBy: [],
          needsModeration: false,
          isRelevant: true
        }
      ];
    }
  }),

  // Получить все посты для админов (включая ожидающие модерации)
  getAllForAdmin: publicProcedure.query(async ({ ctx }) => {
    try {
      const now = Date.now();
      
      // Fallback для локальной разработки
      if (!ctx.prisma) {
        console.log('🔄 Using mock data for local development (admin)');
        return [];
      }
      
      const posts = await ctx.prisma.post.findMany({
        where: {
          expiresAt: {
            gt: BigInt(now)
          }
          // Не фильтруем по moderationStatus - показываем все посты
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      
      // Преобразуем BigInt в число для клиента
      const postsWithNumbers = posts.map(post => ({
        ...post,
        timestamp: Number(post.timestamp),
        expiresAt: Number(post.expiresAt),
        relevanceCheckedAt: post.relevanceCheckedAt ? Number(post.relevanceCheckedAt) : null,
      }));
      
      console.log(`📥 Fetched ${postsWithNumbers.length} posts for admin (including moderation)`);
      return postsWithNumbers;
    } catch (error) {
      console.error('❌ Error fetching posts for admin:', error);
      return [];
    }
  }),

  // Создать новый пост
  create: publicProcedure
    .input(CreatePostSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Определяем статус модерации на основе needsModeration
        const moderationStatus = input.needsModeration ? 'PENDING' : 'APPROVED';
        
        // Пытаемся создать пост в базе данных
        const post = await ctx.prisma.post.create({
          data: {
            ...input,
            timestamp: BigInt(input.timestamp),
            expiresAt: BigInt(input.expiresAt),
            relevanceCheckedAt: input.relevanceCheckedAt ? BigInt(input.relevanceCheckedAt) : null,
            moderationStatus: moderationStatus as any,
          }
        });
        
        console.log(`📤 Created new post: ${post.id} by ${post.userName} (${moderationStatus})`);
        
        // Отправляем уведомления только если пост одобрен
        if (moderationStatus === 'APPROVED') {
          console.log('✅ Post approved by AI, sending notifications');
          
          // Отправляем уведомление в Telegram
          try {
            const { NotificationService } = await import('../../../notification-service');
            await NotificationService.notifyNewPost(post.id);
          } catch (error) {
            console.error('❌ Ошибка отправки уведомления в Telegram:', error);
          }
        } else {
          console.log('⏳ Post pending moderation, notifications will be sent after approval');
        }
        
        // Отправляем WebSocket уведомление только для одобренных постов
        if (moderationStatus === 'APPROVED') {
          try {
            const { wsManager } = await import('../../../websocket-server');
            await wsManager.notifyNewPost({
              id: post.id,
              type: post.type,
              severity: post.severity,
              description: post.description,
              latitude: post.latitude,
              longitude: post.longitude,
              address: post.address,
              timestamp: Number(post.timestamp),
              userName: post.userName,
            });
          } catch (error) {
            console.error('❌ Error sending WebSocket notification:', error);
          }
        }
        
        return post;
      } catch (error) {
        console.error('❌ Database error, falling back to mock post:', error);
        
        // Fallback для локальной разработки
        console.log('🔄 Creating mock post for local development');
        const mockPost = {
          id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...input,
          timestamp: BigInt(input.timestamp),
          expiresAt: BigInt(input.expiresAt),
          relevanceCheckedAt: input.relevanceCheckedAt ? BigInt(input.relevanceCheckedAt) : null,
        };
        
        console.log(`📤 Created mock post: ${mockPost.id} by ${mockPost.userName}`);
        
        // Отправляем WebSocket уведомление о новом посте
        try {
          const { wsManager } = await import('../../../websocket-server');
          await wsManager.notifyNewPost({
            id: mockPost.id,
            type: mockPost.type,
            severity: mockPost.severity,
            description: mockPost.description,
            latitude: mockPost.latitude,
            longitude: mockPost.longitude,
            address: mockPost.address,
            timestamp: Number(mockPost.timestamp),
            userName: mockPost.userName,
          });
        } catch (error) {
          console.error('❌ Error sending WebSocket notification:', error);
        }
        
        return mockPost;
      }
    }),

  // Лайкнуть пост
  like: publicProcedure
    .input(z.object({
      postId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      const likedBy = post.likedBy || [];
      const hasLiked = likedBy.includes(input.userId);

      const updatedPost = await ctx.prisma.post.update({
        where: { id: input.postId },
        data: {
          likes: hasLiked ? post.likes - 1 : post.likes + 1,
          likedBy: hasLiked 
            ? likedBy.filter(id => id !== input.userId)
            : [...likedBy, input.userId]
        }
      });

      console.log(`👍 Post ${input.postId} ${hasLiked ? 'unliked' : 'liked'} by ${input.userId}`);
      return updatedPost;
    }),

  // Удалить пост
  delete: publicProcedure
    .input(z.object({
      postId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Проверяем права на удаление (только автор может удалить)
      if (post.userId !== input.userId) {
        throw new Error('Not authorized to delete this post');
      }

      await ctx.prisma.post.delete({
        where: { id: input.postId }
      });

      console.log(`🗑️ Post ${input.postId} deleted by ${input.userId}`);
      return { success: true };
    }),

  // Очистить просроченные посты
  clearExpired: publicProcedure.mutation(async () => {
    const now = Date.now();
    const result = await ctx.prisma.post.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`🧹 Cleared ${result.count} expired posts`);
    return { deletedCount: result.count };
  }),

  // Удалить ВСЕ посты (для полной очистки)
  deleteAll: publicProcedure.mutation(async () => {
    try {
      const deletedCount = await ctx.prisma.post.deleteMany({});
      
      console.log(`🗑️ Deleted ALL ${deletedCount.count} posts from database`);
      return { deletedCount: deletedCount.count };
    } catch (error) {
      console.error('❌ Error deleting all posts:', error);
      throw error;
    }
  }),

  // Получить посты конкретного пользователя
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const now = Date.now();
        const posts = await ctx.prisma.post.findMany({
          where: {
            userId: input.userId,
            expiresAt: {
              gt: BigInt(now)
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        });
        
        // Преобразуем BigInt в число для клиента
        const postsWithNumbers = posts.map(post => ({
          ...post,
          timestamp: Number(post.timestamp),
          expiresAt: Number(post.expiresAt),
          relevanceCheckedAt: post.relevanceCheckedAt ? Number(post.relevanceCheckedAt) : null,
        }));
        
        console.log(`📥 Fetched ${postsWithNumbers.length} posts for user ${input.userId}`);
        return postsWithNumbers;
      } catch (error) {
        console.error('❌ Error fetching posts for user:', error);
        throw error;
      }
    }),

  // Получить посты в определенной области (для оптимизации)
  getInBounds: publicProcedure
    .input(z.object({
      northEast: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      southWest: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
    }))
    .query(async ({ input }) => {
      // Используем оптимизатор для маленького города
      const { SmallCityOptimizer } = await import('../../../../lib/small-city-optimizer');
      return await SmallCityOptimizer.getOptimizedPosts(input);
    }),

  // Получить посты на модерации
  getPendingModeration: publicProcedure.query(async ({ ctx }) => {
    try {
      const posts = await ctx.prisma.post.findMany({
        where: {
          moderationStatus: 'PENDING',
          needsModeration: true
        },
        orderBy: { timestamp: 'desc' },
        take: 20
      });
      
      // Преобразуем BigInt в число для клиента
      const postsWithNumbers = posts.map(post => ({
        ...post,
        timestamp: Number(post.timestamp),
        expiresAt: Number(post.expiresAt),
        relevanceCheckedAt: post.relevanceCheckedAt ? Number(post.relevanceCheckedAt) : null,
      }));
      
      console.log(`📥 Fetched ${postsWithNumbers.length} posts pending moderation`);
      return postsWithNumbers;
    } catch (error) {
      console.error('❌ Error fetching pending posts:', error);
      throw error;
    }
  }),

  // Ручная модерация (для админов)
  moderate: publicProcedure
    .input(z.object({
      postId: z.string(),
      decision: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED']),
      reason: z.string().optional(),
      moderatorId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.update({
        where: { id: input.postId },
        data: {
          moderationStatus: input.decision as any,
          moderationReason: input.reason,
          moderatedAt: BigInt(Date.now()),
          moderatedBy: input.moderatorId,
          needsModeration: input.decision === 'FLAGGED'
        }
      });

      console.log(`👮 Manual moderation: ${input.postId} -> ${input.decision} by ${input.moderatorId}`);
      
      // Отправляем уведомления в Telegram группу при одобрении
      if (input.decision === 'APPROVED') {
        try {
          const { NotificationService } = await import('../../../notification-service');
          await NotificationService.notifyNewPost(input.postId);
        } catch (error) {
          console.error('❌ Ошибка отправки уведомления в Telegram при одобрении:', error);
        }
      }
      
      // Отправляем WebSocket уведомление о модерации
      try {
        const { wsManager } = await import('../../../websocket-server');
        if (input.decision === 'APPROVED') {
          await wsManager.notifyPostApproval(input.postId, post.userId);
        } else if (input.decision === 'REJECTED') {
          await wsManager.notifyPostRejection(input.postId, post.userId, input.reason || 'Пост не соответствует правилам');
        }
      } catch (error) {
        console.error('❌ Error sending moderation WebSocket notification:', error);
      }
      
      return post;
    }),

  // Запустить ИИ-модерацию для всех ожидающих
  runAIModeration: publicProcedure.mutation(async () => {
    try {
      const { EnhancedAIModeration } = await import('../../../../lib/enhanced-ai-moderation');
      await EnhancedAIModeration.moderatePendingPosts();
      return { success: true, message: 'AI moderation started' };
    } catch (error) {
      console.error('Error running AI moderation:', error);
      throw error;
    }
  }),

  // Получить статистику модерации
  getModerationStats: publicProcedure.query(async () => {
    try {
      const { EnhancedAIModeration } = await import('../../../../lib/enhanced-ai-moderation');
      const stats = await EnhancedAIModeration.getModerationStats();
      return stats;
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      throw error;
    }
  }),

  // Получить оптимизированную статистику
  getOptimizedStats: publicProcedure.query(async () => {
    try {
      const { SmallCityOptimizer } = await import('../../../../lib/small-city-optimizer');
      return await SmallCityOptimizer.getOptimizedStats();
    } catch (error) {
      console.error('Error getting optimized stats:', error);
      throw error;
    }
  }),

  // Очистка данных для маленького города
  cleanupForSmallCity: publicProcedure.mutation(async () => {
    try {
      const { SmallCityOptimizer } = await import('../../../../lib/small-city-optimizer');
      const result = await SmallCityOptimizer.cleanupForSmallCity();
      return result;
    } catch (error) {
      console.error('Error cleaning up for small city:', error);
      throw error;
    }
  }),

  // Кластеризация постов
  clusterPosts: publicProcedure.mutation(async () => {
    try {
      const { SmallCityOptimizer } = await import('../../../../lib/small-city-optimizer');
      const clusters = await SmallCityOptimizer.clusterPostsForSmallCity();
      return { success: true, clusters };
    } catch (error) {
      console.error('Error clustering posts:', error);
      throw error;
    }
  }),

  // Получить рекомендации по оптимизации
  getOptimizationRecommendations: publicProcedure.query(async () => {
    try {
      const { SmallCityOptimizer } = await import('../../../../lib/small-city-optimizer');
      return SmallCityOptimizer.getOptimizationRecommendations();
    } catch (error) {
      console.error('Error getting optimization recommendations:', error);
      throw error;
    }
  }),
});
