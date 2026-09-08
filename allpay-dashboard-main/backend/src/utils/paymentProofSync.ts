import { PaymentProof } from "../models";

export type PaymentProofStatus = "pending" | "approved" | "rejected";

/** Keep PaymentProof.status in sync when finance approves/rejects the linked transaction. */
export async function syncPaymentProofStatus(
  transactionId: string,
  status: PaymentProofStatus
): Promise<void> {
  await PaymentProof.updateOne({ transactionId }, { $set: { status } }).exec();
}

/** Employee-facing status: prefer linked transaction decision over stale proof row. */
function resolvePaymentProofStatus(
  proof: { status: string; transactionId?: string },
  transactionStatusById: Map<string, string>
): PaymentProofStatus {
  const txStatus = proof.transactionId
    ? transactionStatusById.get(proof.transactionId)
    : undefined;
  if (txStatus === "approved" || txStatus === "rejected") return txStatus;
  if (proof.status === "approved" || proof.status === "rejected") {
    return proof.status;
  }
  return "pending";
}

export function enrichPaymentProofsForEmployee<
  T extends { status: string; transactionId?: string },
>(proofs: T[], transactions: Array<{ id: string; status: string }>): Array<T & { status: PaymentProofStatus }> {
  const txStatusById = new Map(transactions.map((tx) => [tx.id, tx.status]));
  return proofs.map((proof) => ({
    ...proof,
    status: resolvePaymentProofStatus(proof, txStatusById),
  }));
}
