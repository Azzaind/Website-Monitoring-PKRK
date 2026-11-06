
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

let wss: WebSocketServer;

export function initializeWebSocket(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (socket) => {
    console.log("Dashboard connected to WebSocket");

    socket.send(
      JSON.stringify({
        type: "CONNECTED",
        message: "Connected to PKRKABMAS realtime server",
      })
    );

    socket.on("close", () => {
      console.log("Dashboard disconnected from WebSocket");
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  console.log("WebSocket server initialized!");
}

function broadcast(message: object) {
  if (!wss) return;

  const payload = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastReading(data: {
  deviceId: string;
  sensorName: string;
  value: number;
  unit: string;
  recordedAt: string;
}) {
  broadcast({
    type: "NEW_READING",
    data,
  });
}

export function broadcastLocation(data: {
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
  geofenceStatus?: string;
  distanceFromInstallation?: number | null;
}) {
  broadcast({
    type: "NEW_LOCATION",
    data,
  });
}
