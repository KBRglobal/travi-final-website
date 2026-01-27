/**
 * WebSocket Handler for Real-time Analytics
 * Broadcasts live analytics data to connected clients
 */

import type { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getRealtimeMetrics } from "./realtime-dashboard";

let wss: WebSocketServer | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server: HTTPServer): void {
  wss = new WebSocketServer({ server, path: "/ws/analytics" });

  wss.on("connection", (ws: WebSocket) => {
    // Send initial data
    sendRealtimeUpdate(ws);

    ws.on("close", () => {});

    ws.on("error", error => {});
  });

  // Broadcast updates every 5 seconds
  broadcastInterval = setInterval(async () => {
    await broadcastRealtimeUpdates();
  }, 5000);
}

/**
 * Send realtime update to a single client
 */
async function sendRealtimeUpdate(ws: WebSocket): Promise<void> {
  if (ws.readyState !== WebSocket.OPEN) return;

  try {
    const metrics = await getRealtimeMetrics();
    ws.send(
      JSON.stringify({
        type: "realtime_update",
        data: metrics,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {}
}

/**
 * Broadcast realtime updates to all connected clients
 */
async function broadcastRealtimeUpdates(): Promise<void> {
  if (!wss) return;

  try {
    const metrics = await getRealtimeMetrics();
    const message = JSON.stringify({
      type: "realtime_update",
      data: metrics,
      timestamp: new Date().toISOString(),
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (error) {}
}

/**
 * Broadcast event notification
 */
export function broadcastEvent(event: {
  type: string;
  visitorId: string;
  pageUrl?: string;
  eventType?: string;
}): void {
  if (!wss) return;

  const message = JSON.stringify({
    type: "event_notification",
    data: event,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Close WebSocket server
 */
export function closeWebSocket(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }

  if (wss) {
    wss.close(() => {});
    wss = null;
  }
}

/**
 * Get connected client count
 */
export function getConnectedClientCount(): number {
  return wss?.clients.size || 0;
}
