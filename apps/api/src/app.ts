
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./config/database";
import sensorRoutes from "./routes/sensor.routes";
import readingRoutes from "./routes/reading.routes";
import historyRoutes from "./routes/history.routes";
import exportRoutes from "./routes/export.routes";
import { initializeWebSocket } from "./websocket/socket";
import authRoutes from "./routes/auth.routes";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/export", exportRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PKRKABMAS Backend API is running!",
    version: "1.0.0",
  });
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Backend and database are connected",
      database: "Connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed",
      database: "Disconnected",
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log("-----------------------------------");
  console.log("PKRKABMAS Backend is running!");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log("-----------------------------------");
});

initializeWebSocket(server);

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down server...");

  server.close(async () => {
    await prisma.$disconnect();
    console.log("Database disconnected.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
