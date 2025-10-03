import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '../../create-context';
import { prisma } from '../../../../lib/prisma';

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
});

export const postsRouter = createTRPCRouter({
  // Получить все активные посты (только одобренные для обычных пользователей)
  getAll: publicProcedure.query(async () => {
    try {
      const now = Date.now();
      const posts = await prisma.post.findMany({
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
    .mutation(async ({ input }) => {
      const post = await prisma.post.create({
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
      const post = await prisma.post.findUnique({
        where: { id: input.postId }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      const likedBy = post.likedBy || [];
      const hasLiked = likedBy.includes(input.userId);

      const updatedPost = await prisma.post.update({
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
      const post = await prisma.post.findUnique({
        where: { id: input.postId }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Проверяем права на удаление (только автор может удалить)
      if (post.userId !== input.userId) {
        throw new Error('Not authorized to delete this post');
      }

      await prisma.post.delete({
        where: { id: input.postId }
      });

      console.log(`🗑️ Post ${input.postId} deleted by ${input.userId}`);
      return { success: true };
    }),

  // Очистить просроченные посты
  clearExpired: publicProcedure.mutation(async () => {
    const now = Date.now();
    const result = await prisma.post.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`🧹 Cleared ${result.count} expired posts`);
    return { deletedCount: result.count };
  }),

  // Получить все посты для админов (включая на модерации)
  getAllForAdmin: publicProcedure.query(async () => {
    try {
      const now = Date.now();
      const posts = await prisma.post.findMany({
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
        const posts = await prisma.post.findMany({
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
      const now = Date.now();
      const posts = await prisma.post.findMany({
        where: {
          AND: [
            { expiresAt: { gt: now } },
            { needsModeration: false }, // Только одобренные посты
            { latitude: { gte: input.southWest.latitude, lte: input.northEast.latitude } },
            { longitude: { gte: input.southWest.longitude, lte: input.northEast.longitude } },
          ]
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      console.log(`🗺️ Fetched ${posts.length} approved posts in bounds`);
      return posts;
    }),
});
