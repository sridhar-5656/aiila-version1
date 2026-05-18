import { useEffect, useRef, useCallback } from 'react';
import { WsMessage, Alert } from '../types';
import { useAlertStore } from '../store';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/alerts';

interface UseAlertStreamOptions {
  onMessage?: (msg: WsMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useAlertStream = (options: UseAlertStreamOptions = {}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Store actions
  const addAlert = useAlertStore((s) => s.addAlert);
  const incrementUnread = useAlertStore((s) => s.incrementUnreadCount);

  const connect = useCallback(() => {
    // Clear any existing reconnection timeouts
    if (reconnectRef.current) clearTimeout(reconnectRef.current);

    const token = localStorage.getItem('auth_token');
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Intelligence Stream Connected');
        options.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          
          if (msg.type === 'alert') {
            const alertPayload: Alert = msg.payload;

            // 1. Append new alert to top of inbox via store
            addAlert(alertPayload);

            // 2. Alert badge on nav: increment unread count
            incrementUnread();

            // 3. Log high-risk alerts for diagnostics
            if (alertPayload.risk_score > 8) {
              console.warn(`CRITICAL THREAT DETECTED: ${alertPayload.title}`);
            }
          }
          
          options.onMessage?.(msg);
        } catch (err) {
          console.error('[WS] Failed to parse intelligence payload', err);
        }
      };

      ws.onclose = (e) => {
        if (e.wasClean) {
          console.log('[WS] Stream closed cleanly');
        } else {
          console.warn('[WS] Stream interrupted — reconnecting in 3s...');
          reconnectRef.current = setTimeout(connect, 3000);
        }
        options.onDisconnect?.();
      };

      ws.onerror = (err) => {
        console.error('[WS] Socket Security Error', err);
        ws.close();
      };
    } catch (err) {
      console.error('[WS] Connection Handshake Failed', err);
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, [options, addAlert, incrementUnread]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
};