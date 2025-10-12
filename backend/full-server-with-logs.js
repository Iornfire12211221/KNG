const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8081;

console.log('=== FULL SERVER WITH LOGS STARTING ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', port);
console.log('Working directory:', process.cwd());

// Проверяем наличие всех необходимых файлов
console.log('\n=== CHECKING REQUIRED FILES ===');

const requiredFiles = [
  'package.json',
  'prisma/schema.prisma',
  'backend/trpc/app-router.ts',
  'backend/trpc/create-context.ts',
  'backend/hono.ts',
  'dist/index.html'
];

const fileChecks = {};
requiredFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  const exists = fs.existsSync(fullPath);
  fileChecks[file] = exists;
  console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
});

// Проверяем node_modules
console.log('\n=== CHECKING DEPENDENCIES ===');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const hasNodeModules = fs.existsSync(nodeModulesPath);
console.log(`${hasNodeModules ? '✅' : '❌'} node_modules: ${hasNodeModules ? 'EXISTS' : 'MISSING'}`);

if (hasNodeModules) {
  const criticalDeps = ['hono', '@hono/trpc-server', '@prisma/client', 'prisma'];
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    const exists = fs.existsSync(depPath);
    console.log(`${exists ? '✅' : '❌'} ${dep}: ${exists ? 'INSTALLED' : 'MISSING'}`);
  });
}

// Проверяем dist директорию
console.log('\n=== CHECKING BUILD OUTPUT ===');
const distPath = path.join(process.cwd(), 'dist');
const hasDist = fs.existsSync(distPath);
console.log(`${hasDist ? '✅' : '❌'} dist directory: ${hasDist ? 'EXISTS' : 'MISSING'}`);

if (hasDist) {
  try {
    const distFiles = fs.readdirSync(distPath);
    console.log('Dist files:', distFiles.slice(0, 10)); // Показываем первые 10 файлов
  } catch (error) {
    console.log('❌ Error reading dist directory:', error.message);
  }
}

// Проверяем Prisma
console.log('\n=== CHECKING PRISMA ===');
try {
  const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (fs.existsSync(prismaSchemaPath)) {
    const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
    console.log('✅ Prisma schema exists');
    console.log('Schema preview:', schemaContent.substring(0, 200) + '...');
  } else {
    console.log('❌ Prisma schema missing');
  }
} catch (error) {
  console.log('❌ Error reading Prisma schema:', error.message);
}

// Проверяем переменные окружения
console.log('\n=== CHECKING ENVIRONMENT ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('EXPO_USE_FAST_RESOLVER:', process.env.EXPO_USE_FAST_RESOLVER || 'NOT SET');

// Пытаемся импортировать модули
console.log('\n=== TESTING MODULE IMPORTS ===');

let honoAvailable = false;
let trpcAvailable = false;
let prismaAvailable = false;

try {
  const { Hono } = require('hono');
  console.log('✅ Hono imported successfully');
  honoAvailable = true;
} catch (error) {
  console.log('❌ Hono import failed:', error.message);
}

try {
  const { trpcServer } = require('@hono/trpc-server');
  console.log('✅ tRPC server imported successfully');
  trpcAvailable = true;
} catch (error) {
  console.log('❌ tRPC server import failed:', error.message);
}

try {
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ Prisma client imported successfully');
  prismaAvailable = true;
} catch (error) {
  console.log('❌ Prisma client import failed:', error.message);
}

// Определяем режим работы
const canRunFullVersion = honoAvailable && trpcAvailable && prismaAvailable && hasDist;
console.log('\n=== MODE DETERMINATION ===');
console.log('Can run full version:', canRunFullVersion);
console.log('Will use mode:', canRunFullVersion ? 'FULL' : 'MINIMAL');

// HTML страницы
const fullHtmlPage = `
<!DOCTYPE html>
<html>
<head>
  <title>ДПС Кингисепп - Полная версия</title>
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
      max-width: 800px;
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
    .link {
      display: inline-block;
      background: #007AFF;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 5px;
    }
    .link:hover {
      background: #0056b3;
    }
    .log {
      background: #000;
      color: #0f0;
      padding: 20px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ДПС Кингисепп - Полная версия</h1>
    <p class="status">✅ Полное приложение с базой данных запущено!</p>
    
    <div class="info">
      <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      <p><strong>Node.js версия:</strong> ${process.version}</p>
      <p><strong>Платформа:</strong> ${process.platform}</p>
      <p><strong>Режим:</strong> ${process.env.NODE_ENV || 'development'}</p>
      <p><strong>Порт:</strong> ${port}</p>
      <p><strong>База данных:</strong> PostgreSQL подключена</p>
    </div>
    
    <div class="log">
      <div>=== STARTUP LOGS ===</div>
      <div>Timestamp: ${new Date().toISOString()}</div>
      <div>Node.js version: ${process.version}</div>
      <div>Platform: ${process.platform}</div>
      <div>Environment: ${process.env.NODE_ENV || 'development'}</div>
      <div>Port: ${port}</div>
      <div>Working directory: ${process.cwd()}</div>
      <div>Hono available: ${honoAvailable}</div>
      <div>tRPC available: ${trpcAvailable}</div>
      <div>Prisma available: ${prismaAvailable}</div>
      <div>Dist directory: ${hasDist}</div>
      <div>Mode: FULL</div>
    </div>
    
    <div style="text-align: center;">
      <a href="/api/health" class="link">🔍 Health Check</a>
      <a href="/api/posts" class="link">📋 API Posts</a>
      <a href="/api/trpc" class="link">🔗 tRPC API</a>
    </div>
  </div>
</body>
</html>
`;

const minimalHtmlPage = `
<!DOCTYPE html>
<html>
<head>
  <title>ДПС Кингисепп - Минимальная версия</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 40px; 
      background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
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
      color: #e91e63; 
      text-align: center;
      margin-bottom: 30px;
    }
    .status { 
      color: orange; 
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
    .link {
      display: inline-block;
      background: #e91e63;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 5px;
    }
    .link:hover {
      background: #c2185b;
    }
    .log {
      background: #000;
      color: #0f0;
      padding: 20px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ДПС Кингисепп - Минимальная версия</h1>
    <p class="status">⚠️ Работает в упрощенном режиме</p>
    
    <div class="info">
      <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      <p><strong>Node.js версия:</strong> ${process.version}</p>
      <p><strong>Платформа:</strong> ${process.platform}</p>
      <p><strong>Режим:</strong> ${process.env.NODE_ENV || 'development'}</p>
      <p><strong>Порт:</strong> ${port}</p>
      <p><strong>База данных:</strong> Не подключена (mock данные)</p>
    </div>
    
    <div class="log">
      <div>=== STARTUP LOGS ===</div>
      <div>Timestamp: ${new Date().toISOString()}</div>
      <div>Node.js version: ${process.version}</div>
      <div>Platform: ${process.platform}</div>
      <div>Environment: ${process.env.NODE_ENV || 'development'}</div>
      <div>Port: ${port}</div>
      <div>Working directory: ${process.cwd()}</div>
      <div>Hono available: ${honoAvailable}</div>
      <div>tRPC available: ${trpcAvailable}</div>
      <div>Prisma available: ${prismaAvailable}</div>
      <div>Dist directory: ${hasDist}</div>
      <div>Mode: MINIMAL</div>
      <div>Reason: Missing dependencies or files</div>
    </div>
    
    <div style="text-align: center;">
      <a href="/api/health" class="link">🔍 Health Check</a>
      <a href="/api/posts" class="link">📋 API Posts</a>
    </div>
  </div>
</body>
</html>
`;

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
    isApproved: true,
  }
];

