
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { broadcastLocation } from "../websocket/socket";

const MAX_GPS_ACCURACY = 30;

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

function getGeofenceStatus(
  distance: number | null,
  accuracy: number | null,
  radius: number | null
): string {
  if (radius === null) return "NOT_CONFIGURED";
  if (distance === null) return "NO_GPS_DATA";

  if (accuracy === null || accuracy > MAX_GPS_ACCURACY) {
    return "GPS_UNCERTAIN";
  }

  if (distance - accuracy > radius) return "ALERT";
  if (distance + accuracy <= radius) return "SAFE";

  return "GPS_UNCERTAIN";
}

export async function receiveLocations(req: Request, res: Response) {
  try {
    const { deviceId, locations } = req.body;

    if (
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      !Array.isArray(locations) ||
      locations.length === 0 ||
      locations.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device || !device.isActive) {
      return res.status(404).json({
        success: false,
        message: "Device not found or inactive",
      });
    }

    for (const location of locations) {
      if (
        !location ||
        typeof location !== "object" ||
        Array.isArray(location) ||
        typeof location.latitude !== "number" ||
        !Number.isFinite(location.latitude) ||
        location.latitude < -90 ||
        location.latitude > 90 ||
        typeof location.longitude !== "number" ||
        !Number.isFinite(location.longitude) ||
        location.longitude < -180 ||
        location.longitude > 180 ||
        (location.accuracyMeters !== undefined &&
          location.accuracyMeters !== null &&
          (typeof location.accuracyMeters !== "number" ||
            !Number.isFinite(location.accuracyMeters) ||
            location.accuracyMeters < 0)) ||
        typeof location.recordedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          location.recordedAt
        ) ||
        Number.isNaN(Date.parse(location.recordedAt)) ||
        new Date(location.recordedAt).toISOString() !== location.recordedAt ||
        (location.externalId !== undefined &&
          (typeof location.externalId !== "string" ||
            !location.externalId.trim() ||
            location.externalId.length > 100))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid GPS location format",
        });
      }
    }

    const savedLocations = await prisma.$transaction(async (tx) => {
      const saved = [];

      for (const location of locations) {
        const result = await tx.deviceLocation.createMany({
          data: [{
            deviceId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracyMeters: location.accuracyMeters ?? null,
            recordedAt: new Date(location.recordedAt),
            externalId: location.externalId ?? null,
          }],
          skipDuplicates: true,
        });

        if (result.count === 1) {
          saved.push(location);
        }
      }

      return saved;
    });

    // Ambil koordinat terbaru yang benar-benar tersimpan.
    const latestLocation = await prisma.deviceLocation.findFirst({
      where: { deviceId },
      orderBy: { recordedAt: "desc" },
    });

    if (latestLocation) {
      let distance: number | null = null;

      if (device.latitude !== null && device.longitude !== null) {
        distance = calculateDistance(
          device.latitude,
          device.longitude,
          latestLocation.latitude,
          latestLocation.longitude
        );
      }

      const geofenceStatus = getGeofenceStatus(
        distance,
        latestLocation.accuracyMeters,
        device.geofenceRadius
      );

      // Broadcast hanya jika ada GPS baru yang berhasil disimpan.
      if (savedLocations.length > 0) {
        broadcastLocation({
          deviceId,
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          accuracyMeters: latestLocation.accuracyMeters,
          recordedAt: latestLocation.recordedAt.toISOString(),
          geofenceStatus,
          distanceFromInstallation:
            distance === null ? null : Math.round(distance * 100) / 100,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "GPS locations processed successfully",
      deviceId,
      totalReceived: locations.length,
      totalSaved: savedLocations.length,
      totalDuplicates: locations.length - savedLocations.length,
    });
  } catch (error) {
    console.error("Receive GPS locations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process GPS locations",
    });
  }
}
