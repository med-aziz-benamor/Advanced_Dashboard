/**
 * Global refresh bus for triggering data refresh across components.
 * Uses EventTarget for a lightweight pub/sub pattern.
 */

class RefreshBus extends EventTarget {
  private static instance: RefreshBus;

  private constructor() {
    super();
  }

  static getInstance(): RefreshBus {
    if (!RefreshBus.instance) {
      RefreshBus.instance = new RefreshBus();
    }
    return RefreshBus.instance;
  }

  emit() {
    this.dispatchEvent(new CustomEvent('refresh'));
  }

  subscribe(callback: () => void): () => void {
    const handler = () => callback();
    this.addEventListener('refresh', handler);
    
    // Return unsubscribe function
    return () => {
      this.removeEventListener('refresh', handler);
    };
  }
}

const bus = RefreshBus.getInstance();

/**
 * Subscribe to global refresh events.
 * 
 * @param callback Function to call when refresh is emitted
 * @returns Unsubscribe function
 */
export function subscribeRefresh(callback: () => void): () => void {
  return bus.subscribe(callback);
}

/**
 * Emit a global refresh event.
 * All subscribed components will trigger their refetch.
 */
export function emitRefresh(): void {
  bus.emit();
}
