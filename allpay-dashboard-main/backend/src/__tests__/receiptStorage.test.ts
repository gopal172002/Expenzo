/**
 * Receipt images stored in MongoDB (ReceiptFile collection).
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../server";
import { ReceiptFile } from "../models";
import { saveReceiptToMongo } from "../services/receiptStorageService";

describe("receipt MongoDB storage", () => {
  let memoryMongo: MongoMemoryServer | null = null;

  beforeAll(async () => {
    process.env.RECEIPT_STORAGE = "mongo";
    if (process.env.USE_LIVE_MONGO) {
      await mongoose.connect(process.env.MONGO_URI!);
    } else {
      memoryMongo = await MongoMemoryServer.create();
      await mongoose.connect(memoryMongo.getUri());
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (memoryMongo) await memoryMongo.stop();
  });

  it("saves bytes in MongoDB and serves via GET /api/receipts/:id", async () => {
    const buffer = Buffer.from("fake-receipt-image-bytes");
    const url = await saveReceiptToMongo(buffer, "TX-TEST-1", "image/jpeg", "bill.jpg");
    expect(url).toMatch(/\/api\/receipts\/[a-f0-9]{32}$/i);

    const receiptId = url.split("/").pop()!;
    const stored = await ReceiptFile.findOne({ id: receiptId }).exec();
    expect(stored?.size).toBe(buffer.length);
    expect(Buffer.compare(Buffer.from(stored!.data), buffer)).toBe(0);
    expect(stored?.transactionId).toBe("TX-TEST-1");

    const res = await request(app).get(`/api/receipts/${receiptId}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/jpeg/);
  });
});
