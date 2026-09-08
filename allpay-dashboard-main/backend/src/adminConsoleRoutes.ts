import type { RequestHandler, Router } from "express";
import dayjs from "dayjs";
import {
  AdminUser,
  PlatformConfig,
  PlatformConnection,
  ScheduledJob,
} from "./models";
import {
  ADMIN_ROLE_LABELS,
  assertNotLastSuperAdmin,
  countActiveSuperAdmins,
  isAdminRole,
  resolvePermissions,
} from "./services/adminAccessService";
import { runScheduledJob, testConnectionConfig } from "./services/jobRunner";

const RECEIPT_STORAGE_MODES = ["mongo", "s3", "gcs"] as const;
const INGESTION_MODES = ["realtime", "scheduled"] as const;
const CONNECTOR_CATEGORIES = ["data_warehouse", "cloud_storage", "relational_database"] as const;
const JOB_TYPES = ["receipt_ingestion", "quality_checks", "warehouse_sync", "fraud_rescan"] as const;

function clean(doc: unknown) {
  const copy = { ...(doc as Record<string, unknown>) };
  delete copy["_id"];
  delete copy["__v"];
  return copy;
}

function pathParam(req: { params: Record<string, unknown> }, key: string): string | undefined {
  const raw = req.params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? String(value) : undefined;
}

/** An admin must not be able to remove or disable the account they are using. */
function isSelf(actorEmail: string | undefined, targetEmail: string): boolean {
  if (!actorEmail) return false;
  return actorEmail.trim().toLowerCase() === targetEmail.trim().toLowerCase();
}

async function loadPlatformConfig() {
  const existing = await PlatformConfig.findOne({ id: "platform" }).lean();
  if (existing) return clean(existing);
  const created = await PlatformConfig.create({
    id: "platform",
    receiptStorage: process.env.RECEIPT_STORAGE || "mongo",
    storageRegion: process.env.AWS_REGION || "us-east-1",
    storagePublicBase: process.env.S3_PUBLIC_BASE || "",
    ingestionMode: "realtime",
    ingestionCron: "0 */2 * * *",
    retentionDays: 2555,
    updatedAt: dayjs().toISOString(),
  });
  return clean(created.toObject());
}

/**
 * Admin Console: workspace users and their access, storage/warehouse settings,
 * external connections, and the ingestion schedule.
 */
export function registerAdminConsoleRoutes(router: Router, requireSuperAdmin: RequestHandler) {
  router.get("/admin/console/users", requireSuperAdmin, async (req, res) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const [admins, activeSuperAdmins] = await Promise.all([
        AdminUser.find({ companyId }).sort({ name: 1 }).lean(),
        countActiveSuperAdmins(companyId),
      ]);
      res.json({
        ok: true,
        users: admins.map((doc) => clean(doc)),
        activeSuperAdmins,
        roleLabels: ADMIN_ROLE_LABELS,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.put("/admin/console/users", requireSuperAdmin, async (req, res) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const body = req.body as {
        id?: string;
        name?: string;
        email?: string;
        role?: string;
        active?: boolean;
        twoFactor?: boolean;
        canRead?: boolean;
        canWrite?: boolean;
      };
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      if (!name) return res.status(400).json({ error: "Display name is required" });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: "A valid email address is required" });
      }
      if (!isAdminRole(body.role)) {
        return res.status(400).json({ error: "Unknown role", allowed: Object.keys(ADMIN_ROLE_LABELS) });
      }

      const duplicate = await AdminUser.findOne({
        companyId,
        email,
        id: { $ne: body.id || "" },
      }).lean();
      if (duplicate) {
        return res.status(409).json({ error: `${email} is already an admin user` });
      }

      const id = String(body.id || "").trim() || `ADM-${Date.now().toString(36).toUpperCase()}`;
      const existing = await AdminUser.findOne({ id, companyId }).lean();
      const active = body.active ?? true;

      if (existing && isSelf(req.adminUser?.email, existing.email) && !active) {
        return res.status(409).json({
          error: "You cannot deactivate the account you are signed in with.",
          code: "SELF_DEACTIVATION",
        });
      }

      if (existing && existing.role === "super_admin" && (body.role !== "super_admin" || !active)) {
        const blocked = await assertNotLastSuperAdmin(id, companyId);
        if (blocked) return res.status(409).json({ error: blocked, code: "LAST_SUPER_ADMIN" });
      }

      const permissions = resolvePermissions(body.role, body);
      const saved = await AdminUser.findOneAndUpdate(
        { id, companyId },
        {
          $set: {
            id,
            name,
            email,
            role: body.role,
            active,
            twoFactor: body.twoFactor ?? true,
            companyId,
            ...permissions,
          },
        },
        { upsert: true, new: true }
      );
      res.json({ ok: true, user: clean(saved!.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/admin/console/users/:id/toggle", requireSuperAdmin, async (req, res) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing user id" });
      const admin = await AdminUser.findOne({ id, companyId });
      if (!admin) return res.status(404).json({ error: "Admin user not found" });

      if (admin.active) {
        if (isSelf(req.adminUser?.email, admin.email)) {
          return res.status(409).json({
            error: "You cannot deactivate the account you are signed in with. Ask another Super Admin to do it.",
            code: "SELF_DEACTIVATION",
          });
        }
        const blocked = await assertNotLastSuperAdmin(id, companyId);
        if (blocked) return res.status(409).json({ error: blocked, code: "LAST_SUPER_ADMIN" });
      }
      admin.active = !admin.active;
      await admin.save();
      res.json({ ok: true, user: clean(admin.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.patch("/admin/console/users/:id/permissions", requireSuperAdmin, async (req, res) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing user id" });
      const admin = await AdminUser.findOne({ id, companyId });
      if (!admin) return res.status(404).json({ error: "Admin user not found" });

      const role = isAdminRole(admin.role) ? admin.role : "finance_manager";
      const body = req.body as { canRead?: boolean; canWrite?: boolean };
      const permissions = resolvePermissions(role, {
        canRead: body.canRead ?? admin.canRead,
        canWrite: body.canWrite ?? admin.canWrite,
      });
      admin.canRead = permissions.canRead;
      admin.canWrite = permissions.canWrite;
      await admin.save();
      res.json({ ok: true, user: clean(admin.toObject()), locked: role === "super_admin" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.delete("/admin/console/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing user id" });
      const target = await AdminUser.findOne({ id, companyId }).lean();
      if (!target) return res.status(404).json({ error: "Admin user not found" });
      if (isSelf(req.adminUser?.email, target.email)) {
        return res.status(409).json({
          error: "You cannot remove the account you are signed in with.",
          code: "SELF_DELETION",
        });
      }
      const blocked = await assertNotLastSuperAdmin(id, companyId);
      if (blocked) return res.status(409).json({ error: blocked, code: "LAST_SUPER_ADMIN" });
      const result = await AdminUser.deleteOne({ id, companyId });
      if (!result.deletedCount) return res.status(404).json({ error: "Admin user not found" });
      res.json({ ok: true, id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get("/admin/console/platform", requireSuperAdmin, async (_req, res) => {
    try {
      const [config, connections, jobs] = await Promise.all([
        loadPlatformConfig(),
        PlatformConnection.find().sort({ createdAt: -1 }).lean(),
        ScheduledJob.find().sort({ createdAt: 1 }).lean(),
      ]);
      res.json({
        ok: true,
        config,
        connections: connections.map((doc) => clean(doc)),
        jobs: jobs.map((doc) => clean(doc)),
        options: {
          receiptStorage: RECEIPT_STORAGE_MODES,
          ingestionModes: INGESTION_MODES,
          connectorCategories: CONNECTOR_CATEGORIES,
          jobTypes: JOB_TYPES,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.patch("/admin/console/platform", requireSuperAdmin, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const update: Record<string, unknown> = { updatedAt: dayjs().toISOString() };
      if (req.adminUser?.name) update["updatedBy"] = req.adminUser.name;

      if (body["receiptStorage"] != null) {
        const mode = String(body["receiptStorage"]);
        if (!(RECEIPT_STORAGE_MODES as readonly string[]).includes(mode)) {
          return res.status(400).json({ error: "Unsupported receipt storage mode" });
        }
        update["receiptStorage"] = mode;
      }
      if (body["ingestionMode"] != null) {
        const mode = String(body["ingestionMode"]);
        if (!(INGESTION_MODES as readonly string[]).includes(mode)) {
          return res.status(400).json({ error: "Ingestion mode must be realtime or scheduled" });
        }
        update["ingestionMode"] = mode;
      }
      for (const key of ["storageBucket", "storageRegion", "storagePublicBase"]) {
        if (body[key] != null) update[key] = String(body[key]).trim();
      }
      if (body["ingestionCron"] != null) {
        const cron = String(body["ingestionCron"]).trim();
        if (cron.split(/\s+/).length !== 5) {
          return res.status(400).json({ error: "Cron must have 5 fields, for example 0 */2 * * *" });
        }
        update["ingestionCron"] = cron;
      }
      if (body["retentionDays"] != null) {
        const days = Number(body["retentionDays"]);
        if (!Number.isFinite(days) || days < 1) {
          return res.status(400).json({ error: "Retention must be at least 1 day" });
        }
        update["retentionDays"] = Math.round(days);
      }

      await loadPlatformConfig();
      const saved = await PlatformConfig.findOneAndUpdate(
        { id: "platform" },
        { $set: update },
        { new: true }
      );
      res.json({ ok: true, config: clean(saved!.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.put("/admin/console/connections", requireSuperAdmin, async (req, res) => {
    try {
      const body = req.body as {
        id?: string;
        name?: string;
        connector?: string;
        category?: string;
        description?: string;
        config?: Record<string, unknown>;
      };
      const name = String(body.name || "").trim();
      const connector = String(body.connector || "").trim();
      const category = String(body.category || "").trim();
      if (!name) return res.status(400).json({ error: "Connection name is required" });
      if (!connector) return res.status(400).json({ error: "Connector is required" });
      if (!(CONNECTOR_CATEGORIES as readonly string[]).includes(category)) {
        return res.status(400).json({ error: "Unknown connection category" });
      }
      const id = String(body.id || "").trim() || `CON-${Date.now().toString(36).toUpperCase()}`;
      const saved = await PlatformConnection.findOneAndUpdate(
        { id },
        {
          $set: {
            id,
            name,
            connector,
            category,
            description: String(body.description || "").trim(),
            config: body.config ?? {},
          },
          $setOnInsert: { createdAt: dayjs().toISOString(), status: "not_tested" },
        },
        { upsert: true, new: true }
      );
      res.json({ ok: true, connection: clean(saved!.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/admin/console/connections/:id/test", requireSuperAdmin, async (req, res) => {
    try {
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing connection id" });
      const connection = await PlatformConnection.findOne({ id });
      if (!connection) return res.status(404).json({ error: "Connection not found" });

      const result = await testConnectionConfig({
        connector: connection.connector,
        category: connection.category,
        config: (connection.config ?? {}) as Record<string, unknown>,
      });
      connection.status = result.ok ? "connected" : "error";
      connection.lastTestedAt = dayjs().toISOString();
      await connection.save();
      res.json({
        ok: result.ok,
        connection: clean(connection.toObject()),
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.delete("/admin/console/connections/:id", requireSuperAdmin, async (req, res) => {
    try {
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing connection id" });
      const result = await PlatformConnection.deleteOne({ id });
      if (!result.deletedCount) return res.status(404).json({ error: "Connection not found" });
      res.json({ ok: true, id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.put("/admin/console/jobs", requireSuperAdmin, async (req, res) => {
    try {
      const body = req.body as {
        id?: string;
        name?: string;
        jobType?: string;
        cron?: string;
        enabled?: boolean;
      };
      const name = String(body.name || "").trim();
      const jobType = String(body.jobType || "").trim();
      const cron = String(body.cron || "").trim();
      if (!name) return res.status(400).json({ error: "Job name is required" });
      if (!(JOB_TYPES as readonly string[]).includes(jobType)) {
        return res.status(400).json({ error: "Unknown job type" });
      }
      if (cron.split(/\s+/).length !== 5) {
        return res.status(400).json({ error: "Cron must have 5 fields, for example 0 */2 * * *" });
      }
      const id = String(body.id || "").trim() || `JOB-${Date.now().toString(36).toUpperCase()}`;
      const saved = await ScheduledJob.findOneAndUpdate(
        { id },
        {
          $set: { id, name, jobType, cron, enabled: body.enabled ?? true },
          $setOnInsert: { createdAt: dayjs().toISOString() },
        },
        { upsert: true, new: true }
      );
      res.json({ ok: true, job: clean(saved!.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/admin/console/jobs/:id/run", requireSuperAdmin, async (req, res) => {
    try {
      const id = pathParam(req, "id");
      if (!id) return res.status(400).json({ error: "Missing job id" });
      const result = await runScheduledJob(id);
      const job = await ScheduledJob.findOne({ id }).lean();
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.status(result.status === "ok" ? 200 : 500).json({
        ok: result.status === "ok",
        job: clean(job),
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/admin/console/jobs/:id/toggle", requireSuperAdmin, async (req, res) => {
    try {
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing job id" });
      const job = await ScheduledJob.findOne({ id });
      if (!job) return res.status(404).json({ error: "Job not found" });
      job.enabled = !job.enabled;
      await job.save();
      res.json({ ok: true, job: clean(job.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.delete("/admin/console/jobs/:id", requireSuperAdmin, async (req, res) => {
    try {
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: "Missing job id" });
      const result = await ScheduledJob.deleteOne({ id });
      if (!result.deletedCount) return res.status(404).json({ error: "Job not found" });
      res.json({ ok: true, id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
}
