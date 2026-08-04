self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SürüMetri Bildirim';
  const options = {
    body: data.body || 'Yeni bir bildiriminiz var.',
    icon: data.icon || '/icons/pwa-192.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Zaten açık bir sekme varsa oraya odaklan
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
