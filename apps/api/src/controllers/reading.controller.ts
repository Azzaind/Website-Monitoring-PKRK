
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { broadcastReading } from "../websocket/socket";

export async function receiveReadings(req: Request, res: Response) {
  try {
    const { deviceId, readings } = req.body;

    // 1. Validasi format dasar
    if (
      typeof deviceId !== "string" ||
      deviceId.trim().length === 0 ||
      !Array.isArray(readings) ||
      readings.length === 0 ||
      readings.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    // 2. Pastikan perangkat terdaftar dan aktif
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { sensors: true },
    });

    if (!device || !device.isActive) {
      return res.status(404).json({
        success: false,
        message: "Device not found or inactive",
      });
    }

    // 3. Validasi setiap pembacaan
    for (const reading of readings) {
      if (
        typeof reading.sensorName !== "string" ||
        reading.sensorName.trim().length === 0 ||
        reading.sensorName.length > 100 ||
        typeof reading.value !== "number" ||
        !Number.isFinite(reading.value) ||
        typeof reading.recordedAt !== "string" ||
        ! /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(reading.recordedAt) ||
        Number.isNaN(Date.parse(reading.recordedAt)) ||
        new Date(reading.recordedAt).toISOString() !== reading.recordedAt ||
        (reading.externalId !== undefined &&
          (typeof reading.externalId !== "string" ||
            reading.externalId.trim().length === 0 ||
            reading.externalId.length > 100))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid sensor reading format",
        });
      }

      const sensorExists = device.sensors.some(
        (sensor) =>
          sensor.name === reading.sensorName && sensor.isActive
      );

      if (!sensorExists) {
        return res.status(400).json({
          success: false,
          message: `Sensor ${reading.sensorName} is not registered or inactive`,
        });
      }
    }


    // 4. Siapkan data untuk disimpan
    const sensorMap = new Map(
      device.sensors.map((sensor) => [sensor.name, sensor])
    );

    const dataToCreate = readings.map((reading) => {
      const sensor = sensorMap.get(reading.sensorName);

      return {
        sensorId: sensor!.id,
        value: reading.value,
        recordedAt: new Date(reading.recordedAt),
        externalId: reading.externalId ?? null,
      };
    });

    // 5. Simpan secara atomik dan abaikan externalId duplikat
    const result = await prisma.$transaction(async (tx) => {
      const savedReadings: {
        sensorId: string;
        value: number;
        recordedAt: Date;
        externalId: string | null;
      }[] = [];

      for (const reading of dataToCreate) {
        const created = await tx.sensorReading.createMany({
          data: [reading],
          skipDuplicates: true,
        });

        if (created.count === 1) {
          savedReadings.push(reading);
        }
      }

      return savedReadings;
    });

    const savedCount = result.length;
    const duplicateCount = readings.length - savedCount;

    // Kirim hanya data yang berhasil disimpan
    for (const reading of result) {
      const sensor = device.sensors.find(
        (item) => item.id === reading.sensorId
      );

      if (!sensor) continue;

      broadcastReading({
        deviceId,
        sensorName: sensor.name,
        value: reading.value,
        unit: sensor.unit,
        recordedAt: reading.recordedAt.toISOString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Sensor readings processed successfully",
      deviceId,
      totalReceived: readings.length,
      totalSaved: savedCount,
      totalDuplicates: duplicateCount,
    });
  } catch (error) {
    console.error("Receive readings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process sensor readings",
    });
  }
}
