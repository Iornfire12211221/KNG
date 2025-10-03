import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '../../create-context';
import { prisma } from '../../../../lib/prisma';

// Схемы валидации
const CreateCommentSchema = z.object({
  content: z.string().min(1).max(500),
  postId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userPhotoUrl: z.string().optional(),
  timestamp: z.number(),
});

export const commentsRouter = createTRPCRouter({
  // Получить комментарии к посту
  getByPostId: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input }) => {
      const comments = await prisma.comment.findMany({
        where: { postId: input.postId },
        orderBy: { timestamp: 'asc' }
      });
      
      console.log(`💬 Fetched ${comments.length} comments for post ${input.postId}`);
      return comments;
    }),

  // Создать комментарий
  create: publicProcedure
    .input(CreateCommentSchema)
    .mutation(async ({ input }) => {
      const comment = await prisma.comment.create({
        data: {
          ...input,
          timestamp: BigInt(input.timestamp),
        }
      });
      
      console.log(`💬 Comment created: ${comment.id} by ${comment.userName}`);
      return comment;
    }),

  // Удалить комментарий
  delete: publicProcedure
    .input(z.object({
      commentId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const comment = await prisma.comment.findUnique({
        where: { id: input.commentId }
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      // Проверяем права на удаление (только автор может удалить)
      if (comment.userId !== input.userId) {
        throw new Error('Not authorized to delete this comment');
      }

      await prisma.comment.delete({
        where: { id: input.commentId }
      });

      console.log(`🗑️ Comment ${input.commentId} deleted by ${input.userId}`);
      return { success: true };
    }),
});
