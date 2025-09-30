// src/lib/exchangeRateEmitter.ts

type EventCallback = () => void;

class ExchangeRateEmitter {
  private listeners: EventCallback[] = [];

  subscribe(callback: EventCallback) {
    this.listeners.push(callback);
    
    // Retorna una función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit() {
    this.listeners.forEach((callback, index) => {
      try {
        callback();
      } catch (error) {
        console.error(`Error executing callback ${index}:`, error);
      }
    });
  }
}

export const exchangeRateEmitter = new ExchangeRateEmitter();
