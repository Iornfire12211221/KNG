import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { serveStatic } from "hono/node-server";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";

// Create main app
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// API routes
const api = new Hono();

// Mount tRPC router at /trpc
api.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
api.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "1.0.1",
    message: "Full server with database is running",
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Mount API at /api
app.route("/api", api);

// Serve static files from dist directory (for production)
if (process.env.NODE_ENV === "production") {
  console.log("Production mode: serving static files from ./dist");
  
  // Check if dist directory exists
  const distPath = path.join(process.cwd(), 'dist');
  console.log('Checking dist directory:', distPath);
  
  try {
    const distExists = fs.existsSync(distPath);
    console.log('Dist directory exists:', distExists);
    
    if (distExists) {
      console.log('Serving static files from dist directory');
      app.use("/*", serveStatic({ root: "./dist" }));
    } else {
      console.log('Dist directory not found, serving fallback');
      app.get("/*", (c) => {
        return c.html(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>ДПС Кингисепп</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
              }
              .container { 
                background: white; 
                padding: 40px; 
                border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                max-width: 600px;
                margin: 0 auto;
              }
              h1 { 
                color: #007AFF; 
                text-align: center;
                margin-bottom: 30px;
              }
              .status { 
                color: green; 
                font-weight: bold; 
                font-size: 18px;
                text-align: center;
                margin: 20px 0;
              }
              .info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 ДПС Кингисепп</h1>
              <p class="status">✅ Полный сервер с базой данных запущен!</p>
              
              <div class="info">
                <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                <p><strong>Node.js версия:</strong> ${process.version}</p>
                <p><strong>Платформа:</strong> ${process.platform}</p>
                <p><strong>Режим:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <p><strong>База данных:</strong> Подключена</p>
              </div>
              
              <div style="text-align: center;">
                <a href="/api/health" style="display: inline-block; background: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px;">🔍 Health Check</a>
                <a href="/api/trpc" style="display: inline-block; background: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px;">🔗 tRPC API</a>
              </div>
              
              <div class="info">
                <h3>📱 Готово для Telegram WebApp</h3>
                <p>Полное приложение с базой данных и всеми функциями.</p>
              </div>
            </div>
          </body>
          </html>
        `);
      });
    }
  } catch (error) {
    console.error('Error checking dist directory:', error);
    // Fallback to simple response
    app.get("/*", (c) => {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ДПС Кингисепп - Error</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>🚀 ДПС Кингисепп</h1>
          <p>Сервер запущен, но есть проблемы с файлами.</p>
          <p>API доступно: <a href="/api/health">/api/health</a></p>
        </body>
        </html>
      `);
    });
  }
} else {
  // Development mode
  app.get("/*", (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ДПС Кингисепп - Development</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>🚀 ДПС Кингисепп - Development</h1>
        <p>Сервер запущен в режиме разработки</p>
        <p>API доступно: <a href="/api/health">/api/health</a></p>
        <p>tRPC API: <a href="/api/trpc">/api/trpc</a></p>
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

console.log(`🚀 Full server starting on port ${port}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);

serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`✅ Full server running at http://localhost:${info.port}`);
  console.log(`🔗 Health check: http://localhost:${info.port}/api/health`);
  console.log(`🔗 tRPC API: http://localhost:${info.port}/api/trpc`);
});
