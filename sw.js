// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                         SERVICE WORKER                                    ║
// ║            Офлайн работа и кэширование для PWA                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const CACHE_NAME = 'task-sys-v7';

// Файлы для кэширования (офлайн работа)
const CACHE_FILES = [
    './',
    './index.html',
    './manifest.json'
];

// ═══════════════════════════════════════════════════════════════════════
// УСТАНОВКА SERVICE WORKER
// ═══════════════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
    console.log('/\\* SW: Installing... *\\/');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('/\\* SW: Caching files *\\/');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('/\\* SW: Installed *\\/');
                return self.skipWaiting();
            })
    );
});

// ═══════════════════════════════════════════════════════════════════════
// АКТИВАЦИЯ SERVICE WORKER
// ═══════════════════════════════════════════════════════════════════════

self.addEventListener('activate', (event) => {
    console.log('/\\* SW: Activating... *\\/');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('/\\* SW: Deleting old cache:', name, '*\\/');
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('/\\* SW: Activated *\\/');
                return self.clients.claim();
            })
    );
});

// ═══════════════════════════════════════════════════════════════════════
// ПЕРЕХВАТ ЗАПРОСОВ (FETCH)
// ═══════════════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
    // Пропускаем не-GET запросы
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Пропускаем внешние запросы (API и т.д.)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        // Стратегия: Сеть с фоллбэком на кэш
        fetch(event.request)
            .then((response) => {
                // Если успешно — кэшируем и возвращаем
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Если сеть недоступна — берём из кэша
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Для навигации возвращаем index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        return new Response('Офлайн', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// ═══════════════════════════════════════════════════════════════════════
// ФОНОВАЯ СИНХРОНИЗАЦИЯ (опционально)
// ═══════════════════════════════════════════════════════════════════════

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('/\\* SW: Background sync *\\/');
        // Здесь можно синхронизировать данные с сервером
    }
});

// ═══════════════════════════════════════════════════════════════════════
// PUSH УВЕДОМЛЕНИЯ (опционально)
// ═══════════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'Новое уведомление',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        vibrate: [100, 50, 100]
    };
    
    event.waitUntil(
        self.registration.showNotification('TASK.SYS', options)
    );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('/\\* SW: Loaded *\\/');
