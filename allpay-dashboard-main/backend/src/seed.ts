import {
  AuthUser,
  Employee,
  Transaction,
  ExpensePolicy,
  AlertConfig,
  AdminUser,
  BillingPlan,
  PlatformConnection,
  ScheduledJob,
  ExportAudit,
  Attendance,
} from './models';
import bcrypt from 'bcryptjs';
import {
  DEMO_EMPLOYEE_EMAIL,
  DEMO_EMPLOYEE_ID,
  DEMO_EMPLOYEE_TRANSACTIONS,
  buildDemoTransactionDoc,
} from './demoEmployeeData';
import { ensureDemoReceipts } from './seedReceipts';
import { seedVerificationDemoData } from './seedVerificationData';
import {
  DEMO_COMPANY_ID,
  DEMO_COMPANY_NAME,
  DEMO_INVITE_PREFIX,
  createCompanyRecord,
  ensureCompanyDefaults,
} from './tenant';
import { migrateEmployeeInviteCodes } from './utils/inviteCode';

const DEMO_ADMIN_EMAILS = [
  'test@example.com',
  'auditor@example.com',
  'riya@allpay.in',
  'aman@allpay.in',
];

/** Older admin records predate access flags; give them role-appropriate defaults. */
async function backfillAdminPermissions() {
  await Promise.all([
    AdminUser.updateMany(
      { role: 'super_admin' },
      { $set: { canRead: true, canWrite: true } }
    ),
    AdminUser.updateMany(
      { role: 'auditor' },
      { $set: { canRead: true, canWrite: false } }
    ),
    AdminUser.updateMany(
      { role: { $nin: ['super_admin', 'auditor'] }, canRead: { $exists: false } },
      { $set: { canRead: true, canWrite: true } }
    ),
  ]);
}

/**
 * Move legacy shared seed data onto COMP-DEMO, and give real company signups
 * their own empty workspaces.
 */
async function stampSingletonConfig(
  Model: typeof AlertConfig | typeof BillingPlan,
  companyId: string
) {
  const existing = await Model.findOne({ companyId }).exec();
  const orphans = await Model.find({
    $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: "" }],
  }).exec();
  if (orphans.length === 0) return;
  if (!existing) {
    const [keep, ...drop] = orphans;
    if (keep) {
      keep.companyId = companyId;
      await keep.save();
    }
    if (drop.length) {
      await Model.deleteMany({ _id: { $in: drop.map((d) => d._id) } });
    }
    return;
  }
  await Model.deleteMany({ _id: { $in: orphans.map((d) => d._id) } });
}

async function backfillTenantIsolation() {
  // Drop legacy indexes that conflict with current uniqueness rules.
  try {
    const empIndexes = await Employee.collection.indexes();
    for (const idx of empIndexes) {
      const keys = Object.keys(idx.key || {});
      const name = idx.name || "";
      // Old global unique on id alone (now compound companyId+id).
      if (name !== "_id_" && keys.length === 1 && keys[0] === "id") {
        await Employee.collection.dropIndex(name).catch(() => undefined);
      }
      // Old per-company inviteCode uniqueness (now global inviteCode unique).
      if (
        name === "companyId_1_inviteCode_1" ||
        (keys.includes("companyId") && keys.includes("inviteCode"))
      ) {
        await Employee.collection.dropIndex(name).catch(() => undefined);
      }
    }
    const polIndexes = await ExpensePolicy.collection.indexes();
    for (const idx of polIndexes) {
      const keys = Object.keys(idx.key || {});
      if (idx.name && idx.name !== "_id_" && keys.length === 1 && keys[0] === "id") {
        await ExpensePolicy.collection.dropIndex(idx.name).catch(() => undefined);
      }
    }
    // Attendance must be unique per company + employee + date (emp1 can exist in many tenants).
    const attIndexes = await Attendance.collection.indexes();
    for (const idx of attIndexes) {
      const keys = Object.keys(idx.key || {});
      const name = idx.name || "";
      if (
        name === "employeeId_1_date_1" ||
        (keys.length === 2 && keys.includes("employeeId") && keys.includes("date") && !keys.includes("companyId"))
      ) {
        await Attendance.collection.dropIndex(name).catch(() => undefined);
      }
    }
  } catch (err) {
    console.warn("Index migration warning:", (err as Error).message);
  }

  await createCompanyRecord({
    id: DEMO_COMPANY_ID,
    name: DEMO_COMPANY_NAME,
    invitePrefix: DEMO_INVITE_PREFIX,
    companySize: '11–50 employees',
    companyType: 'Private Limited Company (Pvt Ltd)',
    monthlySpend: '₹5 lakh – ₹25 lakh',
    ownerEmail: 'test@example.com',
  });

  await Promise.all([
    AuthUser.updateMany(
      { email: { $in: [...DEMO_ADMIN_EMAILS, DEMO_EMPLOYEE_EMAIL] }, $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
      { $set: { companyId: DEMO_COMPANY_ID } }
    ),
    AdminUser.updateMany(
      { email: { $in: DEMO_ADMIN_EMAILS }, $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
      { $set: { companyId: DEMO_COMPANY_ID } }
    ),
    Employee.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
      { $set: { companyId: DEMO_COMPANY_ID } }
    ),
    Transaction.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
      { $set: { companyId: DEMO_COMPANY_ID } }
    ),
    ExpensePolicy.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
      { $set: { companyId: DEMO_COMPANY_ID } }
    ),
    ExportAudit.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
      { $set: { companyId: DEMO_COMPANY_ID } }
    ),
  ]);

  await stampSingletonConfig(AlertConfig, DEMO_COMPANY_ID);
  await stampSingletonConfig(BillingPlan, DEMO_COMPANY_ID);

  // Real company owners who signed up before tenancy: own empty company.
  const orphanAdmins = await AdminUser.find({
    email: { $nin: DEMO_ADMIN_EMAILS },
    $or: [
      { companyId: { $exists: false } },
      { companyId: null },
      { companyId: '' },
      { companyId: DEMO_COMPANY_ID },
    ],
  }).exec();

  for (const admin of orphanAdmins) {
    const auth = await AuthUser.findOne({ email: admin.email }).exec();
    if (!auth || !auth.companyName || auth.companyName === '—') continue;
    if (admin.companyId && admin.companyId !== DEMO_COMPANY_ID) continue;

    const companyId = await createCompanyRecord({
      name: auth.companyName,
      companySize: auth.companySize,
      companyType: auth.companyType,
      monthlySpend: auth.monthlySpend,
      ownerEmail: auth.email,
    });
    auth.companyId = companyId;
    await auth.save();
    admin.companyId = companyId;
    await admin.save();
  }

  await ensureCompanyDefaults(DEMO_COMPANY_ID);
}

