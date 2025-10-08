const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8081;

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.1",
    message: "Express server is running",
    nodeVersion: process.version,
    platform: process.platform
  });
});

// API для постов
app.get('/api/posts', (req, res) => {
  try {
    const now = Date.now();
    const activePosts = mockPosts.filter(post => post.expiresAt > now);
    res.json({ success: true, data: activePosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', (req, res) => {
  try {
    const body = req.body;
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
    res.json({ success: true, data: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Статические файлы
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (fs.existsSync(distPath)) {
    console.log("Serving static files from ./dist");
    app.use(express.static(distPath));
  }
}

// Главная страница
app.get('*', (req, res) => {
  const html = `
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
        </div>
        
        <div style="text-align: center;">
          <a href="/api/health" class="link">🔍 Health Check</a>
          <a href="/api/posts" class="link">📋 API Posts</a>
        </div>
        
        <div class="info">
          <h3>📱 Готово для Telegram WebApp</h3>
          <p>Приложение оптимизировано для развертывания в Telegram Mini Apps.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: err.message 
  });
});

// Запуск сервера
console.log(`🚀 Express server starting on port ${port}`);
console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Express server running at http://localhost:${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🌐 Main page: http://localhost:${port}/`);
});
