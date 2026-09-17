import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FreeAudit } from "@/lib/data";

export async function buildAuditPdf(logs: FreeAudit[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  page.drawText("SPX Network Development App - Audit Log", { x: 34, y, size: 14, font: bold, color: rgb(0.93, 0.3, 0.18) });
  y -= 22;

  for (const log of logs.slice(0, 200)) {
    if (y < 50) {
      y = 800;
    }
    page.drawText(`${log.createdAt} | ${log.actorEmail} | ${log.action}`, { x: 34, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 12;
  }

  return doc.save();
}
