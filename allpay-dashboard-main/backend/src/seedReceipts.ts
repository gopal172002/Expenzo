import { createHash } from "node:crypto";
import dayjs from "dayjs";
import { ReceiptFile, Transaction } from "./models";

function demoReceiptId(transactionId: string): string {
  return createHash("md5").update(`allpay-demo-receipt:${transactionId}`).digest("hex");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDemoReceiptSvg(opts: {
  merchantName: string;
  amount: number;
  dateLabel: string;
  employeeName: string;
  transactionId: string;
  category: string;
}): string {
  const merchant = escapeXml(opts.merchantName);
  const employee = escapeXml(opts.employeeName);
  const txId = escapeXml(opts.transactionId);
  const category = escapeXml(opts.category);
  const amount = `Rs.${opts.amount.toLocaleString("en-IN")}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="640" viewBox="0 0 420 640">
  <rect width="420" height="640" fill="#fff8ef"/>
  <rect x="24" y="24" width="372" height="592" rx="10" fill="#ffffff" stroke="#e2d6c3"/>
  <text x="210" y="72" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#1f2937">${merchant}</text>
  <text x="210" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">TAX INVOICE / RECEIPT</text>
  <line x1="48" y1="118" x2="372" y2="118" stroke="#e5e7eb"/>
  <text x="48" y="150" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Employee</text>
  <text x="372" y="150" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#111827">${employee}</text>
  <text x="48" y="178" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Category</text>
  <text x="372" y="178" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#111827">${category}</text>
  <text x="48" y="206" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Date</text>
  <text x="372" y="206" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#111827">${escapeXml(opts.dateLabel)}</text>
  <text x="48" y="234" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Ref</text>
  <text x="372" y="234" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#111827">${txId}</text>
  <rect x="48" y="268" width="324" height="72" rx="8" fill="#f8fafc"/>
  <text x="64" y="298" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Amount paid</text>
  <text x="64" y="326" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">${amount}</text>
  <text x="210" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">UPI / card payment captured for AllPay</text>
  <text x="210" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#9ca3af">Demo receipt seeded for local preview</text>
  <line x1="72" y1="500" x2="348" y2="500" stroke="#d1d5db" stroke-dasharray="4 6"/>
  <text x="210" y="530" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#374151">Thank you</text>
</svg>`;
}

function fraudForStatus(status: string): { receiptFraudScore: number; receiptFraudTier: "safe" | "manual_review" | "high_risk" } {
  if (status === "flagged") return { receiptFraudScore: 64, receiptFraudTier: "manual_review" };
  if (status === "rejected") return { receiptFraudScore: 81, receiptFraudTier: "high_risk" };
  return { receiptFraudScore: 18, receiptFraudTier: "safe" };
}

/** Attach demo receipt images so the receipts dashboard has something to show. */
export async function ensureDemoReceipts(): Promise<number> {
  const txs = await Transaction.find({
    $or: [{ id: /^TX-DEMO-/ }, { id: { $in: ["TX-70001", "TX-70002"] } }],
  }).lean();

  let attached = 0;
  for (const tx of txs) {
    const id = demoReceiptId(tx.id);
    const existingFile = await ReceiptFile.findOne({ id }).select({ id: 1 }).lean();
    const svg = buildDemoReceiptSvg({
      merchantName: tx.merchantName,
      amount: tx.amount,
      dateLabel: dayjs(tx.dateTime).format("DD MMM YYYY HH:mm"),
      employeeName: tx.employeeName,
      transactionId: tx.id,
      category: tx.category,
    });
    const buffer = Buffer.from(svg, "utf8");
    if (!existingFile) {
      await ReceiptFile.create({
        id,
        transactionId: tx.id,
        contentType: "image/svg+xml",
        originalName: `${tx.id}-receipt.svg`,
        size: buffer.length,
        data: buffer,
        createdAt: dayjs().toISOString(),
      });
    }
    const receiptUrl = `/api/receipts/${id}`;
    const fraud = tx.receiptFraudScore == null ? fraudForStatus(String(tx.status)) : {};
    await Transaction.updateOne(
      { id: tx.id },
      {
        $set: {
          receiptUrl,
          ...fraud,
        },
      }
    );
    attached += 1;
  }
  return attached;
}
