import type { Request, Response } from "express";
import { prisma } from "../config/database";

function accessFilter(isAdmin: boolean) {
  return isAdmin ? {} : { accessLevel: "PUBLIC" };
}

export async function getSensors(req: Request, res: Response) {
  try {
    const sensors = await prisma.sensor.findMany({
      where: { isActive: true, device: { isActive: true }, ...accessFilter(Boolean(res.locals.isAdmin)) },
      select: { id: true, name: true, unit: true, accessLevel: true, isActive: true, createdAt: true },
      orderBy: [{ deviceId: "asc" }, { name: "asc" }],
    });
    return res.json({ success: true, data: sensors });
  } catch (error) {
    console.error("Get sensors error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve sensors" });
  }
}

export async function getLatestReadings(req: Request, res: Response) {
  try {
    const sensors = await prisma.sensor.findMany({
      where: { isActive: true, device: { isActive: true }, ...accessFilter(Boolean(res.locals.isAdmin)) },
      select: {
        id: true, deviceId: true, name: true, unit: true, accessLevel: true,
        readings: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: { id: true, value: true, recordedAt: true, receivedAt: true },
        },
      },
      orderBy: [{ deviceId: "asc" }, { name: "asc" }],
    });
    return res.json({ success: true, data: sensors });
  } catch (error) {
    console.error("Get latest readings error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve latest readings" });
  }
}
