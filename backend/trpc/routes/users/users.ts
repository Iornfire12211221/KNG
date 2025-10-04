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

const UpdateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN', 'FOUNDER']),
  updatedBy: z.string(), // ID пользователя, который обновляет роль
});

const GetUsersByRoleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR', 'ADMIN', 'FOUNDER']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
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

  // Получить всех пользователей с фильтрацией по роли
  getAll: publicProcedure
    .input(GetUsersByRoleSchema)
    .query(async ({ input }) => {
      const where = input.role ? { role: input.role } : {};
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
          select: {
            id: true,
            telegramId: true,
            name: true,
            username: true,
            photoUrl: true,
            role: true,
            isMuted: true,
            isBanned: true,
            isKicked: true,
            locationPermission: true,
            createdAt: true,
            updatedAt: true,
          }
        }),
        prisma.user.count({ where })
      ]);

      return {
        users,
        total,
        hasMore: input.offset + input.limit < total
      };
    }),

  // Обновить роль пользователя
  updateRole: publicProcedure
    .input(UpdateUserRoleSchema)
    .mutation(async ({ input }) => {
      // Проверяем права доступа
      const updater = await prisma.user.findUnique({
        where: { id: input.updatedBy }
      });

      if (!updater || !['ADMIN', 'FOUNDER'].includes(updater.role)) {
        throw new Error('Недостаточно прав для изменения роли');
      }

      // Проверяем, что FOUNDER не может быть изменен
      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId }
      });

      if (targetUser?.role === 'FOUNDER' && updater.role !== 'FOUNDER') {
        throw new Error('Только основатель может изменять роль другого основателя');
      }

      // Обновляем роль
      const updatedUser = await prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: {
          id: true,
          telegramId: true,
          name: true,
          username: true,
          role: true,
          updatedAt: true,
        }
      });

      console.log(`👑 Role updated: ${updatedUser.name} -> ${updatedUser.role} by ${updater.name}`);
      
      return updatedUser;
    }),

  // Получить статистику пользователей
  getStats: publicProcedure
    .query(async () => {
      const [total, byRole] = await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({
          by: ['role'],
          _count: { role: true }
        })
      ]);

      const stats = {
        total,
        founders: 0,
        admins: 0,
        moderators: 0,
        users: 0
      };

      byRole.forEach(item => {
        switch (item.role) {
          case 'FOUNDER':
            stats.founders = item._count.role;
            break;
          case 'ADMIN':
            stats.admins = item._count.role;
            break;
          case 'MODERATOR':
            stats.moderators = item._count.role;
            break;
          case 'USER':
            stats.users = item._count.role;
            break;
        }
      });

      return stats;
    }),

  // Назначить модератора
  promoteToModerator: publicProcedure
    .input(z.object({ 
      userId: z.string(),
      updatedBy: z.string()
    }))
    .mutation(async ({ input }) => {
      return await prisma.user.update({
        where: { id: input.userId },
        data: { role: 'MODERATOR' }
      });
    }),

  // Снять с модератора
  demoteFromModerator: publicProcedure
    .input(z.object({ 
      userId: z.string(),
      updatedBy: z.string()
    }))
    .mutation(async ({ input }) => {
      return await prisma.user.update({
        where: { id: input.userId },
        data: { role: 'USER' }
      });
    }),
});
