import { assertMerchantPayee, isMerchantMcc } from "../services/merchantPayee";

describe("merchant payee rules", () => {
  it("accepts a shop VPA with MCC", () => {
    expect(isMerchantMcc("5812")).toBe(true);
    expect(assertMerchantPayee({ vpa: "hotel@okbiz", mcc: "7011" }).vpa).toBe("hotel@okbiz");
  });

  it("rejects personal UPI IDs", () => {
    expect(isMerchantMcc("0000")).toBe(false);
    expect(() => assertMerchantPayee({ vpa: "ramesh@oksbi", mcc: "0000" })).toThrow(/merchant/);
    expect(() => assertMerchantPayee({ vpa: "ramesh@oksbi" })).toThrow(/merchant/);
  });
});
