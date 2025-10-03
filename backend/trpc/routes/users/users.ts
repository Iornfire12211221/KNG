import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '../../create-context';
import { prisma } from '../../../../lib/prisma';

// Схемы валидации
const CreateUserSchema = z.object({
  telegramId: z.string(),
  name: z.string(),
  username: z.string().optional(),
  photoUrl: z.string().optional(),
});

const UpdateUserSchema = z.object({
  userId: z.string(),
  locationPermission: z.boolean().optional(),
  lastPostTime: z.number().optional(),
});

export const usersRouter = createTRPCRouter({
  // Создать или обновить пользователя
  upsert: publicProcedure
    .input(CreateUserSchema)
    .mutation(async ({ input }) => {
      const user = await prisma.user.upsert({
        where: { telegramId: input.telegramId },
        update: {
          name: input.name,
          username: input.username,
          photoUrl: input.photoUrl,
        },
        create: {
          telegramId: input.telegramId,
          name: input.name,
          username: input.username,
          photoUrl: input.photoUrl,
        }
      });
      
      console.log(`👤 User upserted: ${user.id} (${user.name})`);
      return user;
    }),

  // Получить пользователя по Telegram ID
  getByTelegramId: publicProcedure
    .input(z.object({ telegramId: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { telegramId: input.telegramId }
      });
      
      return user;
    }),

  // Обновить разрешение на геолокацию
  updateLocationPermission: publicProcedure
    .input(z.object({
      userId: z.string(),
      locationPermission: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.update({
        where: { id: input.userId },
        data: { locationPermission: input.locationPermission }
      });
      
      console.log(`📍 User ${input.userId} location permission: ${input.locationPermission}`);
      return user;
    }),

  // Обновить время последнего поста
  updateLastPostTime: publicProcedure
    .input(z.object({
      userId: z.string(),
      lastPostTime: z.number(),
    }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.update({
        where: { id: input.userId },
        data: { lastPostTime: BigInt(input.lastPostTime) }
      });
      
      console.log(`⏰ User ${input.userId} last post time updated`);
      return user;
    }),

  // Проверить можно ли создать пост (индивидуальный таймер)
  canCreatePost: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId }
      });

      if (!user || !user.lastPostTime) {
        return { canCreate: true, timeLeft: 0 };
      }

      const now = Date.now();
      const timeSinceLastPost = now - Number(user.lastPostTime);
      const cooldownTime = 60 * 1000; // 1 минута в миллисекундах

      if (timeSinceLastPost >= cooldownTime) {
        return { canCreate: true, timeLeft: 0 };
      }

      const timeLeft = cooldownTime - timeSinceLastPost;
      return { canCreate: false, timeLeft: Math.ceil(timeLeft / 1000) };
    }),
});