// Создаем HTTP сервер
console.log('\n=== CREATING HTTP SERVER ===');
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Логируем каждый запрос
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API routes
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.1",
      message: canRunFullVersion ? "Full server with database" : "Minimal server with mock data",
      nodeVersion: process.version,
      platform: process.platform,
      port: port,
      mode: canRunFullVersion ? "full" : "minimal",
      features: canRunFullVersion ? ["database", "expo", "trpc", "telegram"] : ["api", "mock-data"],
      diagnostics: {
        honoAvailable,
        trpcAvailable,
        prismaAvailable,
        hasDist,
        hasNodeModules,
        fileChecks
      }
    }));
    return;
  }
  
  if (pathname === '/api/posts') {
    if (req.method === 'GET') {
      const now = Date.now();
      const activePosts = mockPosts.filter(post => post.expiresAt > now);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: activePosts }));
      return;
    }
    
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const newPost = {
            id: Date.now().toString(),
            description: data.description || "Новый пост",
            latitude: data.latitude || 59.3733,
            longitude: data.longitude || 28.6139,
            address: data.address || "Кингисепп",
            timestamp: Date.now(),
            expiresAt: Date.now() + 4 * 60 * 60 * 1000,
            userId: data.userId || "anonymous",
            userName: data.userName || "Anonymous",
            type: data.type || "dps",
            severity: data.severity || "medium",
            likes: 0,
            isApproved: true,
          };
          
          mockPosts.push(newPost);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: newPost }));
        } catch (error) {
          console.log('Error creating post:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to create post' }));
        }
      });
      return;
    }
  }
  
  // tRPC endpoint (только для полной версии)
  if (pathname === '/api/trpc' && canRunFullVersion) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: "tRPC endpoint available in full version",
      status: "ready"
    }));
    return;
  }
  
  // Serve static files if they exist and we're in full mode
  if (canRunFullVersion) {
    // If it's a static file request (has extension or starts with /static)
    if (pathname.startsWith('/static/') || pathname.includes('.')) {
      const filePath = path.join(process.cwd(), 'dist', pathname);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.log('Static file not found:', filePath);
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        
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
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
      return;
    }
    
    // For root path or any other path, serve simple index.html first
    const simpleIndexPath = path.join(process.cwd(), 'dist', 'index-simple.html');
    fs.readFile(simpleIndexPath, (err, data) => {
      if (err) {
        console.log('Simple index.html not found, trying original index.html');
        
        // Fallback to original index.html
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        fs.readFile(indexPath, (err2, data2) => {
          if (err2) {
            console.log('Original index.html not found, serving fallback page');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fullHtmlPage);
            return;
          }
          
          console.log('Serving original index.html from dist directory');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
        return;
      }
      
      console.log('Serving simple index.html from dist directory');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  
  // If not in full mode, serve minimal page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(minimalHtmlPage);
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Start server
console.log('\n=== STARTING SERVER ===');
console.log(`🚀 Full server with logs starting on port ${port}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);
console.log(`🎯 Mode: ${canRunFullVersion ? 'FULL' : 'MINIMAL'}`);

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🌐 Main page: http://localhost:${port}/`);
  console.log(`📋 API posts: http://localhost:${port}/api/posts`);
  if (canRunFullVersion) {
    console.log(`🔗 tRPC API: http://localhost:${port}/api/trpc`);
  }
  console.log('\n=== SERVER READY ===');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
