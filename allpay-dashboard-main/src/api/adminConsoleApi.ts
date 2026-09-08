import { API_BASE } from "./config";
import { getAuthToken } from "./authToken";
import { readJsonResponse } from "./parseResponse";
import type { AdminRole, AdminUser } from "../types";

export interface PlatformConfig {
  id: string;
  receiptStorage: "mongo" | "s3" | "gcs";
  storageBucket?: string;
  storageRegion?: string;
  storagePublicBase?: string;
  ingestionMode: "realtime" | "scheduled";
  ingestionCron?: string;
  retentionDays: number;
  updatedAt: string;
  updatedBy?: string;
}

export type ConnectionCategory = "data_warehouse" | "cloud_storage" | "relational_database";

export interface PlatformConnection {
  id: string;
  name: string;
  connector: string;
  category: ConnectionCategory;
  description?: string;
  status: "connected" | "error" | "not_tested";
  config: Record<string, string>;
  createdAt: string;
  lastTestedAt?: string;
}

export type ScheduledJobType =
  | "receipt_ingestion"
  | "quality_checks"
  | "warehouse_sync"
  | "fraud_rescan";

export interface ScheduledJob {
  id: string;
  name: string;
  jobType: ScheduledJobType;
  cron: string;
  enabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunRows?: number;
  lastRunMessage?: string;
  createdAt: string;
}

export interface AdminConsoleUsersResponse {
  ok: boolean;
  users: AdminUser[];
  activeSuperAdmins: number;
  roleLabels: Record<AdminRole, string>;
}

export interface AdminConsolePlatformResponse {
  ok: boolean;
  config: PlatformConfig;
  connections: PlatformConnection[];
  jobs: ScheduledJob[];
  options: {
    receiptStorage: PlatformConfig["receiptStorage"][];
    ingestionModes: PlatformConfig["ingestionMode"][];
    connectorCategories: ConnectionCategory[];
    jobTypes: ScheduledJobType[];
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (!(init?.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = (await readJsonResponse(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data["error"] || data["message"] || "Request failed"));
  }
  return data as T;
}

export const adminConsoleApi = {
  getUsers: () => request<AdminConsoleUsersResponse>("/admin/console/users"),

  saveUser: (user: Partial<AdminUser>) =>
    request<{ ok: boolean; user: AdminUser }>("/admin/console/users", {
      method: "PUT",
      body: JSON.stringify(user),
    }),

  toggleUser: (id: string) =>
    request<{ ok: boolean; user: AdminUser }>(`/admin/console/users/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
    }),

  setPermissions: (id: string, permissions: { canRead?: boolean; canWrite?: boolean }) =>
    request<{ ok: boolean; user: AdminUser; locked: boolean }>(
      `/admin/console/users/${encodeURIComponent(id)}/permissions`,
      { method: "PATCH", body: JSON.stringify(permissions) }
    ),

  deleteUser: (id: string) =>
    request<{ ok: boolean; id: string }>(`/admin/console/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  getPlatform: () => request<AdminConsolePlatformResponse>("/admin/console/platform"),

  savePlatform: (config: Partial<PlatformConfig>) =>
    request<{ ok: boolean; config: PlatformConfig }>("/admin/console/platform", {
      method: "PATCH",
      body: JSON.stringify(config),
    }),

  saveConnection: (connection: Partial<PlatformConnection>) =>
    request<{ ok: boolean; connection: PlatformConnection }>("/admin/console/connections", {
      method: "PUT",
      body: JSON.stringify(connection),
    }),

  testConnection: (id: string) =>
    request<{ ok: boolean; connection: PlatformConnection; message: string }>(
      `/admin/console/connections/${encodeURIComponent(id)}/test`,
      { method: "POST" }
    ),

  deleteConnection: (id: string) =>
    request<{ ok: boolean; id: string }>(`/admin/console/connections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  saveJob: (job: Partial<ScheduledJob>) =>
    request<{ ok: boolean; job: ScheduledJob }>("/admin/console/jobs", {
      method: "PUT",
      body: JSON.stringify(job),
    }),

  toggleJob: (id: string) =>
    request<{ ok: boolean; job: ScheduledJob }>(`/admin/console/jobs/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
    }),

  runJob: (id: string) =>
    request<{ ok: boolean; job: ScheduledJob; message: string }>(
      `/admin/console/jobs/${encodeURIComponent(id)}/run`,
      { method: "POST" }
    ),

  deleteJob: (id: string) =>
    request<{ ok: boolean; id: string }>(`/admin/console/jobs/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
