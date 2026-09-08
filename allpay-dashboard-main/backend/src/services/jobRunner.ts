import fs from "node:fs/promises";
import path from "node:path";
import dayjs from "dayjs";
import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Company, PlatformConnection, ScheduledJob, Transaction } from "../models";
import { cronMatches } from "./cronMatch";

export type JobRunResult = {
  status: "ok" | "error";
  rows: number;
  message: string;
};

function dataDir(...parts: string[]) {
  return path.resolve(process.cwd(), "data", ...parts);
}

async function writeCsv(filePath: string, header: string[], rows: string[][]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = [header, ...rows]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  await fs.writeFile(filePath, body, "utf8");
}

function s3ClientFromConfig(config: Record<string, unknown>): S3Client {
  const region = String(config["region"] || process.env.AWS_REGION || "us-east-1");
  const endpoint = config["endpoint"]
    ? String(config["endpoint"])
    : process.env.S3_ENDPOINT || undefined;
  const accessKeyId = String(
    config["accessKeyId"] || process.env.AWS_ACCESS_KEY_ID || ""
  );
  const secretAccessKey = String(
    config["secretAccessKey"] || process.env.AWS_SECRET_ACCESS_KEY || ""
  );
  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
}

async function testS3Connection(config: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const bucket = String(config["bucket"] || "").trim();
  if (!bucket) return { ok: false, message: "Missing required field(s): bucket" };
  try {
    const client = s3ClientFromConfig(config);
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    const prefix = String(config["prefix"] || "allpay").replace(/^\/+|\/+$/g, "");
    return {
      ok: true,
      message: `S3 bucket "${bucket}" is reachable. Landing prefix: ${prefix}/company={companyId}/dt=YYYY-MM-DD/`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `S3 test failed: ${(error as Error).message}`,
    };
  }
}

async function testSnowflakeConnection(
  config: Record<string, unknown>
): Promise<{ ok: boolean; message: string }> {
  const account = String(config["account"] || "").trim();
  const warehouse = String(config["warehouse"] || process.env.SNOWFLAKE_WAREHOUSE || "").trim();
  const database = String(config["database"] || process.env.SNOWFLAKE_DATABASE || "").trim();
  const schema = String(config["schema"] || process.env.SNOWFLAKE_SCHEMA || "PUBLIC").trim();
  const missing: string[] = [];
  if (!account) missing.push("account");
  if (!warehouse) missing.push("warehouse");
  if (!database) missing.push("database");
  if (missing.length) {
    return { ok: false, message: `Missing required field(s): ${missing.join(", ")}` };
  }

  const host = account.includes(".")
    ? account.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : `${account}.snowflakecomputing.com`;

  // Unit/integration tests validate config only (no live Snowflake network calls).
  if (process.env.NODE_ENV === "test") {
    return {
      ok: true,
      message: `Snowflake config OK for ${host} (warehouse=${warehouse}, db=${database}.${schema}). Live reachability skipped in test.`,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`https://${host}/`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status >= 500) {
      return { ok: false, message: `Snowflake host ${host} returned HTTP ${res.status}` };
    }
    return {
      ok: true,
      message: `Snowflake host ${host} reachable (HTTP ${res.status}). Compute warehouse="${warehouse}", db=${database}.${schema}. Use COPY INTO / Tasks for daily loads.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Snowflake reachability failed for ${host}: ${(error as Error).message}`,
    };
  }
}

export async function testConnectionConfig(connection: {
  connector: string;
  category: string;
  config: Record<string, unknown>;
}): Promise<{ ok: boolean; message: string }> {
  const config = connection.config ?? {};
  const connector = String(connection.connector || "");
  const category = String(connection.category || "");

  if (connector === "s3") {
    return testS3Connection(config);
  }

  if (connector === "snowflake" || (category === "data_warehouse" && connector === "snowflake")) {
    return testSnowflakeConnection(config);
  }

  if (category === "data_warehouse") {
    const account = String(config["account"] || "").trim();
    if (!account) return { ok: false, message: "Missing required field(s): account" };
    if (connector === "snowflake") return testSnowflakeConnection(config);
    return {
      ok: true,
      message: `Warehouse connector "${connector}" saved for account ${account}. Prefer Snowflake for AllPay daily loads.`,
    };
  }

  if (connector === "local_disk") {
    const folder = dataDir("connections", String(config["bucket"] || config["prefix"] || "local"));
    await fs.mkdir(folder, { recursive: true });
    const probe = path.join(folder, "connection-probe.txt");
    await fs.writeFile(probe, `ok ${dayjs().toISOString()}\n`, "utf8");
    return { ok: true, message: `Wrote probe file to ${probe}` };
  }

  if (category === "cloud_storage") {
    const bucket = String(config["bucket"] || "").trim();
    if (!bucket) return { ok: false, message: "Missing required field(s): bucket" };
    return {
      ok: true,
      message: `${connector || "storage"} settings recorded for bucket/container "${bucket}". Use Amazon S3 for production landing zones.`,
    };
  }

  if (category === "relational_database") {
    const host = String(config["host"] || "").trim();
    if (!host) return { ok: false, message: "Missing required field(s): host" };
    return {
      ok: true,
      message: `Host ${host} recorded. Live SQL drivers are not bundled; use Snowflake warehouse sync for extracts.`,
    };
  }

  return { ok: true, message: "Connection settings look complete." };
}

