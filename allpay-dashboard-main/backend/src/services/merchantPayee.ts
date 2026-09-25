const VPA_PATTERN = /^[a-zA-Z0-9._-]{1,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isMerchantMcc(mcc?: string | null): boolean {
  const code = String(mcc ?? "").trim();
  return code.length > 0 && code !== "0000";
}

export function isValidVpa(vpa?: string | null): boolean {
  return VPA_PATTERN.test(String(vpa ?? "").trim());
}

export class MerchantPayeeError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "MerchantPayeeError";
  }
}

/** AllPay only pays shop / business QRs — personal UPI IDs are rejected. */
export function assertMerchantPayee(input: { vpa?: string; mcc?: string | null }): {
  vpa: string;
  mcc: string;
} {
  const vpa = String(input.vpa ?? "").trim();
  const mcc = String(input.mcc ?? "").trim();
  if (!isValidVpa(vpa)) {
    throw new MerchantPayeeError("A valid merchant UPI ID is required");
  }
  if (!isMerchantMcc(mcc)) {
    throw new MerchantPayeeError(
      "AllPay only pays merchant / shop QRs. Personal UPI IDs are not supported."
    );
  }
  return { vpa, mcc };
}
