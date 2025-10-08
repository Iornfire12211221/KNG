const { Hono } = require("hono");
const { cors } = require("hono/cors");
const { serveStatic } = require("hono/node-server");
const { serve } = require("@hono/node-server");
const fs = require("fs");
const path = require("path");

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

// Простые тестовые данные
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
    isApproved: true,
  }
];

// Получить все активные посты
api.get("/posts", async (c) => {
  try {
    const now = Date.now();
    const activePosts = mockPosts.filter(post => post.expiresAt > now);
    
    return c.json({ success: true, data: activePosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ success: false, error: 'Failed to fetch posts' }, 500);
  }
});

// Создать новый пост
api.post("/posts", async (c) => {
  try {
    const body = await c.req.json();
    
    const newPost = {
      id: Date.now().toString(),
      description: body.description || "Новый пост",
      latitude: body.latitude || 59.3733,
      longitude: body.longitude || 28.6139,
      address: body.address || "Кингисепп",
      timestamp: Date.now(),
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
      userId: body.userId || "anonymous",
      userName: body.userName || "Anonymous",
      type: body.type || "dps",
      severity: body.severity || "medium",
      likes: 0,
      isApproved: true,
    };
    
    mockPosts.push(newPost);
    
    return c.json({ success: true, data: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json({ success: false, error: 'Failed to create post' }, 500);
  }
});

// Health check
api.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "1.0.1",
    message: "Simple server is running",
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Монтируем API
app.route("/api", api);

// Статические файлы для продакшена
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), 'dist');
  
  if (fs.existsSync(distPath)) {
    console.log("Serving static files from ./dist");
    app.use("/*", serveStatic({ root: "./dist" }));
  } else {
    console.log("Dist directory not found, serving simple response");
    app.get("/*", (c) => {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ДПС Кингисепп</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #007AFF; }
            .status { color: green; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 ДПС Кингисепп</h1>
            <p class="status">✅ Приложение запущено и работает!</p>
            <p>API доступно по адресу: <a href="/api/health">/api/health</a></p>
            <p>Время: ${new Date().toLocaleString('ru-RU')}</p>
            <p>Node.js версия: ${process.version}</p>
            <p>Платформа: ${process.platform}</p>
          </div>
        </body>
        </html>
      `);
    });
  }
} else {
  // В режиме разработки
  app.get("/*", (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ДПС Кингисепп - Development</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #007AFF; }
          .status { color: orange; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 ДПС Кингисепп - Development</h1>
          <p class="status">🔧 Сервер запущен в режиме разработки</p>
          <p>API доступно по адресу: <a href="/api/health">/api/health</a></p>
          <p>Время: ${new Date().toLocaleString('ru-RU')}</p>
          <p>Node.js версия: ${process.version}</p>
          <p>Платформа: ${process.platform}</p>
        </div>
      </body>
      </html>
    `);
  });
}

// Обработка ошибок
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ success: false, error: 'Internal server error', details: err.message }, 500);
});

// Запуск сервера
const port = process.env.PORT || 8081;

console.log(`🚀 Simple server starting on port ${port}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);

serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`✅ Simple server running at http://localhost:${info.port}`);
  console.log(`🔗 Health check: http://localhost:${info.port}/api/health`);
  console.log(`🌐 Main page: http://localhost:${info.port}/`);
});
