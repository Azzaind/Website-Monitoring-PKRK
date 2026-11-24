import type { Request, Response } from "express";
import { prisma } from "../config/database";

function isValidDateOnly(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function getReadingHistory(req: Request, res: Response) {
  try {
    const { sensorName, startDate, endDate } = req.query;
    if (typeof sensorName !== "string" || typeof startDate !== "string" || typeof endDate !== "string") {
      return res.status(400).json({ success: false, message: "sensorName, startDate, and endDate are required" });
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      !datePattern.test(startDate) ||
      !datePattern.test(endDate) ||
      !isValidDateOnly(startDate) ||
      !isValidDateOnly(endDate) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }
    const start = new Date(`${startDate}T00:00:00.000+07:00`);
    const end = new Date(`${endDate}T23:59:59.999+07:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date range" });
    }

    const sensor = await prisma.sensor.findFirst({
      where: {
        name: sensorName,
        isActive: true,
        device: { isActive: true },
        ...(res.locals.isAdmin ? {} : { accessLevel: "PUBLIC" }),
      },
      select: { id: true, name: true, unit: true },
    });
    if (!sensor) return res.status(404).json({ success: false, message: "Sensor not found" });

    const readings = await prisma.sensorReading.findMany({
      where: { sensorId: sensor.id, recordedAt: { gte: start, lte: end } },
      orderBy: { recordedAt: "asc" },
    });
    return res.status(200).json({
      success: true,
      sensor: { name: sensor.name, unit: sensor.unit },
      totalRecords: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error("Get reading history error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve reading history" });
  }
}
