import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";

type DocxHeadingLevel =
  | (typeof HeadingLevel)[keyof typeof HeadingLevel]
  | undefined;

const HEADING_MAP: Record<number, DocxHeadingLevel> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/**
 * Generate a DOCX from text (with basic markdown support) and trigger download.
 *
 * Supported markdown: # headings, **bold**, *italic*, `inline code`,
 * ```code blocks```, --- horizontal rules, | tables |, * bullet lists
 */
export async function generateDocx(
  text: string,
  filename: string
): Promise<void> {
  const children: (Paragraph | Table)[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  // ── Title ──────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: filename,
          bold: true,
          font: "Calibri",
          size: 40,
          color: "2B579A",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: "CCCCCC",
          space: 4,
        },
      },
      spacing: { after: 300 },
    })
  );

  const flushCodeBlock = () => {
    if (codeBuffer.length === 0) return;
    for (const codeLine of codeBuffer) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLine || " ",
              font: "Consolas",
              size: 18,
              color: "333333",
            }),
          ],
          shading: {
            type: ShadingType.SOLID,
            color: "F5F5F5",
            fill: "F5F5F5",
          },
          spacing: { before: 20, after: 20 },
        })
      );
    }
    codeBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // ── Code block fences ────────────────────────────────
    if (raw.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(raw);
      continue;
    }

    // ── Horizontal rule ──────────────────────────────────
    if (/^-{3,}$/.test(raw.trim()) || /^\*{3,}$/.test(raw.trim())) {
      children.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 4,
              color: "DDDDDD",
              space: 6,
            },
          },
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }

    // ── Empty line ───────────────────────────────────────
    if (raw.trim() === "") {
      children.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
      continue;
    }

    // ── Headings ─────────────────────────────────────────
    const headingMatch = raw.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const sizes = [32, 28, 24, 22, 20, 18];

      children.push(
        new Paragraph({
          children: parseInlineMarkdown(headingText, {
            bold: true,
            size: sizes[Math.min(level - 1, 5)],
          }),
          heading: HEADING_MAP[level],
          spacing: { before: level <= 2 ? 300 : 200, after: 120 },
        })
      );
      continue;
    }

    // ── Table rows ───────────────────────────────────────
    if (raw.trim().startsWith("|") && raw.trim().endsWith("|")) {
      // Collect all table rows
      const tableRows: string[][] = [];
      let j = i;
      while (
        j < lines.length &&
        lines[j].trim().startsWith("|") &&
        lines[j].trim().endsWith("|")
      ) {
        const row = lines[j].trim();
        // Skip separator rows
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          const cells = row
            .split("|")
            .filter((c) => c !== "")
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        j++;
      }
      i = j - 1; // advance outer loop

      if (tableRows.length > 0) {
        const maxCols = Math.max(...tableRows.map((r) => r.length));
        const docxRows = tableRows.map(
          (cells, rowIdx) =>
            new TableRow({
              children: Array.from({ length: maxCols }, (_, colIdx) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: parseInlineMarkdown(cells[colIdx] || "", {
                        bold: rowIdx === 0,
                        size: 20,
                      }),
                    }),
                  ],
                  shading:
                    rowIdx === 0
                      ? {
                          type: ShadingType.SOLID,
                          color: "E8E8E8",
                          fill: "E8E8E8",
                        }
                      : undefined,
                  width: {
                    size: Math.floor(100 / maxCols),
                    type: WidthType.PERCENTAGE,
                  },
                })
              ),
            })
        );

        children.push(
          new Table({
            rows: docxRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
        children.push(new Paragraph({ spacing: { after: 120 } }));
      }
      continue;
    }

    // ── Bullet lists ─────────────────────────────────────
    const bulletMatch = raw.match(/^(\s*)[*\-+]\s+(.*)$/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "• ", font: "Calibri", size: 22 }),
            ...parseInlineMarkdown(bulletMatch[2]),
          ],
          indent: { left: 360 + indent * 360 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // ── Regular paragraph ────────────────────────────────
    children.push(
      new Paragraph({
        children: parseInlineMarkdown(raw),
        spacing: { after: 120 },
      })
    );
  }

  // Flush remaining code if file ended mid-block
  flushCodeBlock();

  const doc = new Document({
    creator: "Text Transformer",
    title: filename,
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/** Parse inline markdown (**bold**, *italic*, `code`) into TextRun[] */
function parseInlineMarkdown(
  text: string,
  defaults: { bold?: boolean; size?: number } = {}
): TextRun[] {
  const runs: TextRun[] = [];
  const { bold: defaultBold = false, size: defaultSize = 22 } = defaults;

  // Regex to match **bold**, *italic*, `code`, or plain text
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|([^*`]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // **bold**
      runs.push(
        new TextRun({
          text: match[2],
          bold: true,
          font: "Calibri",
          size: defaultSize,
        })
      );
    } else if (match[4]) {
      // *italic*
      runs.push(
        new TextRun({
          text: match[4],
          italics: true,
          font: "Calibri",
          size: defaultSize,
        })
      );
    } else if (match[6]) {
      // `code`
      runs.push(
        new TextRun({
          text: match[6],
          font: "Consolas",
          size: defaultSize - 2,
          color: "C7254E",
          shading: {
            type: ShadingType.SOLID,
            color: "F9F2F4",
            fill: "F9F2F4",
          },
        })
      );
    } else if (match[7]) {
      // plain text
      runs.push(
        new TextRun({
          text: match[7],
          bold: defaultBold,
          font: "Calibri",
          size: defaultSize,
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: text || " ",
        bold: defaultBold,
        font: "Calibri",
        size: defaultSize,
      })
    );
  }

  return runs;
}
