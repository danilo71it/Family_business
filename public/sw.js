const CACHE_NAME = 'finance-shift-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listener per messaggi dall'app principale per triggerare notifiche
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/5552/5552462.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/5552/5552462.png',
        vibrate: [200, 100, 200]
      })
    );
  }
});
