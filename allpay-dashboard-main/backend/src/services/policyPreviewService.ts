import dayjs from "dayjs";
import type { ITransaction } from "../models";
import type { ExpensePolicy } from "./analyticsTypes";
import {
  buildMonthlySpendMap,
  categoriesMatch,
  evaluateTransactionAgainstPolicies,
  inPolicyScope,
  isPolicyActive,
  withinPolicyDateRange,
  type PolicyTxContext,
} from "./policyEvaluationService";

export type PolicyPreviewMatch = {
  transactionId: string;
  reasons: string[];
  amount: number;
  employeeId: string;
  employeeName: string;
  category: string;
};

type LeanTx = PolicyTxContext & {
  id: string;
  employeeName: string;
};

export function runPolicyPreview(
  transactions: ITransaction[] | Record<string, unknown>[],
  policy: ExpensePolicy
) {
  if (!isPolicyActive(policy)) {
    return {
      wouldFlagCount: 0,
      affectedEmployeeCount: 0,
      affectedEmployeeIds: [] as string[],
      estimatedSavingsIfRejected: 0,
      matches: [] as PolicyPreviewMatch[],
      hasMore: false,
    };
  }

  const lean: LeanTx[] = transactions.map((t) => {
    const o = t as Record<string, unknown>;
    return {
      id: String(o["id"] ?? ""),
      amount: Number(o["amount"] ?? 0),
      dateTime: String(o["dateTime"] ?? ""),
      category: String(o["category"] ?? ""),
      employeeId: String(o["employeeId"] ?? ""),
      employeeName: String(o["employeeName"] ?? ""),
      department: String(o["department"] ?? ""),
    };
  });

  const dateFiltered = lean.filter((tx) => withinPolicyDateRange(tx, policy));
  const inPolicyScopeTxs = dateFiltered.filter((tx) => inPolicyScope(tx, policy));
  const inCategory = inPolicyScopeTxs.filter((tx) =>
    categoriesMatch(policy.mccCategory, tx.category)
  );

  const monthlyMap = buildMonthlySpendMap(inCategory);
  const matches: PolicyPreviewMatch[] = [];

  for (const tx of inCategory) {
    const violations = evaluateTransactionAgainstPolicies(tx, [policy], monthlyMap);
    if (violations.length) {
      matches.push({
        transactionId: tx.id,
        reasons: violations.flatMap((v) => v.reasons),
        amount: tx.amount,
        employeeId: tx.employeeId,
        employeeName: tx.employeeName,
        category: tx.category,
      });
    }
  }

  const employeeIds = new Set(matches.map((m) => m.employeeId));
  const amountSum = matches.reduce((s, m) => s + m.amount, 0);
  const estimatedSavingsIfRejected = Math.round(amountSum * 100) / 100;

  return {
    wouldFlagCount: matches.length,
    affectedEmployeeCount: employeeIds.size,
    affectedEmployeeIds: [...employeeIds],
    estimatedSavingsIfRejected,
    matches: matches.slice(0, 200),
    hasMore: matches.length > 200,
  };
}
