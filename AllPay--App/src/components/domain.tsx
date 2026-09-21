import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle, StyleProp} from 'react-native';
import {colors, radius, shadow, spacing, typography} from '../theme/tokens';
import {StatusBadge} from './feedback';
import {TextButton} from './layout';

export const MetricCard = ({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'primary' | 'success' | 'warning' | 'neutral';
}) => {
  const accentBg =
    accent === 'primary'
      ? colors.primarySoft
      : accent === 'success'
        ? colors.successSoft
        : accent === 'warning'
          ? colors.warningSoft
          : colors.paper;
  return (
    <View style={[styles.metricCard, {backgroundColor: accentBg}]}>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.metricHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

export const DetailRow = ({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View style={[styles.detailRow, last ? styles.detailRowLast : null]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={4}>
      {value}
    </Text>
  </View>
);

export const CompanyBadge = ({
  companyName,
  employeeName,
}: {
  companyName?: string;
  employeeName?: string;
}) => {
  if (!companyName && !employeeName) {
    return null;
  }
  return (
    <View style={styles.companyBadge}>
      <View style={styles.companyMark}>
        <Text style={styles.companyMarkText}>
          {(companyName ?? 'AP').slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.flexOne}>
        {companyName ? (
          <Text style={styles.companyName} numberOfLines={1}>
            {companyName}
          </Text>
        ) : null}
        {employeeName ? (
          <Text style={styles.companyEmployee} numberOfLines={1}>
            {employeeName}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const ListRow = ({
  title,
  meta,
  right,
  onPress,
  style,
  leading,
}: {
  title: string;
  meta?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  leading?: React.ReactNode;
}) => {
  const content = (
    <View style={[styles.listRow, style]}>
      {leading}
      <View style={styles.flexOne}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.listMeta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) {
    return content;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({pressed}) => (pressed ? {opacity: 0.92} : null)}>
      {content}
    </Pressable>
  );
};

export const TransactionRow = ({
  merchant,
  amount,
  date,
  paymentStatus,
  reimbursementStatus,
  hasReceipt,
  hasLocation,
  syncLabel,
  category,
  onPress,
}: {
  merchant: string;
  amount: string;
  date: string;
  paymentStatus?: string;
  reimbursementStatus?: string;
  hasReceipt?: boolean;
  hasLocation?: boolean;
  syncLabel?: string;
  category?: string;
  onPress?: () => void;
}) => {
  const initial = (merchant || '?').charAt(0).toUpperCase();
  return (
    <ListRow
      onPress={onPress}
      leading={
        <View style={styles.txAvatar}>
          <Text style={styles.txAvatarText}>{initial}</Text>
        </View>
      }
      title={merchant}
      meta={[
        date,
        category,
        syncLabel,
        hasReceipt ? 'Receipt' : null,
        hasLocation ? 'Location' : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      right={
        <View style={styles.txRight}>
          <Text style={styles.txAmount}>{amount}</Text>
          {reimbursementStatus ? <StatusBadge status={reimbursementStatus} /> : null}
          {paymentStatus && !reimbursementStatus ? (
            <StatusBadge status={paymentStatus} />
          ) : null}
        </View>
      }
    />
  );
};

export const ReceiptCard = ({
  fileName,
  onRemove,
}: {
  uri?: string;
  fileName?: string;
  onRemove?: () => void;
}) => (
  <View style={styles.receiptCard}>
    <View style={styles.receiptThumb}>
      <Text style={styles.receiptMark}>R</Text>
    </View>
    <View style={styles.flexOne}>
      <Text style={styles.receiptName} numberOfLines={1}>
        {fileName ?? 'Receipt'}
      </Text>
      <Text style={styles.receiptMeta}>Attached</Text>
    </View>
    {onRemove ? <TextButton label="Remove" onPress={onRemove} /> : null}
  </View>
);

export const Timeline = ({
  items,
}: {
  items: Array<{
    title: string;
    meta?: string;
    tone?: 'default' | 'success' | 'warning' | 'danger';
  }>;
}) => (
  <View style={styles.timeline}>
    {items.map((item, i) => {
      const color =
        item.tone === 'success'
          ? colors.success
          : item.tone === 'warning'
            ? colors.warning
            : item.tone === 'danger'
              ? colors.danger
              : colors.primary;
      const last = i === items.length - 1;
      return (
        <View key={`${item.title}-${i}`} style={styles.timelineItem}>
          <View style={styles.timelineRail}>
            <View style={[styles.timelineDot, {backgroundColor: color}]} />
            {!last ? <View style={styles.timelineLine} /> : null}
          </View>
          <View style={[styles.timelineContent, last ? null : {marginBottom: spacing.md}]}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            {item.meta ? <Text style={styles.timelineMeta}>{item.meta}</Text> : null}
          </View>
        </View>
      );
    })}
  </View>
);

export const PaymentStatusCard = ({
  amount,
  payee,
  status,
  explanation,
  reference,
}: {
  amount: string;
  payee: string;
  status: string;
  explanation: string;
  reference?: string;
}) => {
  const tone =
    status === 'SUCCESS_REPORTED' || status === 'USER_CONFIRMED'
      ? 'success'
      : status === 'FAILED' || status === 'CANCELLED'
        ? 'danger'
        : status === 'UPI_APP_OPENED' || status === 'INITIATED'
          ? 'info'
          : 'warning';
  const palette = {
    success: {
      bg: colors.successSoft,
      border: colors.successBorder,
      icon: '✓',
      iconBg: colors.success,
    },
    danger: {
      bg: colors.dangerSoft,
      border: colors.dangerBorder,
      icon: '×',
      iconBg: colors.danger,
    },
    warning: {
      bg: colors.warningSoft,
      border: colors.warningBorder,
      icon: '…',
      iconBg: colors.warning,
    },
    info: {
      bg: colors.infoSoft,
      border: colors.infoBorder,
      icon: '↗',
      iconBg: colors.info,
    },
  }[tone];

  return (
    <View
      style={[styles.payStatusCard, {backgroundColor: palette.bg, borderColor: palette.border}]}
      accessibilityRole="summary">
      <View style={[styles.payStatusIcon, {backgroundColor: palette.iconBg}]}>
        <Text style={styles.payStatusIconText}>{palette.icon}</Text>
      </View>
      <Text style={styles.payStatusAmount}>{amount}</Text>
      <Text style={styles.payStatusPayee}>{payee}</Text>
      <StatusBadge status={status} />
      <Text style={styles.payStatusBody}>{explanation}</Text>
      {reference ? <Text style={styles.payStatusRef}>Reference: {reference}</Text> : null}
      <Text style={styles.payStatusFootnote}>
        AllPay records reported results. It does not settle bank payments.
      </Text>
    </View>
  );
};

export const ProductHeroVisual = () => (
  <View style={styles.heroVisual} accessibilityLabel="AllPay product overview">
    <View style={styles.heroBlob} />
    <View style={styles.heroCardMain}>
      <View style={styles.heroScanFrame}>
        <View style={styles.heroCornerTL} />
        <View style={styles.heroCornerTR} />
        <View style={styles.heroCornerBL} />
        <View style={styles.heroCornerBR} />
        <Text style={styles.heroScanLabel}>QR</Text>
      </View>
      <View style={styles.heroCardMeta}>
        <Text style={styles.heroCardTitle}>Scan & Pay</Text>
        <Text style={styles.heroCardSub}>Opens your UPI app</Text>
      </View>
    </View>
    <View style={styles.heroFloatRow}>
      <View style={[styles.heroChip, {backgroundColor: colors.successSoft}]}>
        <Text style={[styles.heroChipText, {color: colors.successText}]}>Receipt</Text>
      </View>
      <View style={[styles.heroChip, {backgroundColor: colors.primarySoft}]}>
        <Text style={[styles.heroChipText, {color: colors.primaryDark}]}>UPI</Text>
      </View>
      <View style={[styles.heroChip, {backgroundColor: colors.indigoSoft}]}>
        <Text style={[styles.heroChipText, {color: colors.indigo}]}>Track</Text>
      </View>
    </View>
  </View>
);

export const BenefitItem = ({
  mark,
  title,
  description,
}: {
  mark: string;
  title: string;
  description?: string;
}) => (
  <View style={styles.benefitItem}>
    <View style={styles.benefitMark}>
      <Text style={styles.benefitMarkText}>{mark}</Text>
    </View>
    <View style={styles.flexOne}>
      <Text style={styles.benefitTitle}>{title}</Text>
      {description ? <Text style={styles.benefitDesc}>{description}</Text> : null}
    </View>
  </View>
);

export const ProcessStep = ({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description?: string;
}) => (
  <View style={styles.processStep}>
    <View style={styles.processNum}>
      <Text style={styles.processNumText}>{number}</Text>
    </View>
    <View style={styles.flexOne}>
      <Text style={styles.processTitle}>{title}</Text>
      {description ? <Text style={styles.processDesc}>{description}</Text> : null}
    </View>
  </View>
);

export const SettingsRow = ({
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) => {
  const body = (
    <View style={[styles.settingsRow, last ? styles.settingsRowLast : null]}>
      <View style={styles.flexOne}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {subtitle ? <Text style={styles.settingsSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) {
    return body;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flexOne: {flex: 1, minWidth: 0},
  metricCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 92,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  metricValue: {...typography.metric, color: colors.navy},
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricHint: {color: colors.textMuted, fontSize: 11, marginTop: 4},
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.subtle,
    paddingBottom: 12,
    marginBottom: 12,
  },
  detailRowLast: {borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0},
  detailLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {...typography.bodyStrong, color: colors.navy},
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  companyMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyMarkText: {color: colors.textInverse, fontWeight: '800', fontSize: 13},
  companyName: {color: colors.navy, fontWeight: '700', fontSize: 15},
  companyEmployee: {color: colors.textSecondary, fontSize: 13, marginTop: 2},
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.paper,
    gap: 12,
  },
  listTitle: {fontWeight: '700', color: colors.navy, fontSize: 15},
  listMeta: {color: colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17},
  txAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txAvatarText: {color: colors.primaryDark, fontWeight: '800', fontSize: 15},
  txRight: {alignItems: 'flex-end', gap: 6, maxWidth: 140},
  txAmount: {color: colors.navy, fontSize: 14, fontWeight: '700'},
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.muted,
  },
  receiptThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptMark: {color: colors.primary, fontWeight: '800'},
  receiptName: {...typography.bodyStrong, color: colors.navy},
  receiptMeta: {...typography.caption, color: colors.textSecondary},
  timeline: {marginTop: spacing.xs},
  timelineItem: {flexDirection: 'row', gap: spacing.md},
  timelineRail: {alignItems: 'center', width: 16},
  timelineDot: {width: 10, height: 10, borderRadius: 5, marginTop: 4},
  timelineLine: {flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4},
  timelineContent: {flex: 1},
  timelineTitle: {...typography.bodyStrong, color: colors.navy},
  timelineMeta: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  payStatusCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  payStatusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  payStatusIconText: {color: colors.textInverse, fontSize: 24, fontWeight: '800'},
  payStatusAmount: {...typography.amount, color: colors.navy},
  payStatusPayee: {...typography.bodyStrong, color: colors.text, textAlign: 'center'},
  payStatusBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  payStatusRef: {...typography.caption, color: colors.textSecondary, fontWeight: '600'},
  payStatusFootnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 11,
  },
  heroVisual: {
    backgroundColor: colors.heroStart,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    minHeight: 168,
  },
  heroBlob: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.heroMid,
  },
  heroCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroScanFrame: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    borderTopLeftRadius: 4,
  },
  heroCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    borderTopRightRadius: 4,
  },
  heroCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    borderBottomLeftRadius: 4,
  },
  heroCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  heroScanLabel: {color: colors.primary, fontWeight: '800', fontSize: 14},
  heroCardMeta: {flex: 1},
  heroCardTitle: {...typography.section, color: colors.navy},
  heroCardSub: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  heroFloatRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  heroChip: {borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6},
  heroChipText: {fontSize: 12, fontWeight: '700'},
  benefitItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  benefitMark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitMarkText: {color: colors.primary, fontWeight: '800', fontSize: 14},
  benefitTitle: {...typography.bodyStrong, color: colors.navy},
  benefitDesc: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  processStep: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  processNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processNumText: {color: colors.textInverse, fontWeight: '800', fontSize: 13},
  processTitle: {...typography.bodyStrong, color: colors.navy},
  processDesc: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.subtle,
  },
  settingsRowLast: {borderBottomWidth: 0},
  settingsTitle: {...typography.bodyStrong, color: colors.navy},
  settingsSub: {...typography.caption, color: colors.textSecondary, marginTop: 2},
});