async function ensureDemoEmployeeAccount(passwordHash: string) {
  const [, existingAuth] = await Promise.all([
    Employee.deleteMany({ email: DEMO_EMPLOYEE_EMAIL, id: { $ne: DEMO_EMPLOYEE_ID } }),
    AuthUser.findOne({ email: DEMO_EMPLOYEE_EMAIL }),
  ]);
  await Employee.updateOne(
    { email: DEMO_EMPLOYEE_EMAIL },
    {
      $set: {
        id: DEMO_EMPLOYEE_ID,
        name: 'Demo Employee',
        email: DEMO_EMPLOYEE_EMAIL,
        department: 'Operations',
        role: 'employee',
        active: true,
        onboarded: true,
        idAssigned: true,
        travelApproved: true,
        companyId: DEMO_COMPANY_ID,
      },
    },
    { upsert: true }
  );
  if (!existingAuth) {
    await AuthUser.create({
      id: 'usr_employee_demo',
      email: DEMO_EMPLOYEE_EMAIL,
      fullName: 'Demo Employee',
      companyName: DEMO_COMPANY_NAME,
      companySize: '11–50 employees',
      monthlySpend: '₹5 lakh – ₹25 lakh',
      companyType: 'Private Limited Company (Pvt Ltd)',
      passwordHash,
      createdAt: new Date().toISOString(),
      companyId: DEMO_COMPANY_ID,
    });
  } else if (!existingAuth.companyId) {
    existingAuth.companyId = DEMO_COMPANY_ID;
    await existingAuth.save();
  }
}

async function seedDemoEmployeeTransactions(employeeId: string, employeeName: string, department: string) {
  await Promise.all(
    DEMO_EMPLOYEE_TRANSACTIONS.map((tx) => {
      const doc = buildDemoTransactionDoc(tx, employeeId, employeeName, department);
      return Transaction.updateOne(
        { id: doc.id },
        { $set: { ...doc, companyId: DEMO_COMPANY_ID } },
        { upsert: true }
      );
    })
  );
}

