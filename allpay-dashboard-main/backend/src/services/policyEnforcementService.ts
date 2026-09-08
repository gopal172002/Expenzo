import dayjs from "dayjs";
import { ExpensePolicy, Transaction } from "../models";
import type { ExpensePolicy as ExpensePolicyType } from "./analyticsTypes";
import {
  buildMonthlySpendMap,
  evaluateTransactionAgainstPolicies,
  formatPolicyWarning,
  type PolicyTxContext,
  type PolicyViolation,
} from "./policyEvaluationService";

export async function loadActivePolicies(companyId?: string): Promise<ExpensePolicyType[]> {
  if (!companyId) {
    // Never load every tenant's policies — that breaks multi-company isolation.
    return [];
  }
  const docs = await ExpensePolicy.find({ companyId, active: { $ne: false } }).lean().exec();
  return docs as ExpensePolicyType[];
}

export async function evaluateLiveTransaction(
  tx: PolicyTxContext & { id?: string; companyId?: string },
  policies?: ExpensePolicyType[]
): Promise<{ policyWarning: string | null; violations: PolicyViolation[] }> {
  const companyId = String(tx.companyId || "").trim();
  if (!companyId) {
    return {
      policyWarning: "Missing company context for policy evaluation",
      violations: [],
    };
  }

  const activePolicies = policies ?? (await loadActivePolicies(companyId));
  const startOfMonth = dayjs().startOf("month").toISOString();

  const priorFilter: Record<string, unknown> = {
    companyId,
    employeeId: tx.employeeId,
    dateTime: { $gte: startOfMonth },
    ...(tx.id ? { id: { $ne: tx.id } } : {}),
  };

  const priorTxs = await Transaction.find(priorFilter)
    .select({ id: 1, employeeId: 1, category: 1, amount: 1, dateTime: 1 })
    .lean()
    .exec();

  const monthlyMap = buildMonthlySpendMap(
    priorTxs.map((row) => ({
      id: String(row.id),
      employeeId: String(row.employeeId),
      category: String(row.category ?? ""),
      amount: Number(row.amount ?? 0),
      dateTime: String(row.dateTime ?? ""),
    })),
    tx.id
  );

  const violations = evaluateTransactionAgainstPolicies(tx, activePolicies, monthlyMap);
  return {
    policyWarning: formatPolicyWarning(violations),
    violations,
  };
}

export async function nextPolicyIdFromDb(companyId?: string): Promise<string> {
  const query = companyId ? { companyId } : {};
  const docs = await ExpensePolicy.find(query, { id: 1 }).lean().exec();
  let max = 0;
  for (const row of docs) {
    const match = /^POL-(\d+)$/i.exec(String(row.id));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `POL-${max + 1}`;
}
