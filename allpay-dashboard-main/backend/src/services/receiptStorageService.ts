import { randomBytes } from "node:crypto";
import dayjs from "dayjs";
import { ReceiptFile } from "../models";

function publicApiBase(): string {
  const configured = process.env.API_PUBLIC_BASE?.replace(/\/$/, "");
  if (configured) return configured;
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}/api`;
}

export async function saveReceiptToMongo(
  buffer: Buffer,
  transactionId: string,
  contentType: string,
  originalName: string
): Promise<string> {
  const id = randomBytes(16).toString("hex");
  await ReceiptFile.create({
    id,
    transactionId,
    contentType: contentType || "application/octet-stream",
    originalName: originalName || "receipt",
    size: buffer.length,
    data: buffer,
    createdAt: dayjs().toISOString(),
  });
  return `${publicApiBase()}/receipts/${id}`;
}

export async function loadReceiptFromMongo(receiptId: string) {
  return ReceiptFile.findOne({ id: receiptId })
    .select({ id: 1, contentType: 1, originalName: 1, size: 1, data: 1 })
    .lean()
    .exec();
}

export function receiptFileToBuffer(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "string") {
    if (data.startsWith("<?xml") || data.startsWith("<svg") || data.startsWith("\uFFFD") || data.startsWith("\x89PNG")) {
      return Buffer.from(data, "binary");
    }
    try {
      return Buffer.from(data, "base64");
    } catch {
      return Buffer.from(data, "utf8");
    }
  }
  if (typeof data === "object" && data !== null && "buffer" in data) {
    return Buffer.from((data as { buffer: Uint8Array }).buffer);
  }
  return null;
}
