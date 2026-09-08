import dayjs from "dayjs";
import type { ExpensePolicy } from "./analyticsTypes";

/** Canonical spend categories used across mobile + dashboard. */
const CATEGORY_ALIASES: Record<string, string> = {
  food: "food",
  meals: "food",
  meal: "food",
  dining: "food",
  restaurant: "food",
  fuel: "fuel",
  petrol: "fuel",
  gas: "fuel",
  travel: "travel",
  groceries: "groceries",
  grocery: "groceries",
  office: "office",
  all: "all",
};

export function normalizeCategory(category: string): string {
  const key = category.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? key;
}

export function categoriesMatch(policyCategory: string, txCategory: string): boolean {
  const policyNorm = normalizeCategory(policyCategory);
  if (!policyCategory || policyNorm === "all") return true;
  return policyNorm === normalizeCategory(txCategory);
}

export const POLICY_CATEGORIES = [
  { value: "all", label: "All categories (spend limit)" },
  { value: "food", label: "Food / Meals" },
  { value: "fuel", label: "Fuel" },
  { value: "travel", label: "Travel" },
  { value: "groceries", label: "Groceries" },
  { value: "office", label: "Office" },
] as const;

export type PolicyTxContext = {
  id?: string;
  amount: number;
  dateTime: string;
  category: string;
  employeeId: string;
  department: string;
};

export function isPolicyActive(policy: ExpensePolicy, at = dayjs()): boolean {
  if (policy.active === false) return false;
  if (policy.startDate && at.isBefore(dayjs(policy.startDate).startOf("day"), "day")) {
    return false;
  }
  if (policy.endDate && at.isAfter(dayjs(policy.endDate).endOf("day"), "day")) {
    return false;
  }
  return true;
}

export function inPolicyScope(tx: PolicyTxContext, policy: ExpensePolicy): boolean {
  if (policy.scopeType === "all") return true;
  if (policy.scopeType === "department") {
    return Boolean(policy.scopeValue) && tx.department === policy.scopeValue;
  }
  if (policy.scopeType === "employee") {
    return Boolean(policy.scopeValue) && tx.employeeId === policy.scopeValue;
  }
  return false;
}

export function withinPolicyDateRange(tx: PolicyTxContext, policy: ExpensePolicy): boolean {
  const t = dayjs(tx.dateTime);
  if (policy.startDate && t.isBefore(dayjs(policy.startDate).startOf("day"), "day")) {
    return false;
  }
  if (policy.endDate && t.isAfter(dayjs(policy.endDate).endOf("day"), "day")) {
    return false;
  }
  return true;
}

export type PolicyViolation = {
  policyId: string;
  policyName: string;
  reasons: string[];
};

export function evaluateTransactionAgainstPolicy(
  tx: PolicyTxContext,
  policy: ExpensePolicy,
  monthlyCategorySpend = 0
): PolicyViolation | null {
  if (!isPolicyActive(policy, dayjs(tx.dateTime))) return null;
  if (!withinPolicyDateRange(tx, policy)) return null;
  if (!inPolicyScope(tx, policy)) return null;
  if (!categoriesMatch(policy.mccCategory, tx.category)) return null;

  const reasons: string[] = [];
  if (policy.maxPerTransaction && tx.amount > policy.maxPerTransaction) {
    reasons.push(
      `Amount Rs.${tx.amount} exceeds per-transaction cap of Rs.${policy.maxPerTransaction}`
    );
  }

  const allowedDaySet = new Set(policy.allowedDays ?? []);
  const dow = dayjs(tx.dateTime).day();
  if (allowedDaySet.size > 0 && !allowedDaySet.has(dow)) {
    reasons.push("Transaction is not on an allowed weekday");
  }

  if (policy.maxPerMonth) {
    const projected = monthlyCategorySpend + tx.amount;
    if (projected > policy.maxPerMonth) {
      reasons.push(
        `Monthly ${normalizeCategory(policy.mccCategory) || "category"} spend would be Rs.${projected.toLocaleString("en-IN")}, over cap of Rs.${policy.maxPerMonth.toLocaleString("en-IN")}`
      );
    }
  }

  if (!reasons.length) return null;
  return { policyId: policy.id, policyName: policy.name, reasons };
}

export function evaluateTransactionAgainstPolicies(
  tx: PolicyTxContext,
  policies: ExpensePolicy[],
  monthlySpendByCategory: Map<string, number>
): PolicyViolation[] {
  const activePolicies = policies.filter((p) => isPolicyActive(p, dayjs(tx.dateTime)));
  const violations: PolicyViolation[] = [];

  for (const policy of activePolicies) {
    const monthlySpend = monthlySpendForPolicy(policy, tx, monthlySpendByCategory);
    const violation = evaluateTransactionAgainstPolicy(tx, policy, monthlySpend);
    if (violation) violations.push(violation);
  }
  return violations;
}

export function formatPolicyWarning(violations: PolicyViolation[]): string | null {
  if (!violations.length) return null;
  const lines = violations.flatMap((v) =>
    v.reasons.map((r) => `${v.policyName}: ${r}`)
  );
  return lines.join("\n");
}

export function buildMonthlySpendMap(
  transactions: Array<{
    id?: string;
    employeeId: string;
    category: string;
    amount: number;
    dateTime: string;
  }>,
  excludeTxId?: string
): Map<string, number> {
  const map = new Map<string, number>();
  const now = dayjs();
  for (const tx of transactions) {
    if (excludeTxId && tx.id === excludeTxId) continue;
    if (!dayjs(tx.dateTime).isSame(now, "month")) continue;
    const cat = normalizeCategory(tx.category);
    const empCatKey = `${tx.employeeId}|${cat}`;
    map.set(empCatKey, (map.get(empCatKey) ?? 0) + tx.amount);
    const empAllKey = `${tx.employeeId}|all`;
    map.set(empAllKey, (map.get(empAllKey) ?? 0) + tx.amount);
  }
  return map;
}

function monthlySpendForPolicy(
  policy: ExpensePolicy,
  tx: PolicyTxContext,
  monthlySpendByCategory: Map<string, number>
): number {
  const policyNorm = normalizeCategory(policy.mccCategory);
  const key =
    !policy.mccCategory || policyNorm === "all"
      ? `${tx.employeeId}|all`
      : `${tx.employeeId}|${policyNorm}`;
  return monthlySpendByCategory.get(key) ?? 0;
}