async function listCompanyIds(): Promise<string[]> {
  const rows = await Company.find().select({ id: 1 }).lean();
  return rows.map((r) => String(r.id)).filter(Boolean);
}

async function uploadExtractToS3(params: {
  companyId: string;
  fileName: string;
  body: Buffer | string;
}): Promise<string | null> {
  const warehouseStorage = await PlatformConnection.findOne({
    category: "cloud_storage",
    connector: "s3",
    status: { $in: ["ok", "connected", "tested", "not_tested"] },
  }).lean();
  const conn =
    warehouseStorage ||
    (await PlatformConnection.findOne({ connector: "s3" }).lean());
  if (!conn) return null;
  const config = (conn.config || {}) as Record<string, unknown>;
  const bucket = String(config["bucket"] || "").trim();
  if (!bucket) return null;
  const prefix = String(config["prefix"] || "allpay").replace(/^\/+|\/+$/g, "");
  const dt = dayjs().format("YYYY-MM-DD");
  const key = `${prefix}/company=${params.companyId}/dt=${dt}/${params.fileName}`;
  try {
    const client = s3ClientFromConfig(config);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: typeof params.body === "string" ? Buffer.from(params.body, "utf8") : params.body,
        ContentType: "text/csv",
      })
    );
    return `s3://${bucket}/${key}`;
  } catch (error) {
    console.warn("S3 upload failed:", (error as Error).message);
    return null;
  }
}

