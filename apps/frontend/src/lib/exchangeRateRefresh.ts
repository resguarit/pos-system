// src/lib/exchangeRateRefresh.ts

type RefreshCallback = () => void;

class ExchangeRateRefreshManager {
  private callbacks: Set<RefreshCallback> = new Set();

  register(callback: RefreshCallback) {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  triggerRefresh() {
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing refresh callback:', error);
      }
    });
  }
}

export const exchangeRateRefreshManager = new ExchangeRateRefreshManager();
