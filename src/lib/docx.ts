import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

/**
 * Generate a DOCX from plain text and trigger a browser download.
 *
 * Structure: Heading 1 title → thin bottom border → body paragraphs.
 */
export async function generateDocx(
  text: string,
  filename: string
): Promise<void> {
  const paragraphs = text.split("\n").map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: "Calibri",
            size: 24, // 12pt (half-points)
          }),
        ],
        spacing: { after: 120 },
      })
  );

  const doc = new Document({
    creator: "Text Transformer",
    title: filename,
    sections: [
      {
        children: [
          // ── Title ──
          new Paragraph({
            children: [
              new TextRun({
                text: filename,
                bold: true,
                font: "Calibri",
                size: 40, // 20pt
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
          }),
          // ── Body ──
          ...paragraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}
