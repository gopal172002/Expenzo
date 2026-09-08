import sharp from "sharp";

export type ElaCheckResult = {
  score: number;
  maxScore: number;
  findings: string[];
  anomalyRatio: number;
  blurVariance: number;
  hotSpotRatio: number;
};

/**
 * Image forensics: true JPEG error-level analysis + Laplacian blur detection.
 * Previous version compared decode vs decode-in-pipeline and always scored ~0.
 */
export async function runElaCheck(buffer: Buffer): Promise<ElaCheckResult> {
  const findings: string[] = [];
  const maxScore = 20;
  let anomalyRatio = 0;
  let blurVariance = 0;
  let hotSpotRatio = 0;
  let score = 0;

  try {
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) {
      return {
        score: 0,
        maxScore,
        findings: ["Could not read image dimensions"],
        anomalyRatio: 0,
        blurVariance: 0,
        hotSpotRatio: 0,
      };
    }

    const maxSide = 800;
    const resized = await sharp(buffer)
      .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
      .toBuffer();

    const { data: original, info } = await sharp(resized)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const resaved = await sharp(resized).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const { data: recompressed } = await sharp(resaved)
      .resize(info.width, info.height, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const pixelCount = info.width * info.height;
    let sumDiff = 0;
    let maxDiff = 0;
    let hotPixels = 0;

    for (let px = 0; px < pixelCount; px += 1) {
      const base = px * channels;
      let channelDiff = 0;
      for (let c = 0; c < Math.min(3, channels); c += 1) {
        channelDiff += Math.abs(original[base + c]! - recompressed[base + c]!);
      }
      const diff = channelDiff / 3;
      sumDiff += diff;
      if (diff > maxDiff) maxDiff = diff;
      if (diff > 18) hotPixels += 1;
    }

    anomalyRatio = pixelCount > 0 ? sumDiff / (pixelCount * 255) : 0;
    hotSpotRatio = pixelCount > 0 ? hotPixels / pixelCount : 0;

    if (hotSpotRatio > 0.012 || maxDiff > 42) {
      score += 16;
      findings.push("ELA hot spots — possible local edits or pasted amounts");
    } else if (hotSpotRatio > 0.006 || anomalyRatio > 0.012 || maxDiff > 30) {
      score += 10;
      findings.push("Moderate ELA inconsistencies — image may have been re-saved or edited");
    } else if (anomalyRatio > 0.01) {
      score += 5;
      findings.push("Mild compression artifacts in ELA");
    }

    const { data: gray } = await sharp(resized)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    blurVariance = laplacianVariance(gray, info.width, info.height);

    if (blurVariance < 80) {
      score += 14;
      findings.push(`Very blurry image (sharpness ${blurVariance.toFixed(0)})`);
    } else if (blurVariance < 180) {
      score += 9;
      findings.push(`Blurry screenshot or low-quality capture (sharpness ${blurVariance.toFixed(0)})`);
    } else if (blurVariance < 320) {
      score += 4;
      findings.push(`Soft focus / mild blur (sharpness ${blurVariance.toFixed(0)})`);
    }
  } catch {
    findings.push("ELA forensics check could not run");
    score = 0;
  }

  return {
    score: Math.min(maxScore, score),
    maxScore,
    findings,
    anomalyRatio,
    blurVariance,
    hotSpotRatio,
  };
}

function laplacianVariance(gray: Buffer, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const lap =
        4 * gray[idx]! -
        gray[idx - 1]! -
        gray[idx + 1]! -
        gray[idx - width]! -
        gray[idx + width]!;
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}
