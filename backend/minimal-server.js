const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8081;

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

// HTML страница
const htmlPage = `
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
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ДПС Кингисепп</h1>
    <p class="status">✅ Приложение запущено и работает!</p>
    
    <div class="info">
      <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
      <p><strong>Node.js версия:</strong> ${process.version}</p>
      <p><strong>Платформа:</strong> ${process.platform}</p>
      <p><strong>Режим:</strong> ${process.env.NODE_ENV || 'development'}</p>
      <p><strong>Порт:</strong> ${port}</p>
    </div>
    
    <div style="text-align: center;">
      <a href="/api/health" class="link">🔍 Health Check</a>
      <a href="/api/posts" class="link">📋 API Posts</a>
    </div>
    
    <div class="info">
      <h3>📱 Готово для Telegram WebApp</h3>
      <p>Приложение оптимизировано для развертывания в Telegram Mini Apps.</p>
      <p><strong>Сервер:</strong> Минимальный Node.js сервер без внешних зависимостей</p>
    </div>
  </div>
</body>
</html>
`;

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
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
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // API routes
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.1",
      message: "Minimal Node.js server is running",
      nodeVersion: process.version,
      platform: process.platform,
      port: port
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
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to create post' }));
        }
      });
      return;
    }
  }
  
  // Serve static files if they exist
  if (pathname.startsWith('/static/') || pathname.includes('.')) {
    const filePath = path.join(__dirname, '..', 'dist', pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
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
  
  // Default route - serve HTML page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Start server
console.log(`🚀 Minimal Node.js server starting on port ${port}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Minimal server running at http://localhost:${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🌐 Main page: http://localhost:${port}/`);
  console.log(`📋 API posts: http://localhost:${port}/api/posts`);
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
