import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { serve } from "@hono/node-server";
import { PrismaClient } from '@prisma/client';

// Создаем экземпляр Prisma
const prisma = new PrismaClient();

// Создаем приложение
const app = new Hono();

// CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// API маршруты
const api = new Hono();

// Получить все активные посты
api.get("/posts", async (c) => {
  try {
    const now = BigInt(Date.now());
    const posts = await prisma.post.findMany({
      where: {
        expiresAt: { gt: now },
        isApproved: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 100, // Ограничиваем количество
    });
    
    return c.json({ success: true, data: posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ success: false, error: 'Failed to fetch posts' }, 500);
  }
});

// Создать новый пост
api.post("/posts", async (c) => {
  try {
    const body = await c.req.json();
    
    // Валидация
    if (!body.description || !body.latitude || !body.longitude) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const post = await prisma.post.create({
      data: {
        description: body.description,
        latitude: body.latitude,
        longitude: body.longitude,
        address: body.address,
        timestamp: BigInt(Date.now()),
        expiresAt: BigInt(Date.now() + 4 * 60 * 60 * 1000), // 4 часа
        userId: body.userId || 'anonymous',
        userName: body.userName || 'Anonymous',
        type: body.type || 'dps',
        severity: body.severity || 'medium',
        photo: body.photo,
        isApproved: body.severity === 'high', // Автоодобрение для критичных
      },
    });
    
    return c.json({ success: true, data: post });
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json({ success: false, error: 'Failed to create post' }, 500);
  }
});

// Получить пользователя по Telegram ID
api.get("/users/:telegramId", async (c) => {
  try {
    const telegramId = c.req.param('telegramId');
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });
    
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ success: false, error: 'Failed to fetch user' }, 500);
  }
});

// Создать/обновить пользователя
api.post("/users", async (c) => {
  try {
    const body = await c.req.json();
    
    const user = await prisma.user.upsert({
      where: { telegramId: body.telegramId },
      update: {
        name: body.name,
        username: body.username,
        photoUrl: body.photoUrl,
      },
      create: {
        telegramId: body.telegramId,
        name: body.name,
        username: body.username,
        photoUrl: body.photoUrl,
      },
    });
    
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return c.json({ success: false, error: 'Failed to create/update user' }, 500);
  }
});

// Health check
api.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "1.0.1"
  });
});

// Монтируем API
app.route("/api", api);

// Статические файлы для продакшена
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
}

// Обработка ошибок
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// Запуск сервера
const port = process.env.PORT || 8081;

console.log(`🚀 Server starting on port ${port}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);

serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`✅ Server running at http://localhost:${info.port}`);
});
