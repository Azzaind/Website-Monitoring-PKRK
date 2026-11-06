
import { Request, Response } from "express";
import { prisma } from "../config/database";

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

export async function getDashboardOverview(
  req: Request,
  res: Response
) {
  try {
    const devices = await prisma.device.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sensors: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            unit: true,
            readings: {
              orderBy: { recordedAt: "desc" },
              take: 1,
              select: {
                value: true,
                recordedAt: true,
              },
            },
          },
        },
        latitude: true,
        longitude: true,
        geofenceRadius: true,
        locations: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            accuracyMeters: true,
            recordedAt: true,
            receivedAt: true,
          },
        },
      },
    });

    const data = devices.map((device) => {
      const location = device.locations[0] ?? null;

      let geofenceStatus:
        | "SAFE"
        | "ALERT"
        | "GPS_UNCERTAIN"
        | "NO_GPS_DATA"
        | "NOT_CONFIGURED" = "NO_GPS_DATA";

      let distanceFromInstallation: number | null = null;

      if (
        device.latitude === null ||
        device.longitude === null ||
        device.geofenceRadius === null
      ) {
        geofenceStatus = "NOT_CONFIGURED";
      } else if (location) {
        distanceFromInstallation = calculateDistance(
          device.latitude,
          device.longitude,
          location.latitude,
          location.longitude
        );

        const accuracy = location.accuracyMeters;

        if (accuracy === null || accuracy > MAX_GPS_ACCURACY) {
          geofenceStatus = "GPS_UNCERTAIN";
        } else if (
          distanceFromInstallation - accuracy >
          device.geofenceRadius
        ) {
          geofenceStatus = "ALERT";
        } else if (
          distanceFromInstallation + accuracy <=
          device.geofenceRadius
        ) {
          geofenceStatus = "SAFE";
        } else {
          geofenceStatus = "GPS_UNCERTAIN";
        }
      }

      return {
        device: {
          id: device.id,
          name: device.name,
        },
        sensors: device.sensors.map((sensor) => ({
          id: sensor.id,
          name: sensor.name,
          unit: sensor.unit,
          latestValue: sensor.readings[0]?.value ?? null,
          recordedAt: sensor.readings[0]?.recordedAt ?? null,
        })),
        gps: location,
        geofence: {
          status: geofenceStatus,
          distanceFromInstallation:
            distanceFromInstallation === null
              ? null
              : Math.round(distanceFromInstallation * 100) / 100,
          radiusMeters: device.geofenceRadius,
        },
      };
    });

    return res.json({
      success: true,
      totalDevices: data.length,
      data,
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard overview",
    });
  }
}
