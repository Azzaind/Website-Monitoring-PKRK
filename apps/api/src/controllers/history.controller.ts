
import { Request, Response } from "express";
import { prisma } from "../config/database";

export async function getReadingHistory(req: Request, res: Response) {
  try {
    const { sensorName, startDate, endDate } = req.query;

    // 1. Validasi parameter
    if (
      typeof sensorName !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "sensorName, startDate, and endDate are required",
      });
    }

    // 2. Validasi tanggal
    // WIB = UTC+7
    const start = new Date(`${startDate}T00:00:00.000+07:00`);
    const end = new Date(`${endDate}T23:59:59.999+07:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    // 3. Cari sensor
    const sensor = await prisma.sensor.findFirst({
      where: {
        name: sensorName,
        isActive: true,
        device: {
          isActive: true,
        },
      },
    });

    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: "Sensor not found",
      });
    }

    // 4. Ambil riwayat pembacaan
    const readings = await prisma.sensorReading.findMany({
      where: {
        sensorId: sensor.id,
        recordedAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      sensor: {
        name: sensor.name,
        unit: sensor.unit,
      },
      totalRecords: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error("Get reading history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reading history",
    });
  }
}
