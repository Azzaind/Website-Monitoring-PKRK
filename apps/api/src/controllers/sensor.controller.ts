
import { Request, Response } from "express";
import { prisma } from "../config/database";

// Menampilkan daftar sensor
export async function getSensors(req: Request, res: Response) {
  try {
    const sensors = await prisma.sensor.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: sensors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sensors",
    });
  }
}

// Menampilkan data sensor terbaru
export async function getLatestReadings(
  req: Request,
  res: Response
) {
  try {
    const sensors = await prisma.sensor.findMany({
      where: { isActive: true },
      include: {
        readings: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    res.json({
      success: true,
      data: sensors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve latest readings",
    });
  }
}
