import jsPDF from "jspdf";

interface LineSegment {
  text: string;
  bold: boolean;
  mono: boolean;
}

/**
 * Generate a PDF from text (with basic markdown support) and trigger download.
 *
 * Supported markdown:  # headings, **bold**, `inline code`,
 * ```code blocks```, --- horizontal rules, | tables |
 */
export function generatePdf(text: string, filename: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Title ──────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(filename, margin, y);
  y += 10;
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const lines = text.split("\n");
  let inCodeBlock = false;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // ── Code block fences ────────────────────────────────
    if (raw.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        y += 2;
      } else {
        y += 2;
      }
      continue;
    }

    // ── Inside code block ────────────────────────────────
    if (inCodeBlock) {
      ensureSpace(7);
      // Light gray background
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 4, usableWidth, 6, "F");
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);

      const codeLines = doc.splitTextToSize(raw, usableWidth - 4) as string[];
      for (const cl of codeLines) {
        ensureSpace(6);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, usableWidth, 6, "F");
        doc.text(cl, margin + 2, y);
        y += 5.5;
      }
      continue;
    }

    // ── Horizontal rule ──────────────────────────────────
    if (/^-{3,}$/.test(raw.trim()) || /^\*{3,}$/.test(raw.trim())) {
      ensureSpace(8);
      y += 3;
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      continue;
    }

    // ── Empty line ───────────────────────────────────────
    if (raw.trim() === "") {
      y += 4;
      continue;
    }

    // ── Headings ─────────────────────────────────────────
    const headingMatch = raw.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = stripInlineMarkdown(headingMatch[2]);
      const sizes = [18, 15, 13, 12, 11, 10];
      const fontSize = sizes[Math.min(level - 1, 5)];

      ensureSpace(fontSize * 0.6 + 4);
      y += level <= 2 ? 4 : 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(30, 30, 30);

      const headLines = doc.splitTextToSize(headingText, usableWidth) as string[];
      for (const hl of headLines) {
        ensureSpace(fontSize * 0.5);
        doc.text(hl, margin, y);
        y += fontSize * 0.5;
      }
      y += 2;
      continue;
    }

    // ── Table rows ───────────────────────────────────────
    if (raw.trim().startsWith("|") && raw.trim().endsWith("|")) {
      // Skip separator rows like |---|---|
      if (/^\|[\s\-:|]+\|$/.test(raw.trim())) continue;

      const cells = raw
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => stripInlineMarkdown(c.trim()));

      ensureSpace(7);
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);

      const cellWidth = usableWidth / Math.max(cells.length, 1);
      // Subtle row background
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 4, usableWidth, 6, "F");
      doc.setDrawColor(220);
      doc.rect(margin, y - 4, usableWidth, 6, "S");

      cells.forEach((cell, idx) => {
        const truncated = cell.substring(0, Math.floor(cellWidth / 2));
        doc.text(truncated, margin + idx * cellWidth + 2, y);
      });
      y += 6;
      continue;
    }

    // ── Regular paragraph (with inline formatting) ───────
    const plainText = stripInlineMarkdown(raw);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    const wrapped = doc.splitTextToSize(plainText, usableWidth) as string[];
    for (const wl of wrapped) {
      ensureSpace(6);
      doc.text(wl, margin, y);
      y += 6;
    }
  }

  doc.save(`${filename}.pdf`);
}

/** Strip inline markdown tokens for plain text rendering. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/~~(.+?)~~/g, "$1"); // strikethrough
}