async function ensurePlatformOps() {
  const [jobCount, connectionCount] = await Promise.all([
    ScheduledJob.countDocuments(),
    PlatformConnection.countDocuments(),
  ]);

  if (connectionCount === 0) {
    const now = new Date().toISOString();
    await PlatformConnection.insertMany([
      {
        id: "CON-LOCAL",
        name: "Local receipt store",
        connector: "local_disk",
        category: "cloud_storage",
        description: "Writes receipt extracts and probes to the server data folder.",
        status: "not_tested",
        config: { bucket: "receipts", prefix: "claims/" },
        createdAt: now,
      },
      {
        id: "CON-WH",
        name: "Finance warehouse extract",
        connector: "snowflake",
        category: "data_warehouse",
        description: "Claim CSV landing zone used by the warehouse sync job.",
        status: "not_tested",
        config: { account: "allpay_local", warehouse: "finance", database: "allpay", schema: "claims" },
        createdAt: now,
      },
    ]);
  }

  if (jobCount === 0) {
    const now = new Date().toISOString();
    await ScheduledJob.insertMany([
      {
        id: "JOB-QUALITY",
        name: "Nightly quality checks",
        jobType: "quality_checks",
        cron: "30 2 * * *",
        enabled: true,
        createdAt: now,
      },
      {
        id: "JOB-SYNC",
        name: "Warehouse claim extract",
        jobType: "warehouse_sync",
        cron: "0 3 * * *",
        enabled: true,
        createdAt: now,
      },
      {
        id: "JOB-FRAUD",
        name: "Fraud re-scan",
        jobType: "fraud_rescan",
        cron: "0 */6 * * *",
        enabled: true,
        createdAt: now,
      },
    ]);
  }
}

