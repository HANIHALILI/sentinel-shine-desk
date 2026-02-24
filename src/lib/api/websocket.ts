import { env } from '@/lib/env';
import type { WSEvent, WSEventType } from './types';

type EventHandler = (event: WSEvent) => void;

/**
 * WebSocket manager with automatic reconnection and event routing.
 * Subscribes to real-time status updates per status page.
 */
class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;
  private statusPageId: string | null = null;
  private _isConnected = false;

  get isConnected() {
    return this._isConnected;
  }

  connect(statusPageId?: string) {
    if (!env.WS_URL) return;

    this.statusPageId = statusPageId || null;
    this.disconnect();

    const url = statusPageId
      ? `${env.WS_URL}?statusPageId=${statusPageId}`
      : env.WS_URL;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._isConnected = true;
        this.reconnectAttempt = 0;
        this.emit({ type: 'service.status_changed' as WSEventType, statusPageId: '', payload: { connected: true }, timestamp: new Date().toISOString() });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          this.emit(data);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this._isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
  }

  on(eventType: WSEventType | '*', handler: EventHandler): () => void {
    const key = eventType;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);

    return () => {
      this.handlers.get(key)?.delete(handler);
    };
  }

  private emit(event: WSEvent) {
    // Specific handlers
    this.handlers.get(event.type)?.forEach(h => h(event));
    // Wildcard handlers
    this.handlers.get('*')?.forEach(h => h(event));
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectDelay);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.statusPageId || undefined);
    }, delay);
  }
}

export const wsManager = new WebSocketManager();
