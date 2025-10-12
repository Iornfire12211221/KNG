const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs').promises;
const { createProxyMiddleware } = require('http-proxy-middleware');

const port = process.env.PORT || 8081;

class ProductionServer {
  constructor() {
    this.server = null;
    this.distPath = path.join(process.cwd(), 'dist');
    this.publicPath = path.join(process.cwd(), 'web');
  }

  async start() {
    console.log('🚀 Starting Production Server...');
    console.log('📁 Dist path:', this.distPath);
    console.log('🌐 Port:', port);
    
    this.server = http.createServer(this.handleRequest.bind(this));
    
    this.server.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server running at http://localhost:${port}`);
      console.log(`📱 Telegram WebApp ready!`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS headers
    this.setCorsHeaders(res);
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    try {
      // API routes
      if (pathname.startsWith('/api/')) {
        await this.handleApiRequest(req, res, pathname);
        return;
      }
      
      // Static files
      if (await this.serveStaticFile(req, res, pathname)) {
        return;
      }
      
      // SPA routing - serve index.html for all other routes
      await this.serveIndexHtml(res);
      
    } catch (error) {
      console.error('❌ Request error:', error);
      this.sendError(res, 500, 'Internal Server Error');
    }
  }

  setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  async handleApiRequest(req, res, pathname) {
    console.log(`🔗 API Request: ${req.method} ${pathname}`);
    
    // Mock API responses for development
    const mockData = {
      '/api/health': {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.1',
        environment: 'production',
        uptime: process.uptime()
      },
      '/api/posts': {
        success: true,
        data: [
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
        ]
      }
    };

    const response = mockData[pathname] || { error: 'Not found' };
    const statusCode = response.error ? 404 : 200;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  async serveStaticFile(req, res, pathname) {
    // Check for static files in dist directory
    const staticPath = path.join(this.distPath, pathname);
    
    try {
      const stats = await fs.stat(staticPath);
      
      if (stats.isFile()) {
        const ext = path.extname(pathname);
        const contentType = this.getContentType(ext);
        
        const data = await fs.readFile(staticPath);
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': this.getCacheControl(ext),
          'Content-Length': data.length
        });
        
        res.end(data);
        console.log(`📄 Served static file: ${pathname}`);
        return true;
      }
    } catch (error) {
      // File not found, continue to SPA routing
    }
    
    return false;
  }

  async serveIndexHtml(res) {
    // Try to serve from web directory first (custom HTML)
    const webIndexPath = path.join(this.publicPath, 'index.html');
    const distIndexPath = path.join(this.distPath, 'index.html');
    
    let indexPath = webIndexPath;
    try {
      await fs.access(webIndexPath);
    } catch {
      indexPath = distIndexPath;
    }
    
    try {
      const data = await fs.readFile(indexPath);
      
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      
      res.end(data);
      console.log(`📱 Served index.html from: ${path.basename(path.dirname(indexPath))}`);
      
    } catch (error) {
      console.error('❌ Failed to serve index.html:', error);
      this.sendError(res, 500, 'Failed to load application');
    }
  }

  getContentType(ext) {
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    
    return types[ext] || 'text/plain';
  }

  getCacheControl(ext) {
    // Cache static assets for 1 year
    if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
      return 'public, max-age=31536000, immutable';
    }
    
    // No cache for HTML files
    return 'no-cache';
  }

  sendError(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  shutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// Start server
const server = new ProductionServer();
server.start().catch(console.error);