export async function seedDatabase() {
  const salt = await bcrypt.genSalt(10);
  const [passwordHash, adminCount] = await Promise.all([
    bcrypt.hash("password123", salt),
    AdminUser.countDocuments(),
  ]);

  if (adminCount > 0) {
    await Promise.all([
      Employee.updateMany({ id: { $not: /^PEND-/ } }, { $set: { idAssigned: true } }),
      Employee.updateOne(
        { id: "EMP-1000" },
        { $set: { inviteToken: "seed-invite-emp1000", inviteCode: "DEM_EMP1000", companyId: DEMO_COMPANY_ID } }
      ),
      ensureDemoEmployeeAccount(passwordHash),
    ]);
    const demo = await Employee.findOne({ email: DEMO_EMPLOYEE_EMAIL });
    if (demo) {
      await seedDemoEmployeeTransactions(demo.id, demo.name, demo.department);
    }
    const receipts = await ensureDemoReceipts();
    await backfillAdminPermissions();
    await ensurePlatformOps();
    await backfillTenantIsolation();
    const inviteMigration = await migrateEmployeeInviteCodes();
    const verificationDemo = await seedVerificationDemoData();
    console.log("Database already seeded");
    if (inviteMigration.updated) {
      console.log(`Invite codes migrated: ${inviteMigration.updated} updated, ${inviteMigration.skipped} skipped`);
    }
    if (receipts) console.log(`Demo receipts attached: ${receipts}`);
    if (verificationDemo.payments || verificationDemo.attendance) {
      console.log(
        `Verification demo data: ${verificationDemo.payments} AllPay payments, ${verificationDemo.attendance} attendance days`
      );
    }
    return;
  }

  console.log('Seeding database...');

  await createCompanyRecord({
    id: DEMO_COMPANY_ID,
    name: DEMO_COMPANY_NAME,
    invitePrefix: DEMO_INVITE_PREFIX,
    companySize: '11–50 employees',
    companyType: 'Private Limited Company (Pvt Ltd)',
    monthlySpend: '₹5 lakh – ₹25 lakh',
    ownerEmail: 'test@example.com',
  });

  await Promise.all([
    AuthUser.create({
      id: 'usr_test',
      email: 'test@example.com',
      fullName: 'Test User',
      companyName: DEMO_COMPANY_NAME,
      companySize: '10-50',
      monthlySpend: '1L',
      companyType: 'LLC',
      passwordHash,
      createdAt: new Date().toISOString(),
      companyId: DEMO_COMPANY_ID,
    }),
    AuthUser.create({
      id: 'usr_audit',
      email: 'auditor@example.com',
      fullName: 'Auditor User',
      companyName: DEMO_COMPANY_NAME,
      companySize: '10-50',
      monthlySpend: '1L',
      companyType: 'LLC',
      passwordHash,
      createdAt: new Date().toISOString(),
      companyId: DEMO_COMPANY_ID,
    }),
    AuthUser.create({
      id: 'usr_employee_demo',
      email: DEMO_EMPLOYEE_EMAIL,
      fullName: 'Demo Employee',
      companyName: DEMO_COMPANY_NAME,
      companySize: '11–50 employees',
      monthlySpend: '₹5 lakh – ₹25 lakh',
      companyType: 'Private Limited Company (Pvt Ltd)',
      passwordHash,
      createdAt: new Date().toISOString(),
      companyId: DEMO_COMPANY_ID,
    }),
  ]);

  const admins = [
    { id: "ADM-1", name: "Riya Nair", email: "riya@allpay.in", role: "super_admin", active: true, twoFactor: true, companyId: DEMO_COMPANY_ID },
    { id: "ADM-2", name: "Aman Sharma", email: "aman@allpay.in", role: "finance_manager", active: true, twoFactor: true, companyId: DEMO_COMPANY_ID },
    { id: "ADM-TEST", name: "Test Admin", email: "test@example.com", role: "super_admin", active: true, twoFactor: false, companyId: DEMO_COMPANY_ID },
    { id: "ADM-AUD", name: "Read-only Auditor", email: "auditor@example.com", role: "auditor", active: true, twoFactor: false, companyId: DEMO_COMPANY_ID }
  ];

  const employees = [
    {
      id: "EMP-1000",
      name: "Employee 1",
      email: "emp1@allpay.in",
      department: "Engineering",
      role: "manager",
      active: true,
      idAssigned: true,
      inviteToken: "seed-invite-emp1000",
      inviteCode: "DEM_EMP1000",
      companyId: DEMO_COMPANY_ID,
    },
    {
      id: "EMP-1001",
      name: "Employee 2",
      email: "emp2@allpay.in",
      department: "Sales",
      role: "employee",
      active: true,
      idAssigned: true,
      companyId: DEMO_COMPANY_ID,
    },
    {
      id: "EMP-1002",
      name: "Employee 3",
      email: "emp3@allpay.in",
      department: "HR",
      role: "employee",
      active: true,
      idAssigned: true,
      companyId: DEMO_COMPANY_ID,
    },
    {
      id: DEMO_EMPLOYEE_ID,
      name: "Demo Employee",
      email: DEMO_EMPLOYEE_EMAIL,
      department: "Operations",
      role: "employee",
      active: true,
      onboarded: true,
      idAssigned: true,
      travelApproved: true,
      companyId: DEMO_COMPANY_ID,
    },
  ];

  const policies = [
    {
      id: "POL-1",
      name: "Fuel max Rs.3000/month",
      mccCategory: "fuel",
      maxPerTransaction: 1500,
      maxPerMonth: 3000,
      allowedDays: [1, 2, 3, 4, 5],
      scopeType: "all",
      startDate: new Date().toISOString(),
      active: true,
      companyId: DEMO_COMPANY_ID,
    }
  ];

  const txs = [
    {
      id: `TX-70001`,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchantName: "Uber",
      mcc: "4121",
      category: "Travel",
      amount: 450,
      claimedAmount: 450,
      dateTime: new Date().toISOString(),
      status: "pending",
      upiApp: "GPay",
      upiRefId: "UPI12345",
      isNewTx: true,
      flags: [],
      hasMatchingAllpayRecord: true,
      purposeCategory: "Travel",
      timeline: [],
      companyId: DEMO_COMPANY_ID,
    },
    {
      id: `TX-70002`,
      employeeId: "EMP-1001",
      employeeName: "Employee 2",
      department: "Sales",
      merchantName: "Swiggy",
      mcc: "5812",
      category: "Meals",
      amount: 1500,
      claimedAmount: 1500,
      dateTime: new Date().toISOString(),
      status: "flagged",
      upiApp: "PhonePe",
      upiRefId: "UPI99999",
      isNewTx: true,
      flags: [{ id: 'f1', rule: 'High Amount', reason: 'Unusually high amount for meals', details: '' }],
      hasMatchingAllpayRecord: false,
      purposeCategory: "Client Entertainment",
      timeline: [],
      companyId: DEMO_COMPANY_ID,
    }
  ];

  await Promise.all([
    AdminUser.insertMany(admins),
    Employee.insertMany(employees),
    AlertConfig.findOneAndUpdate(
      { companyId: DEMO_COMPANY_ID },
      {
        $set: {
          companyId: DEMO_COMPANY_ID,
          delivery: "both",
          threshold: "daily_digest",
          mutedPolicies: [],
          mutedEmployees: [],
        },
      },
      { upsert: true }
    ),
    BillingPlan.findOneAndUpdate(
      { companyId: DEMO_COMPANY_ID },
      {
        $set: {
          companyId: DEMO_COMPANY_ID,
          plan: "Pro",
          billingCycle: "monthly",
          nextRenewal: new Date().toISOString(),
          licenses: 25,
          headcount: 24,
        },
      },
      { upsert: true }
    ),
    ExpensePolicy.insertMany(policies),
    Transaction.insertMany(txs),
    seedDemoEmployeeTransactions(DEMO_EMPLOYEE_ID, "Demo Employee", "Operations"),
  ]);

  const receipts = await ensureDemoReceipts();
  await backfillAdminPermissions();
  await ensurePlatformOps();
  await backfillTenantIsolation();
  await migrateEmployeeInviteCodes();
  await seedVerificationDemoData();
  console.log('Seeding completed');
  if (receipts) console.log(`Demo receipts attached: ${receipts}`);
}
