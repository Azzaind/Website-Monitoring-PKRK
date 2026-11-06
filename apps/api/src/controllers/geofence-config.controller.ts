import { Request, Response } from "express";
import { prisma } from "../config/database";

export async function configureGeofence(req: Request, res: Response) {
  try {
    const { deviceId, latitude, longitude, radiusMeters } = req.body;

    if (
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      typeof radiusMeters !== "number" ||
      !Number.isFinite(radiusMeters) ||
      radiusMeters <= 0 ||
      radiusMeters > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid geofence configuration",
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: {
        latitude,
        longitude,
        geofenceRadius: radiusMeters,
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        geofenceRadius: true,
      },
    });

    return res.json({
      success: true,
      message: "Geofence configuration saved",
      data: updated,
    });
  } catch (error) {
    console.error("Configure geofence error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to configure geofence",
    });
  }
}