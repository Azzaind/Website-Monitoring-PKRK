
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

export function broadcastReading(data: {
  deviceId: string;
  sensorName: string;
  value: number;
  unit: string;
  recordedAt: string;
}) {
  if (!wss) return;

  const message = JSON.stringify({
    type: "NEW_READING",
    data,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
