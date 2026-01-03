let ws: WebSocket | null = null;
const listeners: ((data: string) => void)[] = [];

export function getWebSocket(): WebSocket | null {
  return ws;
}

export function connectWebSocket(url: string): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws; // Already connected
  }

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = event.data;
      listeners.forEach((callback) => callback(data));
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Optionally auto-reconnect logic here
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}

export function sendMessage(message: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket is not open. Message not sent:', message);
    return;
  }
  ws.send(message);
}

export function addMessageListener(callback: (data: string) => void): () => void {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

export function disconnectWebSocket(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
}