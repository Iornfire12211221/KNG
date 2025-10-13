import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Enable CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Mock данные
const mockPosts = [
  {
    id: "1",
    description: "ДПС пост на трассе",
    latitude: 59.3733,
    longitude: 28.6139,
    address: "Кингисепп, Ленинградская область",
    timestamp: Date.now(),
    expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    userId: "user1",
    userName: "Тестовый пользователь",
    type: "dps",
    severity: "medium",
    likes: 0,
    likedBy: [],
    photo: null,
    photos: [],
    needsModeration: false,
    isRelevant: true,
    isApproved: true,
  }
];

// API routes
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.1",
    environment: "production",
    uptime: process.uptime()
  });
});

app.get("/api/posts", (c) => {
  return c.json({
    success: true,
    data: mockPosts
  });
});

// tRPC mock endpoint
app.post("/api/trpc/posts.getAll", async (c) => {
  try {
    const result = {
      result: {
        data: mockPosts
      }
    };
    
    return c.json(result);
  } catch (error) {
    console.error('tRPC error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// SPA routing - serve index.html for all other routes
app.get("*", async (c) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    const data = await fs.readFile(indexPath);
    
    return new Response(data, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('Error serving index.html:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ДПС Кингисепп</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>🚀 ДПС Кингисепп</h1>
        <p>Приложение запущено!</p>
        <p>API доступно: <a href="/api/health">/api/health</a></p>
        <p>Посты: <a href="/api/posts">/api/posts</a></p>
      </body>
      </html>
    `);
  }
});

export default app;
