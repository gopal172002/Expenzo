import mongoose, { Document, Schema } from 'mongoose';

// Company (tenant workspace)
export interface ICompany extends Document {
  id: string;
  name: string;
  /** Short unique code used in mobile invite codes, e.g. MCR → MCR_58847. */
  invitePrefix?: string;
  companySize?: string;
  companyType?: string;
  monthlySpend?: string;
  ownerEmail: string;
  createdAt: string;
}

const CompanySchema = new Schema<ICompany>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  invitePrefix: { type: String, uppercase: true, trim: true },
  companySize: { type: String },
  companyType: { type: String },
  monthlySpend: { type: String },
  ownerEmail: { type: String, required: true },
  createdAt: { type: String, required: true },
});
CompanySchema.index({ invitePrefix: 1 }, { unique: true, sparse: true });

export const Company = mongoose.model<ICompany>('Company', CompanySchema);

// Auth User
export interface IAuthUser extends Document {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  companySize: string;
  monthlySpend: string;
  companyType: string;
  passwordHash: string;
  jobTitle?: string;
  createdAt: string;
  /** Tenant workspace this account belongs to. */
  companyId?: string;
}

const AuthUserSchema = new Schema<IAuthUser>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  companyName: { type: String, required: true },
  companySize: { type: String, required: true },
  monthlySpend: { type: String, required: true },
  companyType: { type: String, required: true },
  passwordHash: { type: String, required: true },
  jobTitle: { type: String },
  createdAt: { type: String, required: true },
  companyId: { type: String, index: true },
});

export const AuthUser = mongoose.model<IAuthUser>('AuthUser', AuthUserSchema);

// Admin User
export interface IAdminUser extends Document {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  twoFactor: boolean;
  canRead: boolean;
  canWrite: boolean;
  companyId?: string;
}

const AdminUserSchema = new Schema<IAdminUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  active: { type: Boolean, required: true },
  twoFactor: { type: Boolean, required: true },
  canRead: { type: Boolean, default: true },
  canWrite: { type: Boolean, default: true },
  companyId: { type: String, index: true },
});
AdminUserSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);

// Employee
export interface IEmployee extends Document {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  active: boolean;
  onboarded: boolean;
  travelApproved: boolean;
  /** True once admin assigns a serial ID (emp1, emp2, …). */
  idAssigned: boolean;
  /** Secure token for legacy mobile pairing (employeeId + inviteToken). */
  inviteToken?: string;
  /** Short code admin shares for mobile app onboarding (e.g. MCR_58847). */
  inviteCode?: string;
  phone?: string;
  companyId?: string;
}

