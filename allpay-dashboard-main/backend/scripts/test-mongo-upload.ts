/**
 * Quick smoke test: employee payment proof upload should save to receiptfiles.
 * Usage: npx tsx scripts/test-mongo-upload.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import mongoose from "mongoose";
import sharp from "sharp";
import { ReceiptFile } from "../src/models";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API = "http://localhost:5000/api";

async function main() {
  const before = await mongoose.connect(process.env.MONGO_URI!);
  const countBefore = await ReceiptFile.countDocuments();

  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: "emp0", password: "password123", portal: "employee" }),
  });
  const { token } = (await login.json()) as { token?: string };
  if (!token) throw new Error("login failed");

  const imageBytes = await sharp({
    create: { width: 120, height: 80, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer();

  const fd = new FormData();
  fd.append("paymentType", "Cash");
  fd.append("amount", "100");
  fd.append("description", "Mongo storage smoke test");
  fd.append("receipt", new Blob([imageBytes], { type: "image/png" }), "test.png");

  const submit = await fetch(`${API}/employee/payment-proofs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const body = (await submit.json()) as { transaction?: { receiptUrl?: string }; error?: string };
  const countAfter = await ReceiptFile.countDocuments();

  console.log("submit status:", submit.status);
  console.log("receiptUrl:", body.transaction?.receiptUrl);
  console.log("isMongo:", body.transaction?.receiptUrl?.includes("/api/receipts/"));
  console.log("receiptfiles count:", countBefore, "->", countAfter);
  if (body.error) console.log("error:", body.error);

  await before.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
