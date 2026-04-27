/**
 * Generate a CSV from text and trigger download.
 *
 * Strategy:
 * - If the text contains markdown tables (| col | col |), extract those as CSV rows.
 * - Otherwise, treat each line as a single-column row with proper escaping.
 */
export function generateCsv(text: string, filename: string): void {
  const lines = text.split("\n");

  // ── Detect if text has markdown tables ─────────────────
  const tableLines = lines.filter(
    (l) =>
      l.trim().startsWith("|") &&
      l.trim().endsWith("|") &&
      !/^\|[\s\-:|]+\|$/.test(l.trim()) // skip separator rows
  );

  let csvContent: string;

  if (tableLines.length >= 2) {
    // Extract table data into proper CSV
    csvContent = tableLines
      .map((line) =>
        line
          .split("|")
          .filter((c) => c !== "")
          .map((cell) => escapeCell(stripInlineMarkdown(cell.trim())))
          .join(",")
      )
      .join("\n");
  } else {
    // Fallback: one row per line, strip markdown formatting
    csvContent = lines
      .map((line) => escapeCell(stripInlineMarkdown(line)))
      .join("\n");
  }

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Escape a cell value for CSV: wrap in quotes, double internal quotes. */
function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Strip inline markdown tokens for clean CSV text. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^#{1,6}\s+/, ""); // strip heading markers
}
