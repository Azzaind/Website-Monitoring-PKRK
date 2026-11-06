import { Request, Response } from "express";
import { prisma } from "../config/database";

function isValidDate(dateString: string): boolean {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function getLatestLocations(req: Request, res: Response) {
  try {
    const devices = await prisma.device.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        locations: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    return res.json({
      success: true,
      data: devices.map((device) => ({
        deviceId: device.id,
        deviceName: device.name,
        location: device.locations[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Get latest locations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve latest GPS locations",
    });
  }
}

export async function getLocationHistory(req: Request, res: Response) {
  try {
    const { deviceId, startDate, endDate } = req.query;

    if (
      typeof deviceId !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "deviceId, startDate, and endDate are required",
      });
    }

    const start = new Date(`${startDate}T00:00:00+07:00`);
    const end = new Date(`${endDate}T00:00:00+07:00`);

    if (
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, name: true },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // End date dibuat eksklusif agar seluruh tanggal akhir ikut terambil.
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const locations = await prisma.deviceLocation.findMany({
      where: {
        deviceId,
        recordedAt: {
          gte: start,
          lt: endExclusive,
        },
      },
      orderBy: { recordedAt: "asc" },
    });

    return res.json({
      success: true,
      device,
      total: locations.length,
      data: locations,
    });
  } catch (error) {
    console.error("Get location history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve GPS history",
    });
  }
}