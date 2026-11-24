import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { URL } from "url";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

let wss: WebSocketServer;
const adminSockets = new WeakSet<WebSocket>();

interface AdminTokenPayload {
  userId: string;
  role: string;
}

async function isValidAdminToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    const decoded = jwt.verify(token, secret) as AdminTokenPayload;
    if (decoded.role !== "admin" || typeof decoded.userId !== "string") return false;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    return Boolean(user && user.isActive && user.role === "admin");
  } catch {
    return false;
  }
}

export function initializeWebSocket(server: Server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      const token = requestUrl.searchParams.get("token");
      let admin = false;

      if (token) {
        admin = await isValidAdminToken(token);
        if (!admin) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        if (admin) adminSockets.add(ws);
        wss.emit("connection", ws, request);
      });
    } catch {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({
      type: "CONNECTED",
      message: "Connected to PKRKABMAS realtime server",
    }));
    socket.on("close", () => console.log("Dashboard disconnected from WebSocket"));
    socket.on("error", (error) => console.error("WebSocket error:", error));
  });

  console.log("WebSocket server initialized!");
}

function broadcast(message: object, adminOnly = false) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (adminOnly && !adminSockets.has(client)) return;
    client.send(payload);
  });
}

export function broadcastReading(data: {
  deviceId: string;
  sensorName: string;
  value: number;
  unit: string;
  recordedAt: string;
  accessLevel?: string;
}) {
  const { accessLevel = "PUBLIC", ...publicData } = data;
  const message = { type: "NEW_READING", data: publicData };
  broadcast(message, accessLevel === "ADMIN");
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
  broadcast({ type: "NEW_LOCATION", data });
}
