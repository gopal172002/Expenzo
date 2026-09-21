/**
 * AllPay employee app design tokens — premium Indian fintech / B2B expense system.
 * Aligned with the web admin product theme.
 */
export const colors = {
  // Brand
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#60A5FA',
  primarySoft: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  primaryMuted: '#DBEAFE',

  // Deep navy / indigo for headings
  navy: '#0F172A',
  navySoft: '#1E293B',
  indigo: '#312E81',
  indigoSoft: '#EEF2FF',
  indigoBorder: '#C7D2FE',

  // Hero / atmosphere
  heroStart: '#EFF6FF',
  heroMid: '#EEF2FF',
  heroEnd: '#F8FAFC',
  lavendarSoft: '#F5F3FF',

  // Status
  success: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#047857',

  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#B45309',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#B91C1C',

  info: '#0284C7',
  infoSoft: '#F0F9FF',
  infoBorder: '#BAE6FD',
  infoText: '#0369A1',

  // Surfaces
  page: '#F0F4FA',
  paper: '#FFFFFF',
  muted: '#F8FAFC',
  subtle: '#F1F5F9',
  elevated: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  borderFocus: '#2563EB',

  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  offline: '#9A3412',
  offlineSoft: '#FFF7ED',
  offlineBorder: '#FDBA74',

  // Category / accent chips (use consistently — never invent per-screen colors)
  accentBlue: '#2563EB',
  accentBlueSoft: '#DBEAFE',
  accentGreen: '#059669',
  accentGreenSoft: '#D1FAE5',
  accentPurple: '#7C3AED',
  accentPurpleSoft: '#EDE9FE',
  accentAmber: '#D97706',
  accentAmberSoft: '#FEF3C7',
  accentTeal: '#0F766E',
  accentTealSoft: '#CCFBF1',

  // Avatar / identity
  avatarBg: '#DBEAFE',
  avatarFg: '#1D4ED8',

  // Scanner
  scannerOverlay: 'rgba(15, 23, 42, 0.55)',
  scannerFrame: '#60A5FA',
  scannerLaser: '#3B82F6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  page: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  titleSm: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  subtitle: {fontSize: 15, fontWeight: '400' as const, lineHeight: 22},
  section: {fontSize: 16, fontWeight: '700' as const, lineHeight: 22},
  body: {fontSize: 15, fontWeight: '400' as const, lineHeight: 22},
  bodyStrong: {fontSize: 15, fontWeight: '600' as const, lineHeight: 22},
  caption: {fontSize: 13, fontWeight: '500' as const, lineHeight: 18},
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  metric: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  button: {fontSize: 15, fontWeight: '700' as const, lineHeight: 20},
} as const;

export const control = {
  height: 52,
  heightSm: 44,
  heightLg: 56,
  inputHeight: 52,
  iconButton: 44,
} as const;

export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
    elevation: 0,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  soft: {
    shadowColor: '#2563EB',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
  },
} as const;

export const motion = {
  fast: 150,
  normal: 220,
  slow: 320,
  pressScale: 0.98,
} as const;

export const screen = {
  padding: spacing.page,
  maxContentWidth: 560,
  heroMinHeight: 160,
  headerHeight: 56,
  tabBarHeight: 64,
  tabBarBottomPad: 10,
} as const;

/** Soft accent pair for category / quick-action marks */
export const accentTone = (
  key: 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'primary' = 'primary',
): {bg: string; fg: string} => {
  switch (key) {
    case 'green':
      return {bg: colors.accentGreenSoft, fg: colors.accentGreen};
    case 'purple':
      return {bg: colors.accentPurpleSoft, fg: colors.accentPurple};
    case 'amber':
      return {bg: colors.accentAmberSoft, fg: colors.accentAmber};
    case 'teal':
      return {bg: colors.accentTealSoft, fg: colors.accentTeal};
    case 'blue':
      return {bg: colors.accentBlueSoft, fg: colors.accentBlue};
    default:
      return {bg: colors.primarySoft, fg: colors.primary};
  }
};

/** Human-readable labels for UPI payment statuses */
export const paymentStatusLabel = (status: string): string => {
  switch (status) {
    case 'INITIATED':
      return 'Initiated';
    case 'UPI_APP_OPENED':
      return 'UPI app opened';
    case 'SUCCESS_REPORTED':
      return 'Success reported';
    case 'USER_CONFIRMED':
      return 'Confirmed by you';
    case 'PENDING':
      return 'Pending';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'UNKNOWN':
      return 'Unknown';
    default:
      return status;
  }
};

export const statusTone = (
  status: string,
): {bg: string; fg: string; border: string} => {
  if (
    status === 'Approved' ||
    status === 'SUCCESS_REPORTED' ||
    status === 'synced' ||
    status === 'Recorded'
  ) {
    return {bg: colors.successSoft, fg: colors.successText, border: colors.successBorder};
  }
  if (
    status === 'Rejected' ||
    status === 'Abandoned' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  ) {
    return {bg: colors.dangerSoft, fg: colors.dangerText, border: colors.dangerBorder};
  }
  if (
    status === 'Pending Approval' ||
    status === 'Flagged' ||
    status === 'PENDING' ||
    status === 'UNKNOWN' ||
    status === 'USER_CONFIRMED' ||
    status === 'INITIATED' ||
    status === 'UPI_APP_OPENED' ||
    status === 'queued'
  ) {
    return {bg: colors.warningSoft, fg: colors.warningText, border: colors.warningBorder};
  }
  return {bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primaryBorder};
};
