/**
 * Generate a CSV from plain text (one row per line) and trigger download.
 *
 * Each line becomes a single-column row. Values are quoted to handle
 * commas and special characters safely.
 */
export function generateCsv(text: string, filename: string): void {
  const rows = text.split("\n");

  const csvContent = rows
    .map((row) => `"${row.replace(/"/g, '""')}"`)
    .join("\n");

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

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
