import jsPDF from "jspdf";

/**
 * Generate a PDF from plain text and trigger a browser download.
 *
 * Layout: bold title → horizontal rule → word-wrapped body text on A4.
 */
export function generatePdf(text: string, filename: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 7;
  let cursorY = margin;

  // ── Title ──────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(filename, margin, cursorY);
  cursorY += 10;

  // ── Horizontal rule ────────────────────────────────────
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // ── Body text ──────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines: string[] = doc.splitTextToSize(text, usableWidth) as string[];

  for (const line of lines) {
    if (cursorY + lineHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.text(line, margin, cursorY);
    cursorY += lineHeight;
  }

  doc.save(`${filename}.pdf`);
}
