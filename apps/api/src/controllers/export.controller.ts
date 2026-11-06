
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config/database";

function getDateRange(startDate: string, endDate: string) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
    return null;
  }

  function isValidDate(dateString: string): boolean {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    startDate > endDate
  ) {
    return null;
  }

  const start = new Date(`${startDate}T00:00:00.000+07:00`);
  const end = new Date(`${endDate}T23:59:59.999+07:00`);

  return { start, end };
}

async function getExportData(
  sensorName: string,
  startDate: string,
  endDate: string
) {
  const dateRange = getDateRange(startDate, endDate);

  if (!dateRange) {
    return { error: "Invalid date range", status: 400 as const };
  }

  const sensors = await prisma.sensor.findMany({
    where:
      sensorName === "all"
        ? {
            isActive: true,
            device: { isActive: true },
          }
        : {
            name: sensorName,
            isActive: true,
            device: { isActive: true },
          },
    select: {
      id: true,
      name: true,
      unit: true,
    },
  });

  if (sensors.length === 0) {
    return { error: "Sensor not found", status: 404 as const };
  }

  const readings = await prisma.sensorReading.findMany({
    where: {
      sensorId: { in: sensors.map((sensor) => sensor.id) },
      recordedAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    include: {
      sensor: {
        select: {
          name: true,
          unit: true,
        },
      },
    },
    orderBy: [
      { recordedAt: "asc" },
      { sensorId: "asc" },
    ],
  });

  return { readings };
}

function escapeCSV(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportReadingsExcel(req: Request, res: Response) {
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

    const result = await getExportData(sensorName, startDate, endDate);

    if ("error" in result) {
      return res.status(result.status ?? 400).json({
        success: false,
        message: result.error,
      });
    }

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

    result.readings.forEach((reading, index) => {
      worksheet.addRow({
        no: index + 1,
        sensor: reading.sensor.name,
        value: reading.value ?? "",
        unit: reading.sensor.unit,
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
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: "A1",
      to: "G1",
    };

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
    return res.end();
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

    const result = await getExportData(sensorName, startDate, endDate);

    if ("error" in result) {
      return res.status(result.status ?? 400).json({
        success: false,
        message: result.error,
      });
    }

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

      ...result.readings.map((reading, index) =>
        [
          index + 1,
          reading.sensor.name,
          reading.value ?? "",
          reading.sensor.unit,
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
