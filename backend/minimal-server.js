// Minimal production server - no external dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8081;

console.log('=== MINIMAL SERVER STARTING ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', port);
console.log('Working directory:', process.cwd());

// Check if dist directory exists
const distPath = path.join(process.cwd(), 'dist');
console.log('Checking dist directory:', distPath);

let distExists = false;
let indexExists = false;

try {
  distExists = fs.existsSync(distPath);
  console.log('Dist directory exists:', distExists);
  
  if (distExists) {
    const files = fs.readdirSync(distPath);
    console.log('Files in dist:', files.slice(0, 10));
    
    indexExists = fs.existsSync(path.join(distPath, 'index.html'));
    console.log('index.html exists:', indexExists);
  }
} catch (error) {
  console.error('Error checking dist directory:', error);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${port}`);
  const pathname = parsedUrl.pathname;
  
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
  
  // Simple health check
  if (pathname === '/api/health') {
    const healthResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.1",
      message: "Minimal server running",
      nodeVersion: process.version,
      platform: process.platform,
      port: port,
      mode: "minimal",
      diagnostics: {
        distExists,
        indexExists
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthResponse));
    return;
  }
  
  // Simple posts API
  if (pathname === '/api/posts') {
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
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: mockPosts }));
    return;
  }
  
  // Serve static files
  if (distExists && (pathname === '/' || pathname.startsWith('/_expo/') || pathname.startsWith('/static/') || pathname.startsWith('/assets/') || pathname.includes('.'))) {
    let filePath;
    
    if (pathname === '/') {
      filePath = path.join(distPath, 'index.html');
    } else {
      filePath = path.join(distPath, pathname);
    }
    
    // Security check
    if (!filePath.startsWith(distPath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log('Static file not found:', filePath);
        if (pathname === '/') {
          // Serve fallback HTML
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>ДПС Кингисепп</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #007AFF; text-align: center; }
                .status { color: green; font-weight: bold; text-align: center; margin: 20px 0; }
                .info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚀 ДПС Кингисепп</h1>
                <p class="status">✅ Минимальный сервер запущен!</p>
                <div class="info">
                  <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                  <p><strong>Node.js версия:</strong> ${process.version}</p>
                  <p><strong>Режим:</strong> Минимальный</p>
                  <p><strong>API доступно:</strong> <a href="/api/health">/api/health</a></p>
                </div>
              </div>
            </body>
            </html>
          `);
        } else {
          res.writeHead(404);
          res.end('File not found');
        }
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
  
  // Default route - serve index.html for SPA
  if (distExists && indexExists) {
    const indexPath = path.join(distPath, 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  
  // Final fallback
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ДПС Кингисепп</title>
    </head>
    <body>
      <h1>🚀 ДПС Кингисепп</h1>
      <p>Минимальный сервер работает</p>
      <p>API: <a href="/api/health">/api/health</a></p>
    </body>
    </html>
  `);
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Start server
console.log('\n=== STARTING SERVER ===');
console.log(`🚀 Minimal server starting on port ${port}`);

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🌐 Main page: http://localhost:${port}/`);
  console.log(`📋 API posts: http://localhost:${port}/api/posts`);
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