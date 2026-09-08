/**
 * Admin Console: workspace users, access flags, storage/ingestion settings,
 * connections, and scheduled jobs.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../server";
import { seedDatabase } from "../seed";
import { AdminUser } from "../models";

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Admin Console", () => {
  let token: string;
  let auditorToken: string;
  let memoryMongo: MongoMemoryServer | null = null;

  beforeAll(async () => {
    if (process.env.USE_LIVE_MONGO) {
      await mongoose.connect(process.env.MONGO_URI!);
    } else {
      memoryMongo = await MongoMemoryServer.create();
      await mongoose.connect(memoryMongo.getUri());
    }
    await mongoose.connection.db?.dropDatabase();
    await seedDatabase();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    token = login.body.token as string;

    const auditorLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "auditor@example.com", password: "password123" });
    auditorToken = auditorLogin.body.token as string;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (memoryMongo) await memoryMongo.stop();
  });

  describe("access control", () => {
    it("rejects unauthenticated console access", async () => {
      const res = await request(app).get("/api/admin/console/users");
      expect(res.status).toBe(401);
    });

    it("rejects non-super-admin roles", async () => {
      const res = await request(app).get("/api/admin/console/users").set(authHeader(auditorToken));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("RBAC_FORBIDDEN");
    });

    it("allows super admin and reports active super admin count", async () => {
      const res = await request(app).get("/api/admin/console/users").set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.activeSuperAdmins).toBeGreaterThanOrEqual(1);
    });
  });

  describe("user management", () => {
    it("creates a user with role-appropriate access flags", async () => {
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Console Finance", email: "console.finance@allpay.in", role: "finance_manager" });
      expect(res.status).toBe(200);
      expect(res.body.user.canRead).toBe(true);
      expect(res.body.user.canWrite).toBe(true);
      expect(res.body.user.id).toBeTruthy();
    });

    it("forces read and write on for super admin", async () => {
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({
          name: "Console Super",
          email: "console.super@allpay.in",
          role: "super_admin",
          canRead: false,
          canWrite: false,
        });
      expect(res.status).toBe(200);
      expect(res.body.user.canRead).toBe(true);
      expect(res.body.user.canWrite).toBe(true);
    });

    it("keeps auditors read-only even when write is requested", async () => {
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Console Auditor", email: "console.auditor@allpay.in", role: "auditor", canWrite: true });
      expect(res.status).toBe(200);
      expect(res.body.user.canWrite).toBe(false);
      expect(res.body.user.canRead).toBe(true);
    });

    it("rejects an invalid email", async () => {
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Bad Email", email: "nope", role: "finance_manager" });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown role", async () => {
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Bad Role", email: "bad.role@allpay.in", role: "wizard" });
      expect(res.status).toBe(400);
    });

    it("rejects a duplicate email", async () => {
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Duplicate", email: "console.finance@allpay.in", role: "hr_manager" });
      expect(res.status).toBe(409);
    });

    it("updates permissions for a non-super-admin", async () => {
      const created = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Perm Target", email: "perm.target@allpay.in", role: "hr_manager" });
      const id = created.body.user.id as string;

      const res = await request(app)
        .patch(`/api/admin/console/users/${id}/permissions`)
        .set(authHeader(token))
        .send({ canWrite: false });
      expect(res.status).toBe(200);
      expect(res.body.user.canWrite).toBe(false);
      expect(res.body.user.canRead).toBe(true);
    });

    it("toggles active state", async () => {
      const created = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Toggle Target", email: "toggle.target@allpay.in", role: "finance_manager" });
      const id = created.body.user.id as string;

      const off = await request(app)
        .post(`/api/admin/console/users/${id}/toggle`)
        .set(authHeader(token));
      expect(off.body.user.active).toBe(false);

      const on = await request(app).post(`/api/admin/console/users/${id}/toggle`).set(authHeader(token));
      expect(on.body.user.active).toBe(true);
    });
  });

  describe("lockout protection", () => {
    const actingEmail = "test@example.com";
    let restoreIds: string[] = [];

    beforeEach(async () => {
      // Leave the signed-in super admin as the only active one.
      const others = await AdminUser.find({
        role: "super_admin",
        active: true,
        email: { $ne: actingEmail },
      }).lean();
      restoreIds = others.map((doc) => doc.id);
      for (const id of restoreIds) {
        await AdminUser.updateOne({ id }, { $set: { active: false } });
      }
    });

    afterEach(async () => {
      for (const id of restoreIds) {
        await AdminUser.updateOne({ id }, { $set: { active: true } });
      }
    });

    async function lastSuperAdmin() {
      const doc = await AdminUser.findOne({ role: "super_admin", active: true }).lean();
      expect(doc?.email).toBe(actingEmail);
      return doc!;
    }

    it("refuses to downgrade the final active super admin", async () => {
      const last = await lastSuperAdmin();
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ id: last.id, name: last.name, email: last.email, role: "auditor", active: true });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("LAST_SUPER_ADMIN");

      const unchanged = await AdminUser.findOne({ id: last.id }).lean();
      expect(unchanged!.role).toBe("super_admin");
    });

    it("keeps at least one active super admin after any single request", async () => {
      const last = await lastSuperAdmin();
      await request(app).post(`/api/admin/console/users/${last.id}/toggle`).set(authHeader(token));
      await request(app).delete(`/api/admin/console/users/${last.id}`).set(authHeader(token));
      await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ id: last.id, name: last.name, email: last.email, role: "auditor", active: false });

      const remaining = await AdminUser.countDocuments({ role: "super_admin", active: true });
      expect(remaining).toBeGreaterThanOrEqual(1);
    });

    it("allows the downgrade once another super admin is active", async () => {
      const promoted = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Backup Super", email: "backup.super@allpay.in", role: "super_admin" });
      expect(promoted.status).toBe(200);

      const me = await AdminUser.findOne({ email: actingEmail }).lean();
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ id: me!.id, name: me!.name, email: me!.email, role: "finance_manager", active: true });
      expect(res.status).toBe(200);

      // Restore so later tests still sign in as a super admin.
      await AdminUser.updateOne({ id: me!.id }, { $set: { role: "super_admin" } });
      await AdminUser.deleteOne({ id: promoted.body.user.id });
    });
  });

  describe("self-protection", () => {
    it("refuses to deactivate the account the caller is signed in with", async () => {
      const me = await AdminUser.findOne({ email: "test@example.com" }).lean();
      const res = await request(app)
        .post(`/api/admin/console/users/${me!.id}/toggle`)
        .set(authHeader(token));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SELF_DEACTIVATION");

      const stillActive = await AdminUser.findOne({ id: me!.id }).lean();
      expect(stillActive!.active).toBe(true);
    });

    it("refuses to delete the account the caller is signed in with", async () => {
      const me = await AdminUser.findOne({ email: "test@example.com" }).lean();
      const res = await request(app)
        .delete(`/api/admin/console/users/${me!.id}`)
        .set(authHeader(token));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SELF_DELETION");
    });

    it("refuses to save the caller's own account as inactive", async () => {
      const me = await AdminUser.findOne({ email: "test@example.com" }).lean();
      const res = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ id: me!.id, name: me!.name, email: me!.email, role: me!.role, active: false });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SELF_DEACTIVATION");
    });

    it("still allows deactivating a different admin", async () => {
      const created = await request(app)
        .put("/api/admin/console/users")
        .set(authHeader(token))
        .send({ name: "Other Admin", email: "other.admin@allpay.in", role: "finance_manager" });
      const res = await request(app)
        .post(`/api/admin/console/users/${created.body.user.id}/toggle`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.user.active).toBe(false);
    });
  });

  describe("platform configuration", () => {
    it("returns defaults with available options", async () => {
      const res = await request(app).get("/api/admin/console/platform").set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.config.receiptStorage).toBeTruthy();
      expect(res.body.options.receiptStorage).toContain("s3");
      expect(res.body.options.ingestionModes).toContain("scheduled");
    });

    it("saves storage and ingestion settings", async () => {
      const res = await request(app)
        .patch("/api/admin/console/platform")
        .set(authHeader(token))
        .send({
          receiptStorage: "s3",
          storageBucket: "allpay-receipts",
          ingestionMode: "scheduled",
          ingestionCron: "0 */3 * * *",
          retentionDays: 2555,
        });
      expect(res.status).toBe(200);
      expect(res.body.config.receiptStorage).toBe("s3");
      expect(res.body.config.storageBucket).toBe("allpay-receipts");
      expect(res.body.config.ingestionCron).toBe("0 */3 * * *");
    });

    it("rejects an unsupported storage backend", async () => {
      const res = await request(app)
        .patch("/api/admin/console/platform")
        .set(authHeader(token))
        .send({ receiptStorage: "floppy" });
      expect(res.status).toBe(400);
    });

    it("rejects a malformed ingestion cron", async () => {
      const res = await request(app)
        .patch("/api/admin/console/platform")
        .set(authHeader(token))
        .send({ ingestionCron: "every hour" });
      expect(res.status).toBe(400);
    });

    it("rejects a non-positive retention window", async () => {
      const res = await request(app)
        .patch("/api/admin/console/platform")
        .set(authHeader(token))
        .send({ retentionDays: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe("connections", () => {
    it("saves a connection and reports missing required fields on test", async () => {
      const created = await request(app)
        .put("/api/admin/console/connections")
        .set(authHeader(token))
        .send({ name: "Warehouse", connector: "snowflake", category: "data_warehouse", config: {} });
      expect(created.status).toBe(200);
      expect(created.body.connection.status).toBe("not_tested");

      const failed = await request(app)
        .post(`/api/admin/console/connections/${created.body.connection.id}/test`)
        .set(authHeader(token));
      expect(failed.body.connection.status).toBe("error");
      expect(failed.body.message).toMatch(/account|warehouse|database/i);

      await request(app)
        .put("/api/admin/console/connections")
        .set(authHeader(token))
        .send({
          id: created.body.connection.id,
          name: "Warehouse",
          connector: "snowflake",
          category: "data_warehouse",
          config: {
            account: "xy12345.ap-south-1",
            warehouse: "COMPUTE_WH",
            database: "ALLPAY",
            schema: "PUBLIC",
          },
        });

      const passed = await request(app)
        .post(`/api/admin/console/connections/${created.body.connection.id}/test`)
        .set(authHeader(token));
      expect(passed.body.connection.status).toBe("connected");
      expect(passed.body.connection.lastTestedAt).toBeTruthy();
    });

    it("rejects an unknown category", async () => {
      const res = await request(app)
        .put("/api/admin/console/connections")
        .set(authHeader(token))
        .send({ name: "Nope", connector: "carrier_pigeon", category: "pigeon" });
      expect(res.status).toBe(400);
    });

    it("deletes a connection", async () => {
      const created = await request(app)
        .put("/api/admin/console/connections")
        .set(authHeader(token))
        .send({ name: "Temp", connector: "s3", category: "cloud_storage", config: { bucket: "t" } });
      const res = await request(app)
        .delete(`/api/admin/console/connections/${created.body.connection.id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });

  describe("scheduler", () => {
    it("runs a warehouse sync job and records lastRunAt", async () => {
      const created = await request(app)
        .put("/api/admin/console/jobs")
        .set(authHeader(token))
        .send({ name: "Sync now", jobType: "warehouse_sync", cron: "0 3 * * *" });
      expect(created.status).toBe(200);

      const ran = await request(app)
        .post(`/api/admin/console/jobs/${created.body.job.id}/run`)
        .set(authHeader(token));
      expect(ran.status).toBe(200);
      expect(ran.body.job.lastRunAt).toBeTruthy();
      expect(ran.body.job.lastRunStatus).toBe("ok");
      expect(ran.body.job.lastRunRows).toBeGreaterThan(0);
      expect(String(ran.body.message)).toMatch(/Wrote/);
    });

    it("creates, toggles, and deletes a job", async () => {
      const created = await request(app)
        .put("/api/admin/console/jobs")
        .set(authHeader(token))
        .send({ name: "Nightly ingest", jobType: "receipt_ingestion", cron: "0 2 * * *" });
      expect(created.status).toBe(200);
      expect(created.body.job.enabled).toBe(true);

      const toggled = await request(app)
        .post(`/api/admin/console/jobs/${created.body.job.id}/toggle`)
        .set(authHeader(token));
      expect(toggled.body.job.enabled).toBe(false);

      const removed = await request(app)
        .delete(`/api/admin/console/jobs/${created.body.job.id}`)
        .set(authHeader(token));
      expect(removed.status).toBe(200);
    });

    it("rejects a malformed cron", async () => {
      const res = await request(app)
        .put("/api/admin/console/jobs")
        .set(authHeader(token))
        .send({ name: "Bad cron", jobType: "quality_checks", cron: "* *" });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown job type", async () => {
      const res = await request(app)
        .put("/api/admin/console/jobs")
        .set(authHeader(token))
        .send({ name: "Bad type", jobType: "bitcoin_mining", cron: "0 2 * * *" });
      expect(res.status).toBe(400);
    });
  });
});
