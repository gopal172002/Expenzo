import {
  categoriesMatch,
  evaluateTransactionAgainstPolicies,
  formatPolicyWarning,
  normalizeCategory,
} from "../services/policyEvaluationService";
import type { ExpensePolicy } from "../services/analyticsTypes";

const basePolicy = (overrides: Partial<ExpensePolicy> = {}): ExpensePolicy => ({
  id: "POL-TEST",
  name: "Food limit",
  mccCategory: "food",
  maxPerTransaction: 500,
  maxPerMonth: 3000,
  allowedDays: [0, 1, 2, 3, 4, 5, 6],
  scopeType: "all",
  startDate: "2000-01-01",
  active: true,
  ...overrides,
});

describe("policyEvaluationService", () => {
  it("normalizes food category aliases", () => {
    expect(normalizeCategory("Meals")).toBe("food");
    expect(normalizeCategory("FOOD")).toBe("food");
    expect(categoriesMatch("Meals", "food")).toBe(true);
    expect(categoriesMatch("fuel", "food")).toBe(false);
  });

  it("flags transaction over per-transaction cap", () => {
    const violations = evaluateTransactionAgainstPolicies(
      {
        amount: 800,
        category: "food",
        employeeId: "emp1",
        department: "Engineering",
        dateTime: new Date().toISOString(),
      },
      [basePolicy()],
      new Map()
    );
    expect(violations).toHaveLength(1);
    expect(formatPolicyWarning(violations)).toContain("exceeds per-transaction cap");
  });

  it("flags transaction over monthly cap", () => {
    const monthlyMap = new Map([["emp1|food", 2800]]);
    const violations = evaluateTransactionAgainstPolicies(
      {
        amount: 400,
        category: "food",
        employeeId: "emp1",
        department: "Engineering",
        dateTime: new Date().toISOString(),
      },
      [basePolicy()],
      monthlyMap
    );
    expect(violations).toHaveLength(1);
    expect(formatPolicyWarning(violations)).toContain("over cap");
  });

  it("applies all-categories spend limit", () => {
    const policy = basePolicy({
      name: "Total spend cap",
      mccCategory: "all",
      maxPerTransaction: 10000,
      maxPerMonth: 5000,
    });
    const monthlyMap = new Map([["emp1|all", 4800]]);
    const violations = evaluateTransactionAgainstPolicies(
      {
        amount: 300,
        category: "travel",
        employeeId: "emp1",
        department: "Engineering",
        dateTime: new Date().toISOString(),
      },
      [policy],
      monthlyMap
    );
    expect(violations).toHaveLength(1);
  });

  it("ignores inactive policies", () => {
    const violations = evaluateTransactionAgainstPolicies(
      {
        amount: 9000,
        category: "food",
        employeeId: "emp1",
        department: "Engineering",
        dateTime: new Date().toISOString(),
      },
      [basePolicy({ active: false })],
      new Map()
    );
    expect(violations).toHaveLength(0);
  });
});
