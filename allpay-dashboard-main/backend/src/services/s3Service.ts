import { randomBytes } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { saveReceiptToMongo } from "./receiptStorageService";



const BUCKET = "receipts";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://127.0.0.1:4566";

const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE || S3_ENDPOINT;



const s3 = new S3Client({

  region: process.env.AWS_REGION || "us-east-1",

  endpoint: S3_ENDPOINT,

  credentials: {

    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",

    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",

  },

  forcePathStyle: true,

});



export type ReceiptStorageMode = "mongo" | "s3";



function extFromMime(mime: string, originalName: string): string {

  if (mime === "image/png") return ".png";

  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";

  if (mime === "image/webp") return ".webp";

  if (mime === "image/gif") return ".gif";

  const m = originalName.match(/(\.[a-zA-Z0-9]+)$/);

  return m ? m[1]! : ".bin";

}



function buildObjectKey(transactionId: string, contentType: string, originalName: string): string {

  return `tx/${transactionId}/${randomBytes(12).toString("hex")}${extFromMime(contentType, originalName)}`;

}



export function receiptStorageMode(): ReceiptStorageMode {

  const configured = process.env.RECEIPT_STORAGE?.trim().toLowerCase();

  if (configured === "s3") return "s3";

  return "mongo";

}



function isS3ConnectionError(err: unknown): boolean {

  const code = (err as NodeJS.ErrnoException)?.code;

  const message = err instanceof Error ? err.message : String(err);

  return code === "ECONNREFUSED" || code === "ENOTFOUND" || /ECONNREFUSED|connect ECONNREFUSED/i.test(message);

}



async function uploadFileS3(

  buffer: Buffer,

  transactionId: string,

  contentType: string,

  originalName: string,

): Promise<string> {

  const key = buildObjectKey(transactionId, contentType, originalName);

  await s3.send(

    new PutObjectCommand({

      Bucket: BUCKET,

      Key: key,

      Body: buffer,

      ContentType: contentType,

    }),

  );

  return `${S3_PUBLIC_BASE.replace(/\/$/, "")}/${BUCKET}/${key}`;

}



export async function uploadFile(

  buffer: Buffer,

  transactionId: string,

  contentType: string,

  originalName: string,

): Promise<string> {

  const mode = receiptStorageMode();



  if (mode === "mongo") {

    return saveReceiptToMongo(buffer, transactionId, contentType, originalName);

  }



  try {

    return await uploadFileS3(buffer, transactionId, contentType, originalName);

  } catch (err) {

    if (process.env.NODE_ENV !== "production" && isS3ConnectionError(err)) {

      console.warn(

        "S3/LocalStack unavailable; saving receipt to MongoDB instead."

      );

      return saveReceiptToMongo(buffer, transactionId, contentType, originalName);

    }

    throw err;

  }

}


