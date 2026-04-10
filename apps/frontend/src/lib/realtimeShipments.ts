import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { apiUrl } from '@/lib/api/config';
import { getAuthToken } from '@/lib/auth';

type ShipmentCreatedPayload = {
  shipment?: {
    id: number;
    reference?: string;
    branch_id?: number;
  };
};

let echoInstance: Echo<'pusher'> | null = null;

function resolveBaseUrl(): string {
  return String(apiUrl).replace(/\/api\/?$/, '');
}

function getEchoInstance(): Echo<'pusher'> | null {
  if (echoInstance) {
    return echoInstance;
  }

  const key = (import.meta.env.VITE_REVERB_APP_KEY as string | undefined)
    || (import.meta.env.VITE_PUSHER_APP_KEY as string | undefined);
  const cluster = (import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined) || 'mt1';
  const wsHost = (import.meta.env.VITE_REVERB_HOST as string | undefined)
    || (import.meta.env.VITE_PUSHER_HOST as string | undefined);
  const defaultPort = String(import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https' ? 443 : 8080;
  const wsPort = Number(import.meta.env.VITE_REVERB_PORT || import.meta.env.VITE_PUSHER_PORT || defaultPort);
  const forceTLS = String(import.meta.env.VITE_REVERB_SCHEME || import.meta.env.VITE_PUSHER_SCHEME || 'https') === 'https';

  if (!key) {
    return null;
  }

  const token = getAuthToken();
  if (!token) {
    return null;
  }

  // pusher-js requires either a valid cluster or an explicit wsHost.
  // For Reverb we expect wsHost; for Pusher Cloud we expect cluster.
  if (!wsHost && !cluster) {
    console.warn('Realtime disabled: missing VITE_REVERB_HOST/VITE_PUSHER_HOST and VITE_PUSHER_APP_CLUSTER.');
    return null;
  }

  (window as Window & { Pusher?: typeof Pusher }).Pusher = Pusher;

  const echoConfig: ConstructorParameters<typeof Echo>[0] = {
    broadcaster: 'pusher',
    key,
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${resolveBaseUrl()}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  };

  echoConfig.cluster = cluster;

  echoInstance = new Echo(echoConfig);

  return echoInstance;
}

export function subscribeToShipmentCreated(
  branchIds: number[],
  onEvent: (payload: ShipmentCreatedPayload) => void,
): () => void {
  const echo = getEchoInstance();
  if (!echo) {
    return () => undefined;
  }

  const channelNames = [
    'shipments.global',
    ...branchIds.map((branchId) => `shipments.branch.${branchId}`),
  ];

  channelNames.forEach((channelName) => {
    echo.private(channelName).listen('.shipment.created', (payload: ShipmentCreatedPayload) => {
      onEvent(payload);
    });
  });

  return () => {
    channelNames.forEach((channelName) => {
      echo.leave(channelName);
    });
  };
}
