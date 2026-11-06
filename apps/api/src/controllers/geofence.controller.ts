import { Request, Response } from "express";
import { prisma } from "../config/database";

const MAX_GPS_ACCURACY = 30; // meter

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkGeofence(req: Request, res: Response) {
  try {
    const deviceId = req.query.deviceId;

    if (typeof deviceId !== "string" || !deviceId.trim()) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        locations: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!device || !device.isActive) {
      return res.status(404).json({
        success: false,
        message: "Device not found or inactive",
      });
    }

    if (
      device.latitude === null ||
      device.longitude === null ||
      device.geofenceRadius === null
    ) {
      return res.json({
        success: true,
        status: "NOT_CONFIGURED",
        message: "Geofence has not been configured",
      });
    }

    const location = device.locations[0];

    if (!location) {
      return res.json({
        success: true,
        status: "NO_GPS_DATA",
        message: "No GPS location available",
      });
    }

    const distance = calculateDistance(
      device.latitude,
      device.longitude,
      location.latitude,
      location.longitude
    );

    const accuracy = location.accuracyMeters;

    let status: "SAFE" | "ALERT" | "GPS_UNCERTAIN";

    if (accuracy === null || accuracy > MAX_GPS_ACCURACY) {
      status = "GPS_UNCERTAIN";
    } else if (distance - accuracy > device.geofenceRadius) {
      status = "ALERT";
    } else if (distance + accuracy <= device.geofenceRadius) {
      status = "SAFE";
    } else {
      status = "GPS_UNCERTAIN";
    }

    return res.json({
      success: true,
      device: {
        id: device.id,
        name: device.name,
      },
      status,
      geofence: {
        latitude: device.latitude,
        longitude: device.longitude,
        radiusMeters: device.geofenceRadius,
      },
      currentLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: accuracy,
        recordedAt: location.recordedAt,
      },
      distanceFromInstallation: Math.round(distance * 100) / 100,
      message:
        status === "SAFE"
          ? "Device is within the safe area"
          : status === "ALERT"
            ? "WARNING: Device has moved outside the geofence"
            : "GPS accuracy is insufficient to determine device status",
    });
  } catch (error) {
    console.error("Geofence check error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check geofence",
    });
  }
}