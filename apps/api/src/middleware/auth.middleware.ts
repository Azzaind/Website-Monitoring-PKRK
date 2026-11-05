
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/database";

export async function authenticateDevice(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Ambil API Key dari HTTP header
    const apiKey = req.headers["x-api-key"];

    if (typeof apiKey !== "string" || !apiKey) {
      return res.status(401).json({
        success: false,
        message: "API Key is required",
      });
    }

    // Ambil ID perangkat dari request body
    const { deviceId } = req.body;

    if (typeof deviceId !== "string" || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required",
      });
    }

    // Cari perangkat di database
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device || !device.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid device",
      });
    }

    // Cocokkan API Key dengan hash di database
    const isValid = await bcrypt.compare(apiKey, device.apiKeyHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid API Key",
      });
    }

    // Jika valid, lanjutkan ke controller
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}
