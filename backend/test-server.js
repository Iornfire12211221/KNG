const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8081;

console.log('=== TEST SERVER STARTING ===');
console.log('Port:', port);
console.log('Working directory:', process.cwd());

// Простая HTML страница
const testHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ДПС Кингисепп - Тест</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      max-width: 600px;
      text-align: center;
    }
    h1 { color: #007AFF; font-size: 32px; margin-bottom: 20px; }
    .status { color: #34C759; font-weight: bold; font-size: 20px; margin: 20px 0; }
    .info { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .button {
      display: inline-block;
      background: #007AFF;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 10px;
      margin: 10px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ДПС Кингисепп</h1>
    <p class="status">✅ ТЕСТОВЫЙ СЕРВЕР РАБОТАЕТ!</p>
    
    <div class="info">
      <h3>📱 Информация о сервере</h3>
      <p><strong>Время:</strong> <span id="time"></span></p>
      <p><strong>Порт:</strong> ${port}</p>
      <p><strong>Рабочая директория:</strong> ${process.cwd()}</p>
      <p><strong>Node.js версия:</strong> ${process.version}</p>
    </div>
    
    <div class="info">
      <h3>🔗 Доступные ссылки</h3>
      <p><a href="/api/health" class="button">API Health Check</a></p>
      <p><a href="/api/posts" class="button">API Posts</a></p>
      <p><a href="/test" class="button">Тестовая страница</a></p>
    </div>
    
    <p style="margin-top: 30px; color: #666;">
      <strong>Если вы видите эту страницу, сервер работает правильно!</strong><br>
      Это означает, что проблема не в сервере, а в другом месте.
    </p>
  </div>
  
  <script>
    document.getElementById('time').textContent = new Date().toLocaleString('ru-RU');
    console.log('✅ Test server page loaded successfully!');
    
    // Проверяем API
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        console.log('✅ API Health Check:', data);
        const statusDiv = document.createElement('div');
        statusDiv.innerHTML = '<p style="color: #34C759; font-weight: bold;">✅ API работает: ' + data.status + '</p>';
        document.querySelector('.info').appendChild(statusDiv);
      })
      .catch(error => {
        console.error('❌ API Health Check failed:', error);
        const statusDiv = document.createElement('div');
        statusDiv.innerHTML = '<p style="color: #FF3B30; font-weight: bold;">❌ API недоступно: ' + error.message + '</p>';
        document.querySelector('.info').appendChild(statusDiv);
      });
  </script>
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
      version: "1.0.1-test",
      message: "Test server is running",
      nodeVersion: process.version,
      platform: process.platform,
      port: port,
      workingDirectory: process.cwd()
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
  }
  
  if (pathname === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(testHtml);
    return;
  }
  
  // Default route - serve test HTML
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(testHtml);
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Start server
console.log('\n=== STARTING TEST SERVER ===');
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Test server running at http://localhost:${port}`);
  console.log(`🔗 Test page: http://localhost:${port}/`);
  console.log(`🔗 API health: http://localhost:${port}/api/health`);
  console.log(`🔗 API posts: http://localhost:${port}/api/posts`);
  console.log('\n=== TEST SERVER READY ===');
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
