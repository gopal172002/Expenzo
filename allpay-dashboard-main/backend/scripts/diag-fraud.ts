import fs from "node:fs";
import sharp from "sharp";
import { runMetadataCheck } from "../src/services/receiptFraud/metadataCheck";
import { runElaCheck } from "../src/services/receiptFraud/elaCheck";
import { runOcrCheck } from "../src/services/receiptFraud/ocrCheck";
import { analyzeReceiptFraud } from "../src/services/receiptFraud/receiptFraudService";

async function analyze(buf: Buffer, label: string, amount = 500) {
  const m = await runMetadataCheck(buf);
  const e = await runElaCheck(buf);
  const o = await runOcrCheck(buf, amount);
  console.log(`--- ${label}`);
  console.log(`  metadata: ${m.score}/20 — ${m.findings.join("; ") || "(none)"}`);
  console.log(
    `  ela: ${e.score}/20 — ratio ${e.anomalyRatio?.toFixed(4)} blurVar ${e.blurVariance?.toFixed(0)} hot ${(e.hotSpotRatio! * 100).toFixed(2)}% — ${e.findings.join("; ") || "(none)"}`
  );
  console.log(
    `  ocr: ${o.score}/20 — conf ${o.confidence?.toFixed(1)} len ${o.textLength} — ${o.findings.join("; ") || "(none)"}`
  );
  console.log(`  subtotal (no Sightengine): ${m.score + e.score + o.score}/60`);

  const full = await analyzeReceiptFraud(buf, "image/jpeg", "diag.jpg", { claimedAmount: amount });
  console.log(`  TOTAL with combo boost: ${full.fraudScore}/100 (${full.tierLabel})`);
}

async function main() {
  const receiptPath = process.argv[2];
  if (receiptPath && fs.existsSync(receiptPath)) {
    await analyze(fs.readFileSync(receiptPath), `file: ${receiptPath}`);
  }

  const clean = await sharp({
    create: { width: 400, height: 600, channels: 3, background: { r: 250, g: 250, b: 250 } },
  })
    .jpeg()
    .toBuffer();
  await analyze(clean, "blank jpeg");

  const blurred = await sharp(clean).blur(10).jpeg().toBuffer();
  await analyze(blurred, "blurred jpeg");

  const pngShot = await sharp(clean).png().toBuffer();
  await analyze(pngShot, "png screenshot (no exif)");

  const textReceipt = await sharp({
    create: { width: 400, height: 600, channels: 3, background: "#ffffff" },
  })
    .composite([
      {
        input: {
          text: {
            text: "RESTAURANT BILL\nTotal: Rs 500\nThank you",
            width: 360,
            height: 200,
            rgba: true,
          },
        },
        top: 40,
        left: 20,
      },
    ])
    .jpeg()
    .toBuffer();
  await analyze(textReceipt, "text receipt jpeg", 500);

  const wrongAmount = await sharp(textReceipt)
    .composite([
      {
        input: {
          text: {
            text: "Total: Rs 9999",
            width: 200,
            height: 40,
            rgba: true,
          },
        },
        top: 120,
        left: 20,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
  await analyze(wrongAmount, "edited amount overlay", 500);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
