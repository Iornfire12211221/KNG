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
      const posts = await ctx.prisma.post.findMany({
        where: {
          expiresAt: {
            gt: now
          },
          needsModeration: false // Показываем только одобренные посты
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      
      console.log(`📥 Fetched ${posts.length} approved posts from database`);
      return posts;
    } catch (error) {
      console.error('❌ Error fetching posts from database:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }),

  // Создать новый пост
  create: publicProcedure
    .input(CreatePostSchema)
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.create({
        data: {
          ...input,
          timestamp: BigInt(input.timestamp),
          expiresAt: BigInt(input.expiresAt),
          relevanceCheckedAt: input.relevanceCheckedAt ? BigInt(input.relevanceCheckedAt) : null,
        }
      });
      
      console.log(`📤 Created new post: ${post.id} by ${post.userName}`);
      return post;
    }),

  // Лайкнуть пост
  like: publicProcedure
    .input(z.object({
      postId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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

  // Получить все посты для админов (включая на модерации)
  getAllForAdmin: publicProcedure.query(async ({ ctx }) => {
    try {
      const now = Date.now();
      const posts = await ctx.prisma.post.findMany({
        where: {
          expiresAt: {
            gt: now
          }
          // Показываем все посты, включая на модерации
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      
      console.log(`📥 Fetched ${posts.length} posts for admin (including moderation)`);
      return posts;
    } catch (error) {
      console.error('❌ Error fetching posts for admin:', error);
      throw error;
    }
  }),

  // Получить посты конкретного пользователя
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const now = Date.now();
        const posts = await ctx.prisma.post.findMany({
          where: {
            userId: input.userId,
            expiresAt: {
              gt: now
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        });
        
        console.log(`📥 Fetched ${posts.length} posts for user ${input.userId}`);
        return posts;
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
  getPendingModeration: publicProcedure.query(async () => {
    try {
      const posts = await ctx.prisma.post.findMany({
        where: {
          moderationStatus: 'PENDING',
          needsModeration: true
        },
        orderBy: { timestamp: 'desc' },
        take: 20
      });
      
      console.log(`📥 Fetched ${posts.length} posts pending moderation`);
      return posts;
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
    .mutation(async ({ input }) => {
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