const EmployeeSchema = new Schema<IEmployee>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, required: true },
  active: { type: Boolean, default: true },
  onboarded: { type: Boolean, default: false },
  travelApproved: { type: Boolean, default: false },
  idAssigned: { type: Boolean, default: false },
  inviteToken: { type: String, sparse: true, select: true },
  // Globally unique — format PREFIX_EMPLOYEEID (e.g. MCR_58847).
  inviteCode: { type: String, sparse: true, unique: true, uppercase: true, trim: true },
  phone: { type: String },
  companyId: { type: String, index: true },
});
EmployeeSchema.index({ companyId: 1, id: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });
EmployeeSchema.index({ companyId: 1, name: 1, email: 1 });
EmployeeSchema.index({ companyId: 1, department: 1, active: 1 });
EmployeeSchema.index({ companyId: 1, active: 1, idAssigned: 1 });
EmployeeSchema.index({ companyId: 1, onboarded: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);

export type MobileOnboardingStep = "profile" | "otp" | "complete";

export interface IMobileOnboardingSession extends Document {
  id: string;
  inviteCode: string;
  employeeId: string;
  step: MobileOnboardingStep;
  phone?: string;
  otpHash?: string;
  otpExpiresAt?: string;
  otpVerified: boolean;
  completed: boolean;
  expiresAt: string;
  createdAt: string;
  companyId?: string;
}

const MobileOnboardingSessionSchema = new Schema<IMobileOnboardingSession>({
  id: { type: String, required: true, unique: true },
  inviteCode: { type: String, required: true },
  employeeId: { type: String, required: true },
  step: { type: String, required: true },
  phone: { type: String },
  otpHash: { type: String },
  otpExpiresAt: { type: String },
  otpVerified: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  expiresAt: { type: String, required: true },
  createdAt: { type: String, required: true },
  companyId: { type: String, index: true },
});

export const MobileOnboardingSession = mongoose.model<IMobileOnboardingSession>(
  "MobileOnboardingSession",
  MobileOnboardingSessionSchema
);

// Transaction
export interface ITransaction extends Document {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  merchantName: string;
  mcc: string;
  category: string;
  amount: number;
  claimedAmount: number;
  dateTime: string;
  status: string;
  upiApp: string;
  upiRefId: string;
  isNewTx: boolean; // renamed from isNew to avoid mongoose conflict
  flags: Array<{ id: string; rule: string; reason: string; details: string }>;
  adminDecision?: string;
  adminDecisionAt?: string;
  receiptUrl?: string;
  hasMatchingAllpayRecord: boolean;
  purposeCategory: string;
  timeline: Array<{ id: string; actor: string; action: string; timestamp: string }>;
  /** UPI payee address from employee app */
  merchantVpa?: string;
  reimbursementNote?: string;
  policyWarning?: string;
  warningAcknowledged?: boolean;
  mobileLocation?: unknown;
  /** One-shot GPS latitude at payment confirmation (nullable when denied/unavailable). */
  latitude?: number | null;
  /** One-shot GPS longitude at payment confirmation. */
  longitude?: number | null;
  /** ISO timestamp when the GPS snapshot was taken. */
  locationCapturedAt?: string | null;
  mobileReceipts?: unknown[];
  lastSyncedFromMobileAt?: string;
  paymentStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  orderAmountPaise?: number;
  capturedAmountPaise?: number;
  paymentMethod?: string;
  paymentFailedReason?: string;
  paymentConfirmedAt?: string;
  razorpayWebhookEventIds?: string[];
  razorpayPayoutId?: string;
  payoutUtr?: string;
  payoutFailedReason?: string;
  payoutProcessedAt?: string;
  refundId?: string;
  receiptFraudScore?: number;
  receiptFraudTier?: string;
  receiptFraudReport?: unknown;
  /** Combined verification verdict across payment, policy, timing, and image checks. */
  verification?: unknown;
  verificationScore?: number;
  verificationVerdict?: string;
  /** Query thread between finance and the employee when a claim is challenged. */
  claimTicket?: unknown;
  claimTicketStatus?: string;
  /** Canonical amount in integer paise. `amount` is derived for older dashboard views. */
  amountPaise?: number;
  /** UPI Intent payment id. Unique when present so duplicate callbacks cannot spawn two expenses. */
  paymentId?: string;
  upiTxnRef?: string;
  approvalRefNo?: string;
  upiResponseCode?: string;
  expenseSource?: string;
  companyId?: string;
}

const TransactionSchema = new Schema<ITransaction>({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  merchantName: { type: String, required: true },
  mcc: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  claimedAmount: { type: Number, required: true },
  dateTime: { type: String, required: true },
  status: { type: String, required: true },
  upiApp: { type: String, required: true },
  upiRefId: { type: String, required: true },
  isNewTx: { type: Boolean, default: true },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flags: ({ type: [Schema.Types.Mixed], default: [] }) as any,
  adminDecision: { type: String },
  adminDecisionAt: { type: String },
  receiptUrl: { type: String },
  hasMatchingAllpayRecord: { type: Boolean, default: false },
  purposeCategory: { type: String, required: true },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline: ({ type: [Schema.Types.Mixed], default: [] }) as any,
  merchantVpa: { type: String },
  reimbursementNote: { type: String },
  policyWarning: { type: String },
  warningAcknowledged: { type: Boolean },
  mobileLocation: { type: Schema.Types.Mixed },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  locationCapturedAt: { type: String, default: null },
  mobileReceipts: { type: [Schema.Types.Mixed], default: [] },
  lastSyncedFromMobileAt: { type: String },
  paymentStatus: { type: String, default: "draft" },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  orderAmountPaise: { type: Number },
  capturedAmountPaise: { type: Number },
  paymentMethod: { type: String },
  paymentFailedReason: { type: String },
  paymentConfirmedAt: { type: String },
  razorpayWebhookEventIds: { type: [String], default: [] },
  razorpayPayoutId: { type: String },
  payoutUtr: { type: String },
  payoutFailedReason: { type: String },
  payoutProcessedAt: { type: String },
  refundId: { type: String },
  receiptFraudScore: { type: Number },
  receiptFraudTier: { type: String },
  receiptFraudReport: { type: Schema.Types.Mixed },
  verification: { type: Schema.Types.Mixed },
  verificationScore: { type: Number },
  verificationVerdict: { type: String },
  claimTicket: { type: Schema.Types.Mixed },
  claimTicketStatus: { type: String },
  amountPaise: { type: Number },
  paymentId: { type: String, index: true, sparse: true, unique: true },
  upiTxnRef: { type: String },
  approvalRefNo: { type: String },
  upiResponseCode: { type: String },
  expenseSource: { type: String },
  companyId: { type: String, index: true },
});

TransactionSchema.index({ companyId: 1, dateTime: -1 });
TransactionSchema.index({ companyId: 1, status: 1, dateTime: -1 });
TransactionSchema.index({ companyId: 1, employeeId: 1, dateTime: -1 });
TransactionSchema.index({ companyId: 1, department: 1, dateTime: -1 });
TransactionSchema.index({ companyId: 1, category: 1, dateTime: -1 });
TransactionSchema.index({ companyId: 1, verificationVerdict: 1, verificationScore: -1, dateTime: -1 });
TransactionSchema.index({ companyId: 1, claimTicketStatus: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

// Expense Policy
export interface IExpensePolicy extends Document {
  id: string;
  name: string;
  mccCategory: string;
  maxPerTransaction: number;
  maxPerMonth: number;
  allowedDays: number[];
  scopeType: string;
  scopeValue?: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  companyId?: string;
}

const ExpensePolicySchema = new Schema<IExpensePolicy>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  mccCategory: { type: String, required: true },
  maxPerTransaction: { type: Number, required: true },
  maxPerMonth: { type: Number, required: true },
  allowedDays: { type: [Number], required: true },
  scopeType: { type: String, required: true },
  scopeValue: { type: String },
  startDate: { type: String, required: true },
  endDate: { type: String },
  active: { type: Boolean, default: true },
  companyId: { type: String, index: true },
});
ExpensePolicySchema.index({ companyId: 1, id: 1 }, { unique: true });

export const ExpensePolicy = mongoose.model<IExpensePolicy>('ExpensePolicy', ExpensePolicySchema);

// Alert Config
export interface IAlertConfig extends Document {
  delivery: string;
  threshold: string;
  mutedPolicies: string[];
  mutedEmployees: string[];
  companyId?: string;
}

const AlertConfigSchema = new Schema<IAlertConfig>({
  delivery: { type: String, required: true },
  threshold: { type: String, required: true },
  mutedPolicies: { type: [String], default: [] },
  mutedEmployees: { type: [String], default: [] },
  companyId: { type: String, index: true, unique: true, sparse: true },
});

export const AlertConfig = mongoose.model<IAlertConfig>('AlertConfig', AlertConfigSchema);

// Billing Plan
export interface IBillingPlan extends Document {
  plan: string;
  billingCycle: string;
  nextRenewal: string;
  licenses: number;
  headcount: number;
  companyId?: string;
}

const BillingPlanSchema = new Schema<IBillingPlan>({
  plan: { type: String, required: true },
  billingCycle: { type: String, required: true },
  nextRenewal: { type: String, required: true },
  licenses: { type: Number, required: true },
  headcount: { type: Number, required: true },
  companyId: { type: String, index: true, unique: true, sparse: true },
});

export const BillingPlan = mongoose.model<IBillingPlan>('BillingPlan', BillingPlanSchema);

// Export Audit
export interface IExportAudit extends Document {
  id: string;
  actor: string;
  format: string;
  dateRange: string;
  exportedAt: string;
  recordCount: number;
  companyId?: string;
}

const ExportAuditSchema = new Schema<IExportAudit>({
  id: { type: String, required: true, unique: true },
  actor: { type: String, required: true },
  format: { type: String, required: true },
  dateRange: { type: String, required: true },
  exportedAt: { type: String, required: true },
  recordCount: { type: Number, required: true },
  companyId: { type: String, index: true },
});

export const ExportAudit = mongoose.model<IExportAudit>('ExportAudit', ExportAuditSchema);

// Processed Razorpay webhook events (idempotency)
export interface IProcessedWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  processedAt: string;
}

