
import { Request, Response } from "express";
import { prisma } from "../config/database";

// Menampilkan daftar sensor aktif dari perangkat aktif
export async function getSensors(req: Request, res: Response) {
  try {
    const sensors = await prisma.sensor.findMany({
      where: {
        isActive: true,
        device: {
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        unit: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: sensors,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve sensors",
    });
  }
}

// Menampilkan pembacaan terbaru dari sensor aktif pada perangkat aktif
export async function getLatestReadings(
  req: Request,
  res: Response
) {
  try {
    const sensors = await prisma.sensor.findMany({
      where: {
        isActive: true,
        device: {
          isActive: true,
        },
      },
      include: {
        readings: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    return res.json({
      success: true,
      data: sensors,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve latest readings",
    });
  }
}
