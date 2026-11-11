export type Col<T> = { header: string; value: (row: T) => string | number };

export function exportCSV<T>(filename: string, cols: Col<T>[], rows: T[]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.map((c) => esc(c.header)).join(","), ...rows.map((r) => cols.map((c) => esc(c.value(r))).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportPDF<T>(title: string, cols: Col<T>[], rows: T[], subtitle?: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: cols.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.text(subtitle ?? `Generated ${new Date().toLocaleString()}`, 14, 25);
  autoTable(doc, {
    startY: 30,
    head: [cols.map((c) => c.header)],
    body: rows.map((r) => cols.map((c) => String(c.value(r)))),
    headStyles: { fillColor: [27, 45, 102] },
    styles: { fontSize: 8 },
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
