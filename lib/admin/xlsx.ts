import ExcelJS from "exceljs";

export type SheetColumn<T> = { header: string; value: (row: T) => string | number | null; money?: boolean; total?: boolean };

/** One RTL sheet with Hebrew headers, the given rows and a totals row. No Form 101 / bank fields ever reach here. */
export async function buildSheet<T>(title: string, columns: SheetColumn<T>[], rows: T[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title.slice(0, 31), { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, width: Math.max(12, c.header.length + 4) }));
  ws.getRow(1).font = { bold: true };

  for (const r of rows) ws.addRow(columns.map((c) => c.value(r)));

  const n = rows.length;
  ws.addRow(
    columns.map((c, i) => {
      if (i === 0) return "סה״כ";
      if (!c.total || n === 0) return null;
      const col = ws.getColumn(i + 1).letter;
      return { formula: `SUM(${col}2:${col}${n + 1})` };
    }),
  ).font = { bold: true };

  columns.forEach((c, i) => {
    if (c.money) ws.getColumn(i + 1).numFmt = '#,##0.00 "₪"';
  });

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function xlsxResponse(buf: ArrayBuffer, filename: string): Response {
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