const ProcessedWebhookEventSchema = new Schema<IProcessedWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  processedAt: { type: String, required: true },
});

export const ProcessedWebhookEvent = mongoose.model<IProcessedWebhookEvent>(
  'ProcessedWebhookEvent',
  ProcessedWebhookEventSchema
);

// Payment proof (manual bank transfer / cash — employee web submissions)
export interface IPaymentProof extends Document {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  paymentType: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  status: string;
  createdAt: string;
  /** Linked expense line after finance review (optional). */
  transactionId?: string;
  companyId?: string;
}

const PaymentProofSchema = new Schema<IPaymentProof>({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  paymentType: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  receiptUrl: { type: String },
  status: { type: String, default: "pending" },
  createdAt: { type: String, required: true },
  transactionId: { type: String },
  companyId: { type: String, index: true },
});

export const PaymentProof = mongoose.model<IPaymentProof>("PaymentProof", PaymentProofSchema);

/** Receipt image bytes stored in MongoDB (replaces local uploads/ folder). */
export interface IReceiptFile extends Document {
  id: string;
  transactionId: string;
  companyId?: string;
  contentType: string;
  originalName: string;
  size: number;
  data: Buffer;
  createdAt: string;
}

const ReceiptFileSchema = new Schema<IReceiptFile>({
  id: { type: String, required: true, unique: true },
  transactionId: { type: String, required: true, index: true },
  companyId: { type: String, index: true },
  contentType: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: String, required: true },
});

