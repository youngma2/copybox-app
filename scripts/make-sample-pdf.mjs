// 테스트용 6페이지 샘플 PDF 생성 (pdf-lib)
// 사용법: node scripts/make-sample-pdf.mjs [페이지수] [출력경로]
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const pageCount = Number(process.argv[2] ?? 6);
const outPath = process.argv[3] ?? path.join(process.cwd(), 'scripts', 'sample-6p.pdf');

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.HelveticaBold);
const body = await doc.embedFont(StandardFonts.Helvetica);

for (let i = 1; i <= pageCount; i += 1) {
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: rgb(0.12, 0.31, 0.85) });
  page.drawText('COPYBOX', { x: 48, y: height - 72, size: 24, font, color: rgb(1, 1, 1) });
  page.drawText('Sample document for auto page count test', {
    x: 48,
    y: height - 100,
    size: 10,
    font: body,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Page ${i} / ${pageCount}`, { x: 48, y: height - 180, size: 28, font, color: rgb(0.07, 0.1, 0.18) });
  page.drawText('Sample file for the COPYBOX auto-quote test.', {
    x: 48,
    y: height - 220,
    size: 11,
    font: body,
    color: rgb(0.3, 0.34, 0.42),
  });
  for (let line = 0; line < 12; line += 1) {
    page.drawRectangle({
      x: 48,
      y: height - 280 - line * 26,
      width: width - 96,
      height: 8,
      color: rgb(0.85 + (line % 2) * 0.05, 0.87, 0.92),
    });
  }
  page.drawText('This file is generated only for the prototype verification.', {
    x: 48,
    y: 48,
    size: 9,
    font: body,
    color: rgb(0.6, 0.63, 0.7),
  });
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, await doc.save());
console.log(`wrote ${outPath} (${pageCount} pages)`);
