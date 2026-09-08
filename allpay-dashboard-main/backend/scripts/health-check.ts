/**
 * Live backend health check against running server + Atlas MongoDB.
 * Usage: npx tsx scripts/health-check.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import mongoose from "mongoose";
import sharp from "sharp";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API = `http://localhost:${process.env.PORT || 5000}/api`;
const results: { name: string; ok: boolean; detail: string }[] = [];

function pass(name: string, detail = "ok") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail !== "ok" ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name} — ${detail}`);
}

async function loginAdmin() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "password123", portal: "admin" }),
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok || !data.token) throw new Error(data.message || `admin login ${res.status}`);
  return data.token;
}

async function loginEmployee() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: "emp0", password: "password123", portal: "employee" }),
  });
  const data = (await res.json()) as { token?: string; message?: string };
  if (!res.ok || !data.token) throw new Error(data.message || `employee login ${res.status}`);
  return data.token;
}

async function main() {
  console.log("\n=== Database ===\n");

  try {
    await mongoose.connect(process.env.MONGO_URI!);
    const dbName = mongoose.connection.db?.databaseName;
    const cols = await mongoose.connection.db!.listCollections().toArray();
    pass("MongoDB connected", dbName ?? "unknown");

    const counts = await Promise.all([
      mongoose.connection.db!.collection("transactions").countDocuments(),
      mongoose.connection.db!.collection("employees").countDocuments(),
      mongoose.connection.db!.collection("receiptfiles").countDocuments(),
      mongoose.connection.db!.collection("paymentproofs").countDocuments(),
      mongoose.connection.db!.collection("authusers").countDocuments(),
    ]);
    pass(
      "Collections populated",
      `transactions=${counts[0]}, employees=${counts[1]}, receiptfiles=${counts[2]}, paymentproofs=${counts[3]}, authusers=${counts[4]}`
    );
    pass("Collection list", cols.map((c) => c.name).sort().join(", "));
  } catch (e) {
    fail("MongoDB", (e as Error).message);
  }

  console.log("\n=== Auth ===\n");

  let adminToken = "";
  let employeeToken = "";
  try {
    adminToken = await loginAdmin();
    pass("POST /auth/login (admin)");
  } catch (e) {
    fail("POST /auth/login (admin)", (e as Error).message);
  }

  try {
    employeeToken = await loginEmployee();
    pass("POST /auth/login (employee)");
  } catch (e) {
    fail("POST /auth/login (employee)", (e as Error).message);
  }

  const badLogin = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "wrong", portal: "admin" }),
  });
  badLogin.status === 400 ? pass("POST /auth/login rejects bad password") : fail("POST /auth/login rejects bad password", `status ${badLogin.status}`);

  console.log("\n=== Admin APIs ===\n");

  if (adminToken) {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const checks: Array<[string, string, RequestInit?]> = [
      ["GET /admin/bootstrap", `${API}/admin/bootstrap`],
      ["GET /admin/transactions", `${API}/admin/transactions?page=1&limit=10`],
      ["GET /admin/analytics/daily-spend", `${API}/admin/analytics/daily-spend`],
      ["GET /admin/analytics/aggregated", `${API}/admin/analytics/aggregated?timelineBucket=daily`],
      ["GET /admin/employees/pending-id", `${API}/admin/employees/pending-id`],
    ];

    for (const [name, url, init] of checks) {
      try {
        const res = await fetch(url, { ...init, headers: { ...auth, ...(init?.headers as object) } });
        res.ok ? pass(name, String(res.status)) : fail(name, `HTTP ${res.status}`);
      } catch (e) {
        fail(name, (e as Error).message);
      }
    }

    try {
      const preview = await fetch(`${API}/admin/policies/preview`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "POL-health",
          name: "Health check",
          mccCategory: "Travel",
          maxPerTransaction: 500,
          maxPerMonth: 2000,
          allowedDays: [1, 2, 3, 4, 5],
          scopeType: "all",
          startDate: new Date().toISOString().slice(0, 10),
          active: true,
        }),
      });
      preview.ok ? pass("POST /admin/policies/preview", String(preview.status)) : fail("POST /admin/policies/preview", `HTTP ${preview.status}`);
    } catch (e) {
      fail("POST /admin/policies/preview", (e as Error).message);
    }
  } else {
    fail("Admin APIs", "skipped — no admin token");
  }

  console.log("\n=== Employee APIs ===\n");

  if (employeeToken) {
    const auth = { Authorization: `Bearer ${employeeToken}` };
    const checks: Array<[string, string]> = [
      ["GET /employee/bootstrap", `${API}/employee/bootstrap`],
      ["GET /employee/transactions", `${API}/employee/transactions`],
      ["GET /employee/spend", `${API}/employee/spend?rangeDays=30`],
      ["GET /employee/payment-proofs", `${API}/employee/payment-proofs`],
      ["GET /employee/analytics/daily-spend", `${API}/employee/analytics/daily-spend`],
    ];

    for (const [name, url] of checks) {
      try {
        const res = await fetch(url, { headers: auth });
        res.ok ? pass(name, String(res.status)) : fail(name, `HTTP ${res.status}`);
      } catch (e) {
        fail(name, (e as Error).message);
      }
    }
  } else {
    fail("Employee APIs", "skipped — no employee token");
  }

  console.log("\n=== Receipt storage (MongoDB) ===\n");

  if (employeeToken) {
    try {
      const imageBytes = await sharp({
        create: { width: 80, height: 60, channels: 3, background: { r: 240, g: 240, b: 240 } },
      })
        .jpeg()
        .toBuffer();

      const fd = new FormData();
      fd.append("paymentType", "Cash");
      fd.append("amount", "50");
      fd.append("description", "Health check upload");
      fd.append("receipt", new Blob([imageBytes], { type: "image/jpeg" }), "health.jpg");

      const submit = await fetch(`${API}/employee/payment-proofs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${employeeToken}` },
        body: fd,
      });
      const body = (await submit.json()) as { transaction?: { receiptUrl?: string }; error?: string };
      if (!submit.ok) {
        fail("POST /employee/payment-proofs (with receipt)", body.error || `HTTP ${submit.status}`);
      } else {
        const url = body.transaction?.receiptUrl ?? "";
        const isMongo = url.includes("/api/receipts/");
        isMongo ? pass("POST /employee/payment-proofs saves to MongoDB", url) : fail("Receipt URL not mongo", url);

        if (isMongo) {
          const receiptId = url.split("/").pop()!;
          const img = await fetch(`${API}/receipts/${receiptId}`);
          img.ok && img.headers.get("content-type")?.includes("image")
            ? pass("GET /receipts/:id serves image", String(img.status))
            : fail("GET /receipts/:id", `HTTP ${img.status}`);
        }
      }
    } catch (e) {
      fail("Receipt upload pipeline", (e as Error).message);
    }
  }

  console.log("\n=== Mobile onboarding ===\n");

  try {
    const invite = await fetch(`${API}/mobile/onboarding/verify-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "DEM_EMP1000" }),
    });
    const data = (await invite.json()) as { ok?: boolean; profile?: { email?: string }; companyId?: string };
    invite.ok && data.ok
      ? pass(
          "POST /mobile/onboarding/verify-invite",
          data.profile?.email ?? data.companyId ?? "ok"
        )
      : fail("verify-invite", `HTTP ${invite.status}`);
  } catch (e) {
    fail("POST /mobile/onboarding/verify-invite", (e as Error).message);
  }

  console.log("\n=== Summary ===\n");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`  ${passed}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\n  Failed:");
    for (const f of failed) console.log(`    - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log("\n  All backend systems healthy.\n");
  }

  await mongoose.disconnect().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