export const ReceiptFile = mongoose.model<IReceiptFile>("ReceiptFile", ReceiptFileSchema);

/** Where receipt files and warehouse exports are stored for this workspace. */
export interface IPlatformConfig extends Document {
  id: string;
  receiptStorage: string;
  storageBucket?: string;
  storageRegion?: string;
  storagePublicBase?: string;
  ingestionMode: string;
  ingestionCron?: string;
  retentionDays: number;
  updatedAt: string;
  updatedBy?: string;
}

const PlatformConfigSchema = new Schema<IPlatformConfig>({
  id: { type: String, required: true, unique: true, default: "platform" },
  receiptStorage: { type: String, required: true, default: "mongo" },
  storageBucket: { type: String },
  storageRegion: { type: String },
  storagePublicBase: { type: String },
  ingestionMode: { type: String, required: true, default: "realtime" },
  ingestionCron: { type: String, default: "0 */2 * * *" },
  retentionDays: { type: Number, required: true, default: 2555 },
  updatedAt: { type: String, required: true },
  updatedBy: { type: String },
});

export const PlatformConfig = mongoose.model<IPlatformConfig>(
  "PlatformConfig",
  PlatformConfigSchema
);

/** External systems the workspace reads from or writes to (warehouse, storage, database). */
export interface IPlatformConnection extends Document {
  id: string;
  name: string;
  connector: string;
  category: string;
  description?: string;
  status: string;
  config: Record<string, unknown>;
  createdAt: string;
  lastTestedAt?: string;
}

const PlatformConnectionSchema = new Schema<IPlatformConnection>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  connector: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  status: { type: String, required: true, default: "not_tested" },
  config: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: String, required: true },
  lastTestedAt: { type: String },
});

export const PlatformConnection = mongoose.model<IPlatformConnection>(
  "PlatformConnection",
  PlatformConnectionSchema
);

/** Scheduled ingestion / quality jobs shown in the Admin Console scheduler. */
export interface IScheduledJob extends Document {
  id: string;
  name: string;
  jobType: string;
  cron: string;
  enabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunRows?: number;
  lastRunMessage?: string;
  createdAt: string;
}

const ScheduledJobSchema = new Schema<IScheduledJob>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  jobType: { type: String, required: true },
  cron: { type: String, required: true },
  enabled: { type: Boolean, required: true, default: true },
  lastRunAt: { type: String },
  lastRunStatus: { type: String },
  lastRunRows: { type: Number },
  lastRunMessage: { type: String },
  createdAt: { type: String, required: true },
});

export const ScheduledJob = mongoose.model<IScheduledJob>("ScheduledJob", ScheduledJobSchema);

/** Punch-in / punch-out sheet used to cross-check travel claims against office hours. */
export interface IAttendance extends Document {
  id: string;
  employeeId: string;
  companyId?: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  workLocation: string;
  source: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  companyId: { type: String, index: true },
  date: { type: String, required: true, index: true },
  punchIn: { type: String },
  punchOut: { type: String },
  workLocation: { type: String, required: true, default: "office" },
  source: { type: String, required: true, default: "hrms" },
});

AttendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>("Attendance", AttendanceSchema);


