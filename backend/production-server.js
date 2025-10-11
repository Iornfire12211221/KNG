// Production server without TypeScript dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const port = process.env.PORT || 8081;

console.log('=== PRODUCTION SERVER STARTING ===');
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

// Simple health check response
const healthResponse = {
  status: "ok",
  timestamp: new Date().toISOString(),
  version: "1.0.1",
  message: "Production server running",
  nodeVersion: process.version,
  platform: process.platform,
  port: port,
  mode: "production",
  features: ["static-files", "api"],
  diagnostics: {
    distExists,
    indexExists
  }
};

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
  
  // API routes
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthResponse));
    return;
  }
  
  if (pathname === '/api/posts') {
    if (req.method === 'GET') {
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
  }
  
  // Serve static files
  if (distExists && (pathname === '/' || pathname.startsWith('/_expo/') || pathname.startsWith('/static/') || pathname.startsWith('/assets/') || pathname.includes('.'))) {
    let filePath;
    
    if (pathname === '/') {
      filePath = path.join(distPath, 'index.html');
    } else {
      filePath = path.join(distPath, pathname);
    }
    
    // Security check - prevent directory traversal
    if (!filePath.startsWith(distPath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log('Static file not found:', filePath);
        if (pathname === '/') {
          // Fallback to simple HTML
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>ДПС Кингисепп</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
              <h1>🚀 ДПС Кингисепп</h1>
              <p>Сервер запущен, но приложение не найдено.</p>
              <p>API доступно: <a href="/api/health">/api/health</a></p>
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
  
  // Fallback response
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ДПС Кингисепп - Production</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <h1>🚀 ДПС Кингисепп</h1>
      <p>Production server running</p>
      <p>API доступно: <a href="/api/health">/api/health</a></p>
      <p>Posts API: <a href="/api/posts">/api/posts</a></p>
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
console.log(`🚀 Production server starting on port ${port}`);

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
