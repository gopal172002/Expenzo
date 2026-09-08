import { checkAiGeneratedImage } from "../sightengineService";
import { runElaCheck } from "./elaCheck";
import { runMetadataCheck } from "./metadataCheck";
import { runOcrCheck } from "./ocrCheck";
import {
  type ReceiptFraudAnalysis,
  tierFromScore,
  tierLabel,
} from "./types";

export type { FraudTier, ReceiptFraudAnalysis } from "./types";
export { tierFromScore, tierLabel } from "./types";

export async function analyzeReceiptFraud(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  options: { claimedAmount?: number } = {}
): Promise<ReceiptFraudAnalysis> {
  if (process.env.ENABLE_RECEIPT_FRAUD_PIPELINE === "false") {
    return skippedAnalysis();
  }

  const [metadata, sightengine, ocr, ela] = await Promise.all([
    runMetadataCheck(buffer),
    checkAiGeneratedImage(buffer, mimeType, filename)
      .then((ai) => {
        const aiPoints = ai.configured ? Math.round(ai.aiGeneratedScore * 40) : 0;
        const findings: string[] = [];
        if (ai.configured && ai.aiGeneratedScore >= 0.65) {
          findings.push(
            `Sightengine AI-generated likelihood ${(ai.aiGeneratedScore * 100).toFixed(1)}%`
          );
        } else if (ai.configured && ai.aiGeneratedScore >= 0.35) {
          findings.push(
            `Elevated AI-generated signal ${(ai.aiGeneratedScore * 100).toFixed(1)}%`
          );
        }
        return {
          score: Math.min(40, aiPoints),
          maxScore: 40,
          findings,
          aiGenerated: ai.aiGeneratedScore,
          configured: ai.configured,
        };
      })
      .catch(() => ({
        score: 0,
        maxScore: 40,
        findings: ["Sightengine check unavailable"],
        configured: false,
      })),
    runOcrCheck(buffer, options.claimedAmount).catch((err) => ({
      score: 0,
      maxScore: 20,
      findings: [
        err instanceof Error && err.message.includes("timed out")
          ? "OCR timed out — upload saved, review manually"
          : "OCR check unavailable",
      ],
      textLength: 0,
      confidence: 0,
    })),
    runElaCheck(buffer),
  ]);

  const fraudScore = Math.min(
    100,
    metadata.score + sightengine.score + ocr.score + ela.score + comboBoost(metadata, ocr, ela)
  );
  const tier = tierFromScore(fraudScore);

  const summary =
    tier === "safe"
      ? `Fraud score ${fraudScore}/100 — safe`
      : tier === "manual_review"
        ? `Fraud score ${fraudScore}/100 — manual review recommended`
        : `Fraud score ${fraudScore}/100 — high risk`;

  return {
    fraudScore,
    tier,
    tierLabel: tierLabel(tier),
    components: { metadata, sightengine, ocr, ela },
    summary,
  };
}

function comboBoost(
  metadata: { score: number; hasExif?: boolean },
  ocr: { score: number; confidence?: number },
  ela: { blurVariance?: number; findings: string[] }
): number {
  let boost = 0;
  const screenshot = metadata.hasExif === false;
  const blurry =
    (ela.blurVariance ?? 999) < 180 ||
    ela.findings.some((f) => f.toLowerCase().includes("blur"));
  const weakOcr = (ocr.confidence ?? 100) < 55 || ocr.score >= 8;

  if (screenshot && blurry) boost += 10;
  if (screenshot && weakOcr) boost += 8;
  if (blurry && weakOcr) boost += 6;
  return Math.min(20, boost);
}

function skippedAnalysis(): ReceiptFraudAnalysis {
  return {
    fraudScore: 0,
    tier: "safe",
    tierLabel: "Safe",
    components: {
      metadata: { score: 0, maxScore: 20, findings: ["Pipeline disabled"], hasExif: false },
      sightengine: { score: 0, maxScore: 40, findings: [], configured: false },
      ocr: { score: 0, maxScore: 20, findings: [], textLength: 0, confidence: 0 },
      ela: { score: 0, maxScore: 20, findings: [], anomalyRatio: 0 },
    },
    summary: "Receipt fraud pipeline disabled",
  };
}
