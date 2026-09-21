import React, {useEffect, useRef} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {
  colors,
  motion,
  paymentStatusLabel,
  radius,
  shadow,
  spacing,
  statusTone,
  typography,
} from '../theme/tokens';
import {DangerButton, PrimaryButton, SecondaryButton} from './layout';

export const StatusBadge = ({
  status,
  label,
}: {
  status: string;
  label?: string;
}) => {
  const tone = statusTone(status);
  const text = label ?? (status.includes('_') ? paymentStatusLabel(status) : status);
  return (
    <View
      style={[styles.badge, {backgroundColor: tone.bg, borderColor: tone.border}]}
      accessibilityLabel={`Status: ${text}`}>
      <View style={[styles.badgeDot, {backgroundColor: tone.fg}]} />
      <Text style={[styles.badgeText, {color: tone.fg}]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
};

export const StatusPill = StatusBadge;

export const InfoBanner = ({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'offline';
  title?: string;
  children: React.ReactNode;
  icon?: string;
}) => {
  const map = {
    info: {
      bg: colors.infoSoft,
      border: colors.infoBorder,
      fg: colors.infoText,
      mark: 'i',
    },
    success: {
      bg: colors.successSoft,
      border: colors.successBorder,
      fg: colors.successText,
      mark: '✓',
    },
    warning: {
      bg: colors.warningSoft,
      border: colors.warningBorder,
      fg: colors.warningText,
      mark: '!',
    },
    danger: {
      bg: colors.dangerSoft,
      border: colors.dangerBorder,
      fg: colors.dangerText,
      mark: '×',
    },
    offline: {
      bg: colors.offlineSoft,
      border: colors.offlineBorder,
      fg: colors.offline,
      mark: '⌀',
    },
  }[tone];
  return (
    <View style={[styles.banner, {backgroundColor: map.bg, borderColor: map.border}]}>
      <View style={[styles.bannerIcon, {backgroundColor: map.fg}]}>
        <Text style={styles.bannerIconText}>{icon ?? map.mark}</Text>
      </View>
      <View style={styles.flexOne}>
        {title ? <Text style={[styles.bannerTitle, {color: map.fg}]}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={[styles.bannerBody, {color: map.fg}]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
};

export const Callout = InfoBanner;

export const PolicyWarning = ({message}: {message: string}) => (
  <InfoBanner tone="warning" title="Policy notice">
    {message}
  </InfoBanner>
);

export const EmptyState = ({
  title,
  description,
  action,
  icon = '◇',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
}) => (
  <View style={styles.emptyState} accessibilityRole="text">
    <View style={styles.emptyIcon}>
      <Text style={styles.emptyIconText}>{icon}</Text>
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {description ? <Text style={styles.emptyDesc}>{description}</Text> : null}
    {action ? <View style={styles.emptyAction}>{action}</View> : null}
  </View>
);

export const LoadingState = ({label = 'Loading…'}: {label?: string}) => (
  <View style={styles.loadingState} accessibilityLabel={label}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingLabel}>{label}</Text>
  </View>
);

export const ErrorState = ({
  title = 'Something went wrong',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) => <EmptyState title={title} description={description} action={action} icon="!" />;

export const Skeleton = ({
  height = 16,
  width = '100%' as const,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled || reduce) {
        return;
      }
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
          Animated.timing(opacity, {toValue: 0.4, duration: 700, useNativeDriver: true}),
        ]),
      ).start();
    });
    return () => {
      cancelled = true;
    };
  }, [opacity]);
  return (
    <Animated.View
      style={[styles.skeleton, {height, width: width as any, opacity}, style]}
    />
  );
};

export const StepProgress = ({
  steps,
  activeIndex,
}: {
  steps: Array<{key: string; label: string}>;
  activeIndex: number;
}) => (
  <View style={styles.stepper} accessibilityRole="progressbar">
    {steps.map((item, index) => {
      const done = index < activeIndex;
      const active = index === activeIndex;
      return (
        <React.Fragment key={item.key}>
          {index > 0 ? (
            <View style={[styles.stepLine, index <= activeIndex ? styles.stepLineActive : null]} />
          ) : null}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                done || active ? styles.stepDotActive : null,
                done ? styles.stepDotDone : null,
              ]}>
              <Text
                style={[
                  styles.stepNumber,
                  done || active ? styles.stepNumberActive : null,
                ]}>
                {done ? '✓' : index + 1}
              </Text>
            </View>
            <Text
              style={[styles.stepLabel, done || active ? styles.stepLabelActive : null]}
              numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

export const ConfirmationModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalBody}>{message}</Text>
        <View style={styles.modalActions}>
          <SecondaryButton label={cancelLabel} onPress={onCancel} style={styles.modalBtn} />
          {danger ? (
            <DangerButton label={confirmLabel} onPress={onConfirm} />
          ) : (
            <PrimaryButton label={confirmLabel} onPress={onConfirm} style={styles.modalBtn} />
          )}
        </View>
      </View>
    </View>
  </Modal>
);

export const FadeIn = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled) {
        return;
      }
      if (reduce) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.normal,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.normal,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [delay, opacity, translateY]);
  return (
    <Animated.View style={{opacity, transform: [{translateY}]}}>{children}</Animated.View>
  );
};

const styles = StyleSheet.create({
  flexOne: {flex: 1, minWidth: 0},
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    maxWidth: 220,
  },
  badgeDot: {width: 6, height: 6, borderRadius: 3},
  badgeText: {fontSize: 12, fontWeight: '700'},
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  bannerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bannerIconText: {color: colors.textInverse, fontSize: 12, fontWeight: '800'},
  bannerTitle: {fontSize: 13, fontWeight: '700', marginBottom: 3},
  bannerBody: {fontSize: 13, lineHeight: 19, fontWeight: '500'},
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIconText: {fontSize: 22, color: colors.primary, fontWeight: '700'},
  emptyTitle: {...typography.bodyStrong, color: colors.navy, textAlign: 'center'},
  emptyDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyAction: {marginTop: spacing.md, alignSelf: 'stretch'},
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  loadingLabel: {...typography.caption, color: colors.textSecondary},
  skeleton: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  stepItem: {flex: 1, alignItems: 'center', gap: 6},
  stepLine: {
    width: 16,
    height: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 18,
  },
  stepLineActive: {backgroundColor: colors.primary},
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {borderColor: colors.primary, backgroundColor: colors.primary},
  stepDotDone: {backgroundColor: colors.success, borderColor: colors.success},
  stepNumber: {color: colors.textSecondary, fontSize: 12, fontWeight: '700'},
  stepNumberActive: {color: colors.textInverse},
  stepLabel: {color: colors.textSecondary, fontSize: 11, fontWeight: '600'},
  stepLabelActive: {color: colors.navy, fontWeight: '700'},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: spacing.page,
  },
  modalCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.elevated,
  },
  modalTitle: {...typography.titleSm, color: colors.navy, marginBottom: spacing.sm},
  modalBody: {...typography.body, color: colors.textSecondary, marginBottom: spacing.lg},
  modalActions: {gap: spacing.xs},
  modalBtn: {marginTop: spacing.xs},
});
