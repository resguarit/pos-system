self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { title: 'Nuevo envio', body: event.data.text() };
  }

  const title = payload.title || 'Nuevo envio';
  const options = {
    body: payload.body || 'Se creo un nuevo envio.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.type || 'shipment-created',
    renotify: true,
    data: {
      url: payload.url || '/dashboard/envios',
      shipment: payload.shipment || null,
      payload,
    },
  };

  const notifyPromise = self.registration.showNotification(title, options);
  // Forward to foreground pages via ONE channel only to avoid duplicate events.
  // Prefer BroadcastChannel (works across tabs); fall back to postMessage.
  const clientsPromise = (typeof BroadcastChannel !== 'undefined')
    ? Promise.resolve().then(() => {
        const bc = new BroadcastChannel('shipments');
        bc.postMessage({ type: 'shipment.created', payload });
        bc.close();
      })
    : self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'shipment.created', payload });
        });
      });

  event.waitUntil(Promise.all([notifyPromise, clientsPromise]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/dashboard/envios';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'shipment.notification.click',
            payload: event.notification?.data?.payload || null,
          });
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
