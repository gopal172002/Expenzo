/** Stable React Query keys for admin list / analytics endpoints. */
export const adminKeys = {
  all: ["admin"] as const,
  transactions: (params: Record<string, string | number | boolean | undefined>) =>
    [...adminKeys.all, "transactions", params] as const,
  verificationQueue: (limit: number) => [...adminKeys.all, "verification-queue", limit] as const,
  employees: (params: {
    page: number;
    limit: number;
    search: string;
    department: string;
    status: string;
  }) => [...adminKeys.all, "employees", params] as const,
  analytics: (rangeDays: string) => [...adminKeys.all, "analytics", rangeDays] as const,
};

export function invalidateAdminDataQueries() {
  // Lazy import avoided — callers pass queryClient.invalidateQueries themselves.
  return { queryKey: adminKeys.all } as const;
}
