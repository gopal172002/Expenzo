import {OnboardingProfile, UpiApp} from '../types';

export const COMPANY_AMOUNT_LIMIT = 5000;

export const EXPENSE_PURPOSES = [
  'Client meeting',
  'Travel',
  'Office supplies',
  'Fuel',
  'Food',
  'Warehouse operations',
];

export const KNOWN_UPI_APPS: UpiApp[] = [
  {
    id: 'gpay',
    name: 'Google Pay',
    logo: 'G',
    scheme: 'gpay://upi/pay',
    storeUrl:
      'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    logo: 'P',
    scheme: 'phonepe://pay',
    storeUrl:
      'https://play.google.com/store/apps/details?id=com.phonepe.app',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    logo: 'PT',
    scheme: 'paytmmp://upi/pay',
    storeUrl:
      'https://play.google.com/store/apps/details?id=net.one97.paytm',
  },
  {
    id: 'bhim',
    name: 'BHIM',
    logo: 'B',
    scheme: 'bhim://upi/pay',
    storeUrl: 'https://play.google.com/store/apps/details?id=in.org.npci.upiapp',
  },
];

/** Offline fixtures only — live onboarding uses Admin → Employees invite codes (PREFIX_EMPLOYEEID). */
const INVITES: Record<string, OnboardingProfile> = {
  DEM_EMP1000: {
    companyId: 'cmp_001',
    companyName: 'AllPay Demo',
    employeeId: 'EMP-1000',
    employeeName: 'Employee 1',
    department: 'Engineering',
    mobile: '+91 90000 11223',
  },
};

export const resolveInviteCode = (code: string): OnboardingProfile | null =>
  INVITES[code.trim().toUpperCase()] ?? null;
