import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { serveStatic } from "hono/node-server";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { serve } from "@hono/node-server";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { wsManager } from "./websocket-server";

// Устанавливаем NODE_ENV если не установлен
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Загружаем конфигурацию из файла, если переменные окружения не установлены
try {
  if (!process.env.DATABASE_URL) {
    const config = require('../app-config.js');
    if (config.DATABASE_URL) {
      process.env.DATABASE_URL = config.DATABASE_URL;
      console.log('✅ Loaded DATABASE_URL from app-config.js');
    }
  }
} catch (error) {
  console.log('ℹ️ app-config.js not found, using environment variables');
}

// Загружаем конфигурацию Telegram Bot
try {
  const telegramConfig = require('./telegram-config.js');
  if (telegramConfig.TELEGRAM_BOT_TOKEN) {
    process.env.TELEGRAM_BOT_TOKEN = telegramConfig.TELEGRAM_BOT_TOKEN;
    console.log('✅ Loaded TELEGRAM_BOT_TOKEN from telegram-config.js');
  }
        if (telegramConfig.TELEGRAM_CHANNEL_CHAT_ID) {
          process.env.TELEGRAM_CHANNEL_CHAT_ID = telegramConfig.TELEGRAM_CHANNEL_CHAT_ID;
          console.log('✅ Loaded TELEGRAM_CHANNEL_CHAT_ID from telegram-config.js');
        }
} catch (error) {
  console.log('ℹ️ telegram-config.js not found, using environment variables');
}

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

// WebSocket statistics endpoint
api.get("/ws/stats", (c) => {
  return c.json({
    websocket: wsManager.getStats(),
    timestamp: new Date().toISOString(),
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
      
      // Serve static files manually for better control
      app.get("/*", async (c) => {
        const url = new URL(c.req.url);
        const pathname = url.pathname;
        
        // If it's an API route, don't handle it here
        if (pathname.startsWith('/api/')) {
          return c.text('Not found', 404);
        }
        
        // For static files with extensions
        if (pathname.includes('.') && !pathname.startsWith('/api/')) {
          const filePath = path.join(process.cwd(), 'dist', pathname);
          try {
            const data = await fs.promises.readFile(filePath);
            const ext = path.extname(pathname);
            const contentType = {
              '.html': 'text/html',
              '.css': 'text/css',
              '.js': 'application/javascript',
              '.json': 'application/json',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.gif': 'image/gif',
              '.ico': 'image/x-icon'
            }[ext] || 'text/plain';
            
            return new Response(data, {
              headers: { 'Content-Type': contentType }
            });
          } catch (error) {
            console.log('Static file not found:', filePath);
            return c.text('File not found', 404);
          }
        }
        
        // For all other routes, serve index.html (SPA routing)
        try {
          const indexPath = path.join(process.cwd(), 'dist', 'index.html');
          let indexData = await fs.promises.readFile(indexPath);
          let indexContent = indexData.toString();
          
          // Add Telegram WebApp script if not present
          if (!indexContent.includes('telegram.org/js/telegram-web-app.js')) {
            const telegramScript = `
              <script src="https://telegram.org/js/telegram-web-app.js"></script>
              <script>
                // Ensure Telegram WebApp is available
                if (window.Telegram && window.Telegram.WebApp) {
                  console.log('✅ Telegram WebApp API loaded successfully');
                } else {
                  console.log('⚠️ Telegram WebApp API not loaded, will use URL parsing');
                }
              </script>
            `;
            indexContent = indexContent.replace('</head>', `${telegramScript}</head>`);
          }
          
          console.log('Serving index.html with Telegram WebApp support');
          return new Response(indexContent, {
            headers: { 
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org https://api.telegram.org https://*.mapbox.com https://api.mapbox.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss: ws:;"
            }
          });
        } catch (error) {
          console.log('Index.html not found, serving fallback');
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
              <p>Приложение запущено, но index.html не найден</p>
              <p>API доступно: <a href="/api/health">/api/health</a></p>
            </body>
            </html>
          `);
        }
      });
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

// Запуск сервера с поддержкой WebSocket
const port = process.env.PORT || 8081;
const wsPort = process.env.WS_PORT || 8080;

console.log(`🚀 Full server starting on port ${port}`);
console.log(`🔌 WebSocket server starting on port ${wsPort}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);

// Создаем HTTP сервер для Hono
const httpServer = createServer();

// Запускаем Hono сервер
serve({
  fetch: app.fetch,
  port: Number(port),
}, (info) => {
  console.log(`✅ Full server running at http://localhost:${info.port}`);
  console.log(`🔗 Health check: http://localhost:${info.port}/api/health`);
  console.log(`🔗 tRPC API: http://localhost:${info.port}/api/trpc`);
});

// Запускаем WebSocket сервер на отдельном порту
const wsServer = createServer();
wsManager.start(wsServer, Number(wsPort));

wsServer.listen(Number(wsPort), () => {
  console.log(`🔌 WebSocket server running on port ${wsPort}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  wsManager.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  wsManager.stop();
  process.exit(0);
});
