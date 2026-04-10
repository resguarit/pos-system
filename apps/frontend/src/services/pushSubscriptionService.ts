import api from '@/lib/api';

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  contentEncoding?: string;
  branch_id?: number;
};

export const pushSubscriptionService = {
  async list() {
    return api.get('/push-subscriptions');
  },

  async save(payload: PushSubscriptionPayload) {
    return api.post('/push-subscriptions', payload);
  },

  async remove(endpoint: string) {
    return api.delete('/push-subscriptions', { data: { endpoint } });
  },
};
