import { pushSubscriptionService } from '@/services/pushSubscriptionService';

type ShipmentPushEvent = {
  type: string;
  payload: {
    shipment?: {
      id: number;
      reference?: string;
      branch_id?: number;
    };
    title?: string;
    body?: string;
    url?: string;
  };
};

const SHIPMENT_EVENT_NAME = 'shipment:new';

function toUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Simple dedupe to avoid forwarding the same push event twice (e.g. postMessage + BroadcastChannel race)
let _lastDispatchedId: number | undefined;
let _lastDispatchedAt = 0;

function dispatchShipmentEvent(payload: ShipmentPushEvent['payload']) {
  const id = payload.shipment?.id;
  const now = Date.now();
  if (id !== undefined && id === _lastDispatchedId && now - _lastDispatchedAt < 5_000) {
    return; // already dispatched this shipment recently
  }
  _lastDispatchedId = id;
  _lastDispatchedAt = now;
  window.dispatchEvent(new CustomEvent(SHIPMENT_EVENT_NAME, { detail: payload }));
}

export function onShipmentNotification(listener: (payload: ShipmentPushEvent['payload']) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ShipmentPushEvent['payload']>;
    listener(customEvent.detail);
  };

  window.addEventListener(SHIPMENT_EVENT_NAME, handler);
  return () => window.removeEventListener(SHIPMENT_EVENT_NAME, handler);
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/sw-push.js');
}

export function bindForegroundShipmentNotifications(): () => void {
  const messageHandler = (event: MessageEvent<ShipmentPushEvent>) => {
    if (event.data?.type === 'shipment.created') {
      dispatchShipmentEvent(event.data.payload || {});
    }
  };

  navigator.serviceWorker?.addEventListener('message', messageHandler);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('shipments');
    channel.onmessage = (event: MessageEvent<ShipmentPushEvent>) => {
      if (event.data?.type === 'shipment.created') {
        dispatchShipmentEvent(event.data.payload || {});
      }
    };
  }

  return () => {
    navigator.serviceWorker?.removeEventListener('message', messageHandler);
    channel?.close();
  };
}

export async function subscribeToPushNotifications(branchId?: number): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return false;
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return false;
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) {
    throw new Error('Falta VITE_VAPID_PUBLIC_KEY para registrar push notifications.');
  }

  const pushSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toUint8Array(vapidKey),
  });

  const json = pushSubscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Subscription push invalida.');
  }

  await pushSubscriptionService.save({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    contentEncoding: (json as { contentEncoding?: string }).contentEncoding,
    branch_id: branchId,
  });

  return true;
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
  const current = await registration?.pushManager.getSubscription();
  if (!current) {
    return;
  }

  const endpoint = current.endpoint;
  await current.unsubscribe();
  await pushSubscriptionService.remove(endpoint);
}
