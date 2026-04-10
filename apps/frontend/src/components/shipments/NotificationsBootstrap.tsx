import { useEffect } from 'react';
import { bindForegroundShipmentNotifications, registerPushServiceWorker } from '@/lib/pushNotifications';

export default function NotificationsBootstrap() {
  useEffect(() => {
    void registerPushServiceWorker();
    const unbind = bindForegroundShipmentNotifications();
    return () => unbind();
  }, []);

  return null;
}