export async function executeJob(jobType: string): Promise<JobRunResult> {
  const companyIds = await listCompanyIds();
  if (!companyIds.length) {
    return { status: "ok", rows: 0, message: "No companies found — nothing to process." };
  }

  if (jobType === "receipt_ingestion") {
    const parts: string[] = [];
    let total = 0;
    for (const companyId of companyIds) {
      const missing = await Transaction.countDocuments({
        companyId,
        $or: [{ receiptUrl: { $exists: false } }, { receiptUrl: "" }, { receiptUrl: null }],
      });
      total += missing;
      parts.push(`${companyId}:${missing}`);
    }
    return {
      status: "ok",
      rows: total,
      message: `${total} claim(s) missing receipt images across companies [${parts.join(", ")}].`,
    };
  }

  if (jobType === "quality_checks") {
    const parts: string[] = [];
    let total = 0;
    const unscoped = await Transaction.countDocuments({
      $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: "" }],
    });

    for (const companyId of companyIds) {
      const [flagged, missing, highRisk, unknownEmployee] = await Promise.all([
        Transaction.countDocuments({ companyId, status: "flagged" }),
        Transaction.countDocuments({
          companyId,
          $or: [{ receiptUrl: { $exists: false } }, { receiptUrl: "" }, { receiptUrl: null }],
        }),
        Transaction.countDocuments({ companyId, verificationVerdict: "high_risk" }),
        Transaction.aggregate([
          { $match: { companyId } },
          {
            $lookup: {
              from: "employees",
              let: { eid: "$employeeId", cid: "$companyId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$id", "$$eid"] },
                        { $eq: ["$companyId", "$$cid"] },
                      ],
                    },
                  },
                },
              ],
              as: "emp",
            },
          },
          { $match: { emp: { $size: 0 } } },
          { $count: "n" },
        ]),
      ]);
      const orphanEmp = Number(unknownEmployee[0]?.n || 0);
      const row = flagged + missing + highRisk + orphanEmp;
      total += row;
      parts.push(
        `${companyId}: flagged=${flagged} missingReceipt=${missing} highRisk=${highRisk} unknownEmployee=${orphanEmp}`
      );
    }
    total += unscoped;
    if (unscoped) {
      parts.push(`GLOBAL: missingCompanyId=${unscoped}`);
    }
    return {
      status: "ok",
      rows: total,
      message: `DQ by company — ${parts.join(" | ")}`,
    };
  }

  if (jobType === "warehouse_sync") {
    const stamp = dayjs().format("YYYYMMDD-HHmmss");
    let totalRows = 0;
    const destinations: string[] = [];

    const snowflake = await PlatformConnection.findOne({
      category: "data_warehouse",
      connector: "snowflake",
    }).lean();
    const snowAccount = snowflake
      ? String((snowflake.config as Record<string, unknown>)?.["account"] || "default")
      : "default";
    const snowWarehouse = snowflake
      ? String((snowflake.config as Record<string, unknown>)?.["warehouse"] || "")
      : "";

    for (const companyId of companyIds) {
      const txs = await Transaction.find({ companyId }).sort({ dateTime: -1 }).lean();
      totalRows += txs.length;
      const fileName = `claims-${companyId}-${stamp}.csv`;
      const header = [
        "company_id",
        "claim_id",
        "employee_id",
        "employee_name",
        "department",
        "merchant",
        "category",
        "mcc",
        "amount",
        "status",
        "date_time",
        "upi_ref",
      ];
      const rows = txs.map((tx) => [
        companyId,
        String(tx.id),
        String(tx.employeeId),
        String(tx.employeeName),
        String(tx.department),
        String(tx.merchantName),
        String(tx.category),
        String(tx.mcc),
        String(tx.amount),
        String(tx.status),
        String(tx.dateTime),
        String(tx.upiRefId ?? ""),
      ]);

      const filePath = dataDir("exports", fileName);
      await writeCsv(filePath, header, rows);

      const csvBody = await fs.readFile(filePath, "utf8");
      const s3Uri = await uploadExtractToS3({ companyId, fileName, body: csvBody });
      if (s3Uri) destinations.push(s3Uri);

      const dest = dataDir("warehouse", snowAccount, companyId, fileName);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(filePath, dest);
      destinations.push(dest);
    }

    const computeNote = snowWarehouse
      ? ` Snowflake compute warehouse="${snowWarehouse}" ready for COPY/Tasks.`
      : " Configure Snowflake warehouse in Connection Manager for compute.";

    return {
      status: "ok",
      rows: totalRows,
      message: `Wrote ${totalRows} claims across ${companyIds.length} companies.${computeNote} Destinations: ${destinations.slice(0, 6).join("; ")}${destinations.length > 6 ? "…" : ""}`,
    };
  }

  if (jobType === "fraud_rescan") {
    const { verifyAndPersist } = await import("../verificationRoutes");
    let scanned = 0;
    for (const companyId of companyIds) {
      const pending = await Transaction.find({
        companyId,
        status: { $in: ["pending", "flagged"] },
      })
        .select({ id: 1 })
        .limit(40)
        .lean();
      for (const tx of pending) {
        await verifyAndPersist(tx.id, companyId);
        scanned += 1;
      }
    }
    return {
      status: "ok",
      rows: scanned,
      message: `Re-scanned ${scanned} pending or flagged claim(s) across ${companyIds.length} companies.`,
    };
  }

  return { status: "error", rows: 0, message: `Unknown job type: ${jobType}` };
}

export async function runScheduledJob(id: string): Promise<JobRunResult> {
  const job = await ScheduledJob.findOne({ id });
  if (!job) return { status: "error", rows: 0, message: "Job not found" };
  try {
    const result = await executeJob(job.jobType);
    job.lastRunAt = dayjs().toISOString();
    job.lastRunStatus = result.status;
    job.lastRunRows = result.rows;
    job.lastRunMessage = result.message;
    await job.save();
    return result;
  } catch (error) {
    const message = (error as Error).message;
    job.lastRunAt = dayjs().toISOString();
    job.lastRunStatus = "error";
    job.lastRunRows = 0;
    job.lastRunMessage = message;
    await job.save();
    return { status: "error", rows: 0, message };
  }
}

let lastFiredMinute = "";

export function startScheduler() {
  if (process.env.NODE_ENV === "test") return;
  const tick = async () => {
    const now = new Date();
    const key = dayjs(now).format("YYYY-MM-DD HH:mm");
    if (key === lastFiredMinute) return;
    lastFiredMinute = key;
    const jobs = await ScheduledJob.find({ enabled: true }).lean();
    for (const job of jobs) {
      if (!cronMatches(job.cron, now)) continue;
      await runScheduledJob(job.id);
    }
  };
  void tick();
  return setInterval(() => {
    void tick().catch((err) => console.error("Scheduler tick failed", err));
  }, 20_000);
}
