// Service Worker для KNG - Карта событий Кингисеппа
const CACHE_NAME = 'kng-v1.2.1';
const STATIC_CACHE = 'kng-static-v1.2.1';
const DYNAMIC_CACHE = 'kng-dynamic-v1.2.1';

// Файлы для кэширования
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
  '/assets/images/adaptive-icon.png',
  '/assets/images/splash-icon.png'
];

// API endpoints для кэширования
const API_CACHE_PATTERNS = [
  /\/api\/trpc\/posts\.getAll/,
  /\/api\/trpc\/users\.getAll/,
  /\/api\/trpc\/comments\.getAll/
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Игнорируем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }
  
  // Игнорируем Chrome extension запросы
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Стратегия для статических файлов
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Стратегия для API запросов
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              if (response) {
                // Возвращаем кэшированный ответ и обновляем в фоне
                fetch(request)
                  .then((freshResponse) => {
                    if (freshResponse.status === 200) {
                      cache.put(request, freshResponse.clone());
                    }
                  })
                  .catch(() => {
                    // Игнорируем ошибки фонового обновления
                  });
                return response;
              }
              
              // Если нет в кэше, делаем запрос
              return fetch(request)
                .then((response) => {
                  if (response.status === 200) {
                    cache.put(request, response.clone());
                  }
                  return response;
                })
                .catch(() => {
                  // Возвращаем офлайн страницу для API запросов
                  return new Response(
                    JSON.stringify({
                      error: 'Офлайн режим',
                      message: 'Нет подключения к интернету'
                    }),
                    {
                      status: 503,
                      headers: { 'Content-Type': 'application/json' }
                    }
                  );
                });
            });
        })
    );
    return;
  }
  
  // Стратегия для HTML страниц
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/')
            .then((response) => {
              if (response) {
                return response;
              }
              return new Response(
                `
                <!DOCTYPE html>
                <html>
                <head>
                  <title>KNG - Офлайн</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                      text-align: center; 
                      padding: 50px;
                      background: #f5f5f5;
                    }
                    .offline-message {
                      background: white;
                      padding: 30px;
                      border-radius: 10px;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-message">
                    <h1>📱 KNG</h1>
                    <p>Нет подключения к интернету</p>
                    <p>Проверьте соединение и попробуйте снова</p>
                  </div>
                </body>
                </html>
                `,
                {
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
        })
    );
    return;
  }
  
  // Стратегия для изображений
  if (request.headers.get('accept').includes('image/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              
              return fetch(request)
                .then((response) => {
                  if (response.status === 200) {
                    cache.put(request, response.clone());
                  }
                  return response;
                })
                .catch(() => {
                  // Возвращаем placeholder изображение
                  return new Response(
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+📷</dGV4dD48L3N2Zz4=',
                    {
                      headers: { 'Content-Type': 'image/svg+xml' }
                    }
                  );
                });
            });
        })
    );
  }
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Push notification received');
  
  const options = {
    body: 'Новый пост на карте Кингисеппа!',
    icon: '/assets/images/icon.png',
    badge: '/assets/images/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Открыть карту',
        icon: '/assets/images/icon.png'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('KNG - Карта событий', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Здесь можно добавить логику синхронизации данных
      Promise.resolve()
    );
  }
});

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_POSTS') {
    const posts = event.data.posts;
    caches.open(DYNAMIC_CACHE)
      .then((cache) => {
        posts.forEach((post) => {
          if (post.imageUrl) {
            cache.add(post.imageUrl);
          }
        });
      });
  }
});

console.log('✅ Service Worker: Loaded successfully');
