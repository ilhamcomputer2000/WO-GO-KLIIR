"use client";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ── Brand colors ──
const BRAND_PRIMARY = "1B5E20"; // dark green
const BRAND_ACCENT = "4CAF50"; // green
const HEADER_BG = "1B5E20";
const HEADER_FG = "FFFFFF";
const STRIPE_BG = "F1F8E9"; // light green
const BORDER_COLOR = "C8E6C9";
const TITLE_BG = "E8F5E9";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  /** Optional formatter for cell values */
  format?: (value: unknown, row: Record<string, unknown>) => string | number;
}

export interface ExcelExportOptions {
  /** Sheet/report title shown at top */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Column definitions */
  columns: ExcelColumn[];
  /** Row data */
  data: Record<string, unknown>[];
  /** Output filename (without extension) */
  filename: string;
  /** Optional period label, e.g. "01 Jun 2026 – 21 Jun 2026" */
  periodLabel?: string;
}

export async function exportToExcel(options: ExcelExportOptions) {
  const { title, subtitle, columns, data, filename, periodLabel } = options;

  const wb = new ExcelJS.Workbook();
  wb.creator = "GO KLIRR Admin Dashboard";
  wb.created = new Date();

  const ws = wb.addWorksheet(title.slice(0, 31), {
    properties: { defaultColWidth: 15 },
  });

  // ── Title row ──
  let rowIdx = 1;
  const titleRow = ws.getRow(rowIdx);
  ws.mergeCells(rowIdx, 1, rowIdx, columns.length);
  const titleCell = titleRow.getCell(1);
  titleCell.value = `GO KLIRR — ${title}`;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: BRAND_PRIMARY } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
  titleRow.height = 36;
  rowIdx++;

  // ── Subtitle ──
  if (subtitle) {
    const subRow = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, columns.length);
    const subCell = subRow.getCell(1);
    subCell.value = subtitle;
    subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "666666" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    subRow.height = 20;
    rowIdx++;
  }

  // ── Period label ──
  if (periodLabel) {
    const periodRow = ws.getRow(rowIdx);
    ws.mergeCells(rowIdx, 1, rowIdx, columns.length);
    const periodCell = periodRow.getCell(1);
    periodCell.value = `Periode: ${periodLabel}`;
    periodCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "333333" } };
    periodCell.alignment = { horizontal: "center", vertical: "middle" };
    periodRow.height = 22;
    rowIdx++;
  }

  // ── Export timestamp ──
  const tsRow = ws.getRow(rowIdx);
  ws.mergeCells(rowIdx, 1, rowIdx, columns.length);
  const tsCell = tsRow.getCell(1);
  tsCell.value = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;
  tsCell.font = { name: "Calibri", size: 9, color: { argb: "999999" } };
  tsCell.alignment = { horizontal: "right", vertical: "middle" };
  tsRow.height = 18;
  rowIdx++;

  // ── Spacer ──
  rowIdx++;

  // ── Header row ──
  const headerRow = ws.getRow(rowIdx);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND_ACCENT } },
      bottom: { style: "thin", color: { argb: BRAND_ACCENT } },
      left: { style: "thin", color: { argb: BRAND_ACCENT } },
      right: { style: "thin", color: { argb: BRAND_ACCENT } },
    };
  });
  headerRow.height = 28;
  rowIdx++;

  // ── Data rows ──
  data.forEach((row, dataIdx) => {
    const excelRow = ws.getRow(rowIdx);
    const isStripe = dataIdx % 2 === 1;

    columns.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      const rawValue = row[col.key];
      cell.value = col.format
        ? (col.format(rawValue, row) as string | number)
        : (rawValue as string | number | null | undefined) ?? "";

      cell.font = { name: "Calibri", size: 10, color: { argb: "333333" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "hair", color: { argb: BORDER_COLOR } },
        bottom: { style: "hair", color: { argb: BORDER_COLOR } },
        left: { style: "hair", color: { argb: BORDER_COLOR } },
        right: { style: "hair", color: { argb: BORDER_COLOR } },
      };

      if (isStripe) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE_BG } };
      }
    });
    excelRow.height = 22;
    rowIdx++;
  });

  // ── Footer ──
  rowIdx++;
  const footRow = ws.getRow(rowIdx);
  ws.mergeCells(rowIdx, 1, rowIdx, columns.length);
  const footCell = footRow.getCell(1);
  footCell.value = `Total: ${data.length} record`;
  footCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: BRAND_PRIMARY } };
  footCell.alignment = { horizontal: "right" };
  footCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
  footCell.border = {
    top: { style: "medium", color: { argb: BRAND_ACCENT } },
    bottom: { style: "medium", color: { argb: BRAND_ACCENT } },
  };

  // ── Set column widths ──
  columns.forEach((col, i) => {
    const wsCol = ws.getColumn(i + 1);
    wsCol.width = col.width ?? 18;
  });

  // ── Generate & download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
}
