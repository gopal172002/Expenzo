import dayjs from "dayjs";
import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/adminApi";
import { adminKeys } from "../query/adminKeys";
import type { AdminUser, AlertConfig, BillingPlan, CompanyInfo, Employee, ExpensePolicy, ExportAudit, Transaction, TransactionFilters } from "../types";

const FILTER_KEY = "admin-dashboard-filters";

const defaultFilters: TransactionFilters = {
  employeeId: "",
  department: "",
  category: "",
  mcc: "",
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
  upiApp: "",
  status: "",
  search: "",
};

function collectDepartments(
  employees: Employee[],
  transactions: Transaction[],
  extra: string[] = []
): string[] {
  const set = new Set<string>();
  for (const emp of employees) {
    const d = emp.department?.trim();
    if (d) set.add(d);
  }
  for (const tx of transactions) {
    const d = tx.department?.trim();
    if (d) set.add(d);
  }
  for (const d of extra) {
    const trimmed = d.trim();
    if (trimmed) set.add(trimmed);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

interface AdminDataContextShape {
  isBootstrapping: boolean;
  isSaving: boolean;
  errorMessage: string;
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  filters: TransactionFilters;
  employees: Employee[];
  departments: string[];
  policies: ExpensePolicy[];
  alertsConfig: AlertConfig;
  admins: AdminUser[];
  billing: BillingPlan;
  exportAudits: ExportAudit[];
  dashboardLoadMs: number;
  flaggedOnly: boolean;
  setFlaggedOnly: (value: boolean) => void;
  setFilters: (next: Partial<TransactionFilters>) => void;
  resetFilters: () => void;
  approveTransaction: (id: string, amount: number) => Promise<void>;
  rejectTransaction: (id: string, reason: string) => Promise<void>;
  bulkDecision: (ids: string[], decision: "approved" | "rejected", reason?: string) => Promise<void>;
  createPolicy: (policy: ExpensePolicy) => Promise<{ matchedCount: number }>;
  deletePolicy: (id: string) => Promise<void>;
  previewPolicy: (policy: ExpensePolicy) => Transaction[];
  addEmployeesFromCsv: (text: string) => Promise<number>;
  inviteEmployee: (
    email: string,
    department: string,
    name?: string,
    employeeId?: string
  ) => Promise<string | undefined>;
  assignEmployeeId: (
    email: string,
    employeeId?: string
  ) => Promise<{ employeeId: string; inviteCode?: string }>;
  generateEmployeeInviteCode: (email: string) => Promise<{ ok: boolean; inviteCode?: string; message: string }>;
  resetEmployeeLogin: (email: string, employeeId?: string) => Promise<{ ok: boolean; message: string }>;
  company: CompanyInfo | null;
  updateCompanyInvitePrefix: (invitePrefix: string) => Promise<{ ok: boolean; message: string }>;
  manageDepartment: (mode: "create" | "rename" | "delete", value: string, next?: string) => void;
  updateAlertConfig: (next: Partial<AlertConfig>) => Promise<void>;
  updateBillingPlan: (plan: BillingPlan["plan"]) => Promise<void>;
  upsertAdmin: (admin: AdminUser) => Promise<void>;
  toggleAdminActive: (id: string) => Promise<void>;
  recordExport: (format: "csv" | "pdf", dateRange: string, recordCount: number) => Promise<void>;
  uploadReceipt: (transactionId: string, file: File) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextShape | undefined>(undefined);

export const AdminDataProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const invalidateAdminQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.all });
  }, [queryClient]);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [extraDepartments, setExtraDepartments] = useState<string[]>([]);
  const [policies, setPolicies] = useState<ExpensePolicy[]>([]);
  const [alertsConfig, setAlertsConfig] = useState<AlertConfig>({ delivery: "both", threshold: "daily_digest", mutedPolicies: [], mutedEmployees: [] });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [billing, setBilling] = useState<BillingPlan>({ plan: "Basic", billingCycle: "monthly", nextRenewal: dayjs().add(1, "month").format("YYYY-MM-DD"), licenses: 0, headcount: 0 });
  const [exportAudits, setExportAudits] = useState<ExportAudit[]>([]);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [dashboardLoadMs] = useState(900);
  const [filters, setLocalFilters] = useState<TransactionFilters>(() => {
    const stored = localStorage.getItem(FILTER_KEY);
    if (!stored) return defaultFilters;
    try {
      return { ...defaultFilters, ...(JSON.parse(stored) as TransactionFilters) };
    } catch {
      return defaultFilters;
    }
  });

  const refreshTransactions = useCallback(async () => {
    const payload = await adminApi.bootstrap({ page: 1, limit: 500 });
    setTransactions(payload.transactions);
    invalidateAdminQueries();
  }, [invalidateAdminQueries]);

  useEffect(() => {
    adminApi
      .bootstrap({ page: 1, limit: 500 })
      .then((payload) => {
        setTransactions(payload.transactions);
        setEmployees(payload.employees);
        setPolicies(payload.policies);
        setAlertsConfig(payload.alertsConfig);
        setAdmins(payload.admins);
        setBilling(payload.billing);
        setCompany(payload.company ?? null);
        setIsBootstrapping(false);
      })
      .catch((error) => {
        setErrorMessage((error as Error).message);
        setIsBootstrapping(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
  }, [filters]);



  const departments = useMemo(
    () => collectDepartments(employees, transactions, extraDepartments),
    [employees, transactions, extraDepartments]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (flaggedOnly && tx.status !== "flagged") return false;
      if (filters.employeeId && tx.employeeId !== filters.employeeId) return false;
      if (filters.department && tx.department !== filters.department) return false;
      if (filters.category && tx.category !== filters.category) return false;
      if (filters.mcc && !tx.mcc.toLowerCase().includes(filters.mcc.toLowerCase())) return false;
      if (filters.upiApp && tx.upiApp !== filters.upiApp) return false;
      if (filters.status && tx.status !== filters.status) return false;
      if (filters.startDate && dayjs(tx.dateTime).isBefore(dayjs(filters.startDate), "day")) return false;
      if (filters.endDate && dayjs(tx.dateTime).isAfter(dayjs(filters.endDate).endOf("day"))) return false;
      if (filters.minAmount && tx.amount < Number(filters.minAmount)) return false;
      if (filters.maxAmount && tx.amount > Number(filters.maxAmount)) return false;

        if (filters.search) {
        const q = filters.search.toLowerCase();
        const combined = `${tx.employeeName} ${tx.merchantName} ${tx.upiRefId} ${tx.category} ${tx.mcc}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [filters, flaggedOnly, transactions]);

  const setFilters = (next: Partial<TransactionFilters>) => {
    setLocalFilters((prev) => ({ ...prev, ...next }));
  };

  const resetFilters = () => {
    setLocalFilters({ ...defaultFilters });
    setFlaggedOnly(false);
  };

  const withSaving = async (task: () => Promise<void>) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      await task();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const approveTransaction = async (id: string, amount: number) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      await adminApi.approveTransaction(id, amount);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              status: "approved",
              claimedAmount: amount,
              adminDecision: amount === tx.amount ? "Approved in full" : `Partial approval Rs.${amount}`,
              adminDecisionAt: dayjs().toISOString(),
              timeline: [
                ...tx.timeline,
                { id: `${id}-review`, actor: "Finance Admin", action: "Admin reviewed", timestamp: dayjs().toISOString() },
                { id: `${id}-approve`, actor: "Finance Admin", action: `Approved Rs.${amount}`, timestamp: dayjs().toISOString() },
              ],
            }
          : tx,
      ),
    );
    invalidateAdminQueries();
  };

  const rejectTransaction = async (id: string, reason: string) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      await adminApi.rejectTransaction(id, reason);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              status: "rejected",
              adminDecision: `Rejected - ${reason}`,
              adminDecisionAt: dayjs().toISOString(),
              timeline: [
                ...tx.timeline,
                { id: `${id}-review`, actor: "Finance Admin", action: "Admin reviewed", timestamp: dayjs().toISOString() },
                { id: `${id}-reject`, actor: "Finance Admin", action: `Rejected (${reason})`, timestamp: dayjs().toISOString() },
              ],
            }
          : tx,
      ),
    );
    invalidateAdminQueries();
  };

  const bulkDecision = async (ids: string[], decision: "approved" | "rejected", reason?: string) => {
    await withSaving(async () => {
      await adminApi.bulkDecision(ids, decision, reason);
    });
    setTransactions((prev) =>
      prev.map((tx) => {
        if (!ids.includes(tx.id)) return tx;
        if (decision === "approved") {
          return {
            ...tx,
            status: "approved",
            adminDecision: "Bulk approved",
            adminDecisionAt: dayjs().toISOString(),
            timeline: [
              ...tx.timeline,
              { id: `${tx.id}-bulk`, actor: "Finance Admin", action: "Bulk approved", timestamp: dayjs().toISOString() },
            ],
          };
        }
        return {
          ...tx,
          status: "rejected",
          adminDecision: `Bulk rejected - ${reason || "Policy violation"}`,
          adminDecisionAt: dayjs().toISOString(),
          timeline: [
            ...tx.timeline,
            { id: `${tx.id}-bulk`, actor: "Finance Admin", action: "Bulk rejected", timestamp: dayjs().toISOString() },
          ],
        };
      }),
    );
    invalidateAdminQueries();
  };

  const previewPolicy = (policy: ExpensePolicy) => {
    return transactions.filter((tx) => {
      const inScope =
        policy.scopeType === "all" ||
        (policy.scopeType === "department" && tx.department === policy.scopeValue) ||
        (policy.scopeType === "employee" && tx.employeeId === policy.scopeValue);
      if (!inScope) return false;
      if (policy.mccCategory && tx.category !== policy.mccCategory) return false;
      if (policy.maxPerTransaction && tx.amount > policy.maxPerTransaction) return true;
      const day = dayjs(tx.dateTime).day();
      if (policy.allowedDays.length && !policy.allowedDays.includes(day)) return true;
      return false;
    });
  };

  const createPolicy = async (policy: ExpensePolicy) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const result = await adminApi.createPolicy(policy);
      setPolicies((prev) => [result.policy, ...prev.filter((p) => p.id !== result.policy.id)]);
      return { matchedCount: 0 };
    } catch (error) {
      setErrorMessage((error as Error).message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deletePolicy = async (id: string) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      await adminApi.deletePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      setErrorMessage((error as Error).message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const addEmployeesFromCsv = async (text: string) => {
    let n = 0;
    await withSaving(async () => {
      const result = await adminApi.importEmployees(text);
      n = result.createdCount;
      const added = (result.created as Employee[]).map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        department: e.department,
        role: (e.role === "manager" ? "manager" : "employee") as "employee" | "manager",
        active: e.active !== false,
        onboarded: e.onboarded ?? false,
        travelApproved: e.travelApproved ?? false,
        idAssigned: e.idAssigned ?? true,
      }));
      if (added.length) {
        setEmployees((prev) => [...added, ...prev]);
        setBilling((prev) => ({ ...prev, headcount: prev.headcount + added.length }));
      }
    });
    invalidateAdminQueries();
    return n;
  };

  const inviteEmployee = async (
    email: string,
    department: string,
    name?: string,
    employeeId?: string
  ) => {
    let inviteCode: string | undefined;
    await withSaving(async () => {
      const result = await adminApi.inviteEmployee(email, department, name, employeeId);
      inviteCode = result.inviteCode || undefined;
      setEmployees((prev) => [
        { ...result.employee, inviteCode: result.inviteCode || undefined },
        ...prev,
      ]);
      setBilling((prev) => ({ ...prev, headcount: prev.headcount + 1 }));
    });
    invalidateAdminQueries();
    return inviteCode;
  };

  const assignEmployeeId = async (email: string, employeeId?: string) => {
    let assignedId = "";
    let inviteCode: string | undefined;
    await withSaving(async () => {
      const result = await adminApi.assignEmployeeId(email, employeeId);
      assignedId = result.employeeId;
      inviteCode = result.inviteCode;
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.email === email
            ? {
                ...emp,
                id: result.employeeId,
                idAssigned: true,
                onboarded: true,
                inviteCode: result.inviteCode,
              }
            : emp
        )
      );
    });
    invalidateAdminQueries();
    return { employeeId: assignedId, inviteCode };
  };

  const updateCompanyInvitePrefix = async (invitePrefix: string) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const result = await adminApi.updateCompany({ invitePrefix });
      setCompany(result.company);
      // Prefix change regenerates employee invite codes on the server.
      const payload = await adminApi.bootstrap({ page: 1, limit: 500 });
      setEmployees(payload.employees);
      setCompany(payload.company ?? result.company);
      return { ok: true, message: result.message || "Invite prefix updated." };
    } catch (error) {
      const message = (error as Error).message;
      setErrorMessage(message);
      return { ok: false, message };
    } finally {
      setIsSaving(false);
    }
  };

  const generateEmployeeInviteCode = async (email: string) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const result = await adminApi.generateEmployeeInviteCode(email);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.email === email ? { ...emp, inviteCode: result.inviteCode } : emp
        )
      );
      return { ok: true, inviteCode: result.inviteCode, message: result.message };
    } catch (error) {
      const message = (error as Error).message;
      setErrorMessage(message);
      return { ok: false, message };
    } finally {
      setIsSaving(false);
    }
  };

  const resetEmployeeLogin = async (email: string, employeeId?: string) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const result = await adminApi.resetEmployeeLogin(email, employeeId);
      return { ok: true, message: result.message };
    } catch (error) {
      const message = (error as Error).message;
      setErrorMessage(message);
      return { ok: false, message };
    } finally {
      setIsSaving(false);
    }
  };

  const manageDepartment = (mode: "create" | "rename" | "delete", value: string, next?: string) => {
    const trimmed = value.trim();
    if (mode === "create" && trimmed) {
      setExtraDepartments((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      return;
    }
    if (mode === "rename" && next) {
      const renamed = next.trim();
      setExtraDepartments((prev) => prev.map((d) => (d === value ? renamed : d)));
      setEmployees((prev) => prev.map((emp) => (emp.department === value ? { ...emp, department: renamed } : emp)));
      return;
    }
    if (mode === "delete" && trimmed) {
      setExtraDepartments((prev) => prev.filter((d) => d !== trimmed));
      setEmployees((prev) => prev.map((emp) => (emp.department === trimmed ? { ...emp, department: "Unassigned" } : emp)));
    }
  };

  const updateAlertConfig = async (next: Partial<AlertConfig>) => {
    await withSaving(async () => {
      await adminApi.updateAlerts(next);
    });
    setAlertsConfig((prev) => ({ ...prev, ...next }));
  };

  const updateBillingPlan = async (plan: BillingPlan["plan"]) => {
    await withSaving(async () => {
      await adminApi.updateBillingPlan(plan);
    });
    setBilling((prev) => ({ ...prev, plan }));
  };

  const upsertAdmin = async (admin: AdminUser) => {
    await withSaving(async () => {
      await adminApi.upsertAdmin(admin);
    });
    setAdmins((prev) => {
      const exists = prev.some((item) => item.id === admin.id);
      if (exists) return prev.map((item) => (item.id === admin.id ? admin : item));
      return [admin, ...prev];
    });
  };

  const toggleAdminActive = async (id: string) => {
    await withSaving(async () => {
      await adminApi.toggleAdmin(id);
    });
    setAdmins((prev) => prev.map((admin) => (admin.id === id ? { ...admin, active: !admin.active } : admin)));
  };

  const recordExport = async (format: "csv" | "pdf", dateRange: string, recordCount: number) => {
    await withSaving(async () => {
      await adminApi.recordExport({ format, dateRange, recordCount });
    });
    setExportAudits((prev) => [
      {
        id: `EXP-${Date.now()}`,
        actor: "Finance Admin",
        format,
        dateRange,
        exportedAt: dayjs().toISOString(),
        recordCount,
      },
      ...prev,
    ]);
  };

  const uploadReceipt = async (transactionId: string, file: File) => {
    await withSaving(async () => {
      const result = await adminApi.uploadReceipt(transactionId, file);
      const patch = result.transaction ?? {
        receiptUrl: result.receiptUrl,
        receiptFraudScore: result.receiptFraudScore,
        receiptFraudTier: result.receiptFraudTier,
      };
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, ...patch } : tx))
      );
    });
  };

  const value: AdminDataContextShape = {
    isBootstrapping,
    isSaving,
    errorMessage,
    transactions,
    filteredTransactions,
    filters,
    employees,
    departments,
    policies,
    alertsConfig,
    admins,
    billing,
    exportAudits,
    company,
    dashboardLoadMs,
    flaggedOnly,
    setFlaggedOnly,
    setFilters,
    resetFilters,
    approveTransaction,
    rejectTransaction,
    bulkDecision,
    createPolicy,
    deletePolicy,
    previewPolicy,
    addEmployeesFromCsv,
    inviteEmployee,
    assignEmployeeId,
    generateEmployeeInviteCode,
    resetEmployeeLogin,
    updateCompanyInvitePrefix,
    manageDepartment,
    updateAlertConfig,
    updateBillingPlan,
    upsertAdmin,
    toggleAdminActive,
    recordExport,
    uploadReceipt,
    refreshTransactions,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminData = () => {
  const context = use(AdminDataContext);
  if (!context) throw new Error("useAdminData must be used within AdminDataProvider");
  return context;
};
