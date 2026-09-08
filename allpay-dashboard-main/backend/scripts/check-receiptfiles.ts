import dotenv from "dotenv";
import path from "node:path";
import mongoose from "mongoose";
import { receiptStorageMode } from "../src/services/s3Service";
import { ReceiptFile, Transaction } from "../src/models";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  console.log("RECEIPT_STORAGE mode:", receiptStorageMode());
  const uri = process.env.MONGO_URI ?? "";
  console.log("Database:", uri.split("/").pop()?.split("?")[0]);

  await mongoose.connect(uri);
  const cols = await mongoose.connection.db!.listCollections().toArray();
  console.log(
    "Collections:",
    cols
      .map((c) => c.name)
      .sort()
      .join(", ")
  );

  const count = await ReceiptFile.countDocuments();
  console.log("receiptfiles document count:", count);

  if (count > 0) {
    const latest = await ReceiptFile.findOne()
      .sort({ createdAt: -1 })
      .select({ id: 1, transactionId: 1, size: 1, contentType: 1, createdAt: 1 })
      .lean();
    console.log("Latest receiptfiles doc:", latest);
  }

  const txs = await Transaction.find({ receiptUrl: { $exists: true, $ne: null } })
    .select({ id: 1, receiptUrl: 1 })
    .sort({ dateTime: -1 })
    .limit(5)
    .lean();
  console.log("Transactions with receiptUrl (latest 5):");
  for (const tx of txs) {
    const isMongo = tx.receiptUrl?.includes("/api/receipts/");
    console.log(`  ${tx.id} | mongo=${isMongo} | ${tx.receiptUrl}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
