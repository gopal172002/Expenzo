import Tesseract from "tesseract.js";
import sharp from "sharp";

function ocrEnabled(): boolean {
  return process.env.ENABLE_RECEIPT_OCR !== "false";
}

const OCR_TIMEOUT_MS = Number(process.env.RECEIPT_OCR_TIMEOUT_MS) || 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function runOcrCheck(
  buffer: Buffer,
  claimedAmount?: number
): Promise<{
  score: number;
  maxScore: number;
  findings: string[];
  textLength: number;
  confidence: number;
}> {
  const maxScore = 20;
  if (!ocrEnabled()) {
    return {
      score: 0,
      maxScore,
      findings: ["OCR skipped (ENABLE_RECEIPT_OCR=false)"],
      textLength: 0,
      confidence: 0,
    };
  }

  const findings: string[] = [];
  let score = 0;

  let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | undefined;
  try {
    try {
      await sharp(buffer).metadata();
    } catch {
      return {
        score: 4,
        maxScore,
        findings: ["Invalid or unreadable receipt image (OCR skipped)"],
        textLength: 0,
        confidence: 0,
      };
    }

    worker = await Tesseract.createWorker("eng", 1, { logger: () => undefined });
    const result = await withTimeout(worker.recognize(buffer), OCR_TIMEOUT_MS, "Receipt OCR");
    const text = result.data.text.replace(/\s+/g, " ").trim();
    const confidence = result.data.confidence ?? 0;

    if (text.length < 12) {
      score += 15;
      findings.push("Very little readable text on receipt (OCR)");
    } else if (text.length < 35) {
      score += 8;
      findings.push("Limited receipt text extracted (OCR)");
    }

    if (claimedAmount != null && claimedAmount > 0) {
      const digits = String(Math.round(claimedAmount));
      const numericBlob = text.replace(/[^\d]/g, "");
      const hasClaimed = text.includes(digits) || numericBlob.includes(digits);
      if (!hasClaimed) {
        score += 10;
        findings.push("Submitted amount not found in OCR text");
      }
      const amountMatches = text.match(/\b\d{2,6}\b/g) ?? [];
      const conflicting = amountMatches.filter((n) => n !== digits && Math.abs(Number(n) - claimedAmount) > 1);
      if (hasClaimed && conflicting.length > 0) {
        score += 8;
        findings.push("Multiple conflicting amounts detected in receipt text");
      }
    }

    if (confidence > 0 && confidence < 55) {
      score += 8;
      findings.push(`Low OCR confidence (${confidence.toFixed(0)}%) — blur or poor capture`);
    } else if (confidence > 0 && confidence < 70) {
      score += 4;
      findings.push(`Moderate OCR confidence (${confidence.toFixed(0)}%)`);
    }

    return {
      score: Math.min(maxScore, score),
      maxScore,
      findings,
      textLength: text.length,
      confidence,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR extraction failed";
    return {
      score: message.includes("timed out") ? 2 : 4,
      maxScore,
      findings: [
        message.includes("timed out")
          ? "OCR timed out — upload saved, review manually"
          : "OCR extraction failed",
      ],
      textLength: 0,
      confidence: 0,
    };
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
  }
}
