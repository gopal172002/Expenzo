import {
  applyUpiStatusTransition,
  canTransitionUpiStatus,
  shouldCreateExpense,
} from "../services/upiIntentState";

describe("upiIntentState", () => {
  it("allows the documented transitions", () => {
    expect(canTransitionUpiStatus("INITIATED", "UPI_APP_OPENED")).toBe(true);
    expect(canTransitionUpiStatus("UPI_APP_OPENED", "SUCCESS_REPORTED")).toBe(true);
    expect(canTransitionUpiStatus("UPI_APP_OPENED", "FAILED")).toBe(true);
    expect(canTransitionUpiStatus("UPI_APP_OPENED", "PENDING")).toBe(true);
    expect(canTransitionUpiStatus("UPI_APP_OPENED", "CANCELLED")).toBe(true);
    expect(canTransitionUpiStatus("UPI_APP_OPENED", "UNKNOWN")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(canTransitionUpiStatus("FAILED", "INITIATED")).toBe(false);
    expect(canTransitionUpiStatus("SUCCESS_REPORTED", "INITIATED")).toBe(false);
    expect(applyUpiStatusTransition("SUCCESS_REPORTED", "FAILED").ok).toBe(false);
  });

  it("creates expenses only for reported success or user confirmation", () => {
    expect(shouldCreateExpense("SUCCESS_REPORTED")).toBe(true);
    expect(shouldCreateExpense("USER_CONFIRMED")).toBe(true);
    expect(shouldCreateExpense("PENDING")).toBe(false);
    expect(shouldCreateExpense("UNKNOWN")).toBe(false);
  });
});
