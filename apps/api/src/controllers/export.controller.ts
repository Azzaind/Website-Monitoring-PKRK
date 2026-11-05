
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config/database";

export async function exportReadingsExcel(req: Request, res: Response) {
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

    // 2. Tentukan rentang tanggal WIB
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
        device: { isActive: true },
      },
    });

    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: "Sensor not found",
      });
    }

    // 4. Ambil data pengukuran
    const readings = await prisma.sensorReading.findMany({
      where: {
        sensorId: sensor.id,
        recordedAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { recordedAt: "asc" },
    });

    // 5. Buat file Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sensor Readings");

    worksheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "Sensor", key: "sensor", width: 18 },
      { header: "Value", key: "value", width: 15 },
      { header: "Unit", key: "unit", width: 15 },
      { header: "Recorded At (WIB)", key: "recordedAt", width: 28 },
      { header: "Received At (WIB)", key: "receivedAt", width: 28 },
      { header: "External ID", key: "externalId", width: 35 },
    ];

    readings.forEach((reading, index) => {
      worksheet.addRow({
        no: index + 1,
        sensor: sensor.name,
        value: reading.value,
        unit: sensor.unit,
        recordedAt: reading.recordedAt.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
        }),
        receivedAt: reading.receivedAt.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
        }),
        externalId: reading.externalId ?? "",
      });
    });

    worksheet.getRow(1).font = { bold: true };

    // 6. Kirim file Excel ke pengguna
    const fileName = `${sensorName}_${startDate}_${endDate}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export Excel file",
    });
  }
}

export async function exportReadingsCSV(req: Request, res: Response) {
    try {
      const { sensorName, startDate, endDate } = req.query;

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
      // Rentang tanggal WIB
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

      const sensor = await prisma.sensor.findFirst({
        where: {
          name: sensorName,
          isActive: true,
          device: { isActive: true },
        },
      });

      if (!sensor) {
        return res.status(404).json({
          success: false,
          message: "Sensor not found",
        });
      }

      const readings = await prisma.sensorReading.findMany({
        where: {
          sensorId: sensor.id,
          recordedAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { recordedAt: "asc" },
      });

      const escapeCSV = (value: string | number) => {
        const text = String(value);
        return `"${text.replace(/"/g, '""')}"`;
      };

      const rows = [
        [
          "No",
          "Sensor",
          "Value",
          "Unit",
          "Recorded At (WIB)",
          "Received At (WIB)",
          "External ID",
        ].map(escapeCSV).join(","),
        ...readings.map((reading, index) =>
          [
            index + 1,
            sensor.name,
            reading.value,
            sensor.unit,
            reading.recordedAt.toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
            }),
            reading.receivedAt.toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
            }),
            reading.externalId ?? "",
          ].map(escapeCSV).join(",")
        ),
      ];

      const csvContent = "\uFEFF" + rows.join("\r\n");

      const fileName = `${sensorName}_${startDate}_${endDate}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );

      return res.status(200).send(csvContent);
    } catch (error) {
      console.error("CSV export error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to export CSV file",
      });
    }
  }
