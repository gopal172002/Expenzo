import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {Edge} from 'react-native-safe-area-context';
import {
  colors,
  control,
  motion,
  radius,
  shadow,
  spacing,
  typography,
} from '../theme/tokens';

type ScreenProps = {
  children: React.ReactNode;
  safeBottom?: boolean;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Screen = ({
  children,
  safeBottom = true,
  safeTop = true,
  style,
}: ScreenProps) => {
  const edges: ReadonlyArray<Edge> = [
    ...(safeTop ? (['top'] as const) : []),
    'right',
    'left',
    ...(safeBottom ? (['bottom'] as const) : []),
  ];
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
};

export const PageContainer = Screen;

export const AppLogo = ({
  size = 'md',
  showWordmark = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}) => {
  const dim = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 22 : 16;
  return (
    <View style={styles.logoRow} accessibilityRole="image" accessibilityLabel="AllPay">
      <View
        style={[
          styles.logoMark,
          {
            width: dim,
            height: dim,
            borderRadius: size === 'lg' ? radius.lg : radius.md,
          },
        ]}>
        <Text style={[styles.logoMarkText, {fontSize}]}>AP</Text>
      </View>
      {showWordmark ? (
        <View>
          <Text style={styles.logoWord}>AllPay</Text>
          <Text style={styles.logoTag}>Company expenses</Text>
        </View>
      ) : null}
    </View>
  );
};

export const BrandHeader = ({
  subtitle,
  compact,
}: {
  subtitle?: string;
  compact?: boolean;
}) => (
  <View style={[styles.brandHeader, compact ? styles.brandHeaderCompact : null]}>
    <AppLogo size={compact ? 'sm' : 'md'} showWordmark />
    {subtitle ? <Text style={styles.brandSubtitle}>{subtitle}</Text> : null}
  </View>
);

export const ScreenHeader = ({
  title,
  subtitle,
  eyebrow,
  right,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: React.ReactNode;
}) => (
  <View style={styles.headerWrap}>
    <View style={styles.headerTextCol}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
);

export const AppCard = ({
  children,
  style,
  padded = true,
  elevated = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
}) => (
  <View
    style={[
      styles.card,
      elevated ? shadow.elevated : shadow.card,
      padded ? styles.cardPadded : null,
      style,
    ]}>
    {children}
  </View>
);

export const Section = ({
  title,
  children,
  description,
  action,
  flat,
}: {
  title?: string;
  children: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  flat?: boolean;
}) => (
  <View style={[styles.section, flat ? styles.sectionFlat : null]}>
    {title || action ? (
      <View style={styles.sectionHeader}>
        <View style={styles.flexOne}>
          {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
          {description ? <Text style={styles.sectionDesc}>{description}</Text> : null}
        </View>
        {action}
      </View>
    ) : null}
    {children}
  </View>
);

export const BottomActionBar = ({children}: {children: React.ReactNode}) => (
  <View style={styles.bottomBar}>{children}</View>
);

type ButtonBaseProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const PrimaryButton = ({
  label,
  onPress,
  disabled,
  loading,
  style,
}: ButtonBaseProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{disabled: !!(disabled || loading)}}
    android_ripple={disabled ? undefined : {color: colors.primaryDark}}
    style={({pressed}) => [
      styles.primaryBtn,
      pressed && !disabled ? styles.primaryBtnPressed : null,
      disabled || loading ? styles.btnDisabled : null,
      style,
    ]}
    onPress={onPress}
    disabled={disabled || loading}>
    {loading ? (
      <ActivityIndicator color={colors.textInverse} />
    ) : (
      <Text style={styles.primaryBtnText} numberOfLines={1}>
        {label}
      </Text>
    )}
  </Pressable>
);

export const SecondaryButton = ({
  label,
  onPress,
  disabled,
  loading,
  style,
}: ButtonBaseProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{disabled: !!(disabled || loading)}}
    android_ripple={disabled ? undefined : {color: colors.primaryMuted}}
    style={({pressed}) => [
      styles.secondaryBtn,
      pressed && !disabled ? styles.secondaryBtnPressed : null,
      disabled || loading ? styles.btnDisabled : null,
      style,
    ]}
    onPress={onPress}
    disabled={disabled || loading}>
    {loading ? (
      <ActivityIndicator color={colors.primary} />
    ) : (
      <Text style={styles.secondaryBtnText} numberOfLines={1}>
        {label}
      </Text>
    )}
  </Pressable>
);

export const TextButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={({pressed}) => [
      styles.textBtn,
      pressed ? {opacity: 0.7} : null,
      disabled ? styles.btnDisabled : null,
    ]}>
    <Text style={styles.textBtnLabel}>{label}</Text>
  </Pressable>
);

export const DangerButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    style={({pressed}) => [
      styles.dangerBtn,
      pressed ? {opacity: 0.9} : null,
      disabled ? styles.btnDisabled : null,
    ]}
    onPress={onPress}
    disabled={disabled}>
    <Text style={styles.dangerBtnText} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

/** Pill Continue used on soft auth screens (invite / mobile). */
export const SoftContinueButton = ({
  label = 'Continue',
  onPress,
  disabled,
  loading,
  ready,
}: ButtonBaseProps & {ready?: boolean}) => {
  const inactive = disabled || loading || !ready;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !!inactive}}
      style={({pressed}) => [
        styles.softContinue,
        inactive ? styles.softContinueInactive : styles.softContinueActive,
        pressed && !inactive ? {opacity: 0.9} : null,
      ]}
      onPress={onPress}
      disabled={!!inactive}>
      {loading ? (
        <ActivityIndicator color={inactive ? colors.textMuted : colors.textInverse} />
      ) : (
        <Text
          style={[
            styles.softContinueText,
            inactive ? styles.softContinueTextInactive : styles.softContinueTextActive,
          ]}
          numberOfLines={1}>
          {label.includes('→') ? label : `${label} →`}
        </Text>
      )}
    </Pressable>
  );
};

export const IconButton = ({
  label,
  onPress,
  disabled,
  active,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    disabled={disabled}
    style={({pressed}) => [
      styles.iconBtn,
      active ? styles.iconBtnActive : null,
      pressed ? {opacity: 0.85} : null,
      disabled ? styles.btnDisabled : null,
    ]}>
    <Text style={[styles.iconBtnText, active ? styles.iconBtnTextActive : null]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.page},
  flexOne: {flex: 1, minWidth: 0},
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  logoMark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  logoMarkText: {color: colors.textInverse, fontWeight: '800'},
  logoWord: {...typography.titleSm, color: colors.navy},
  logoTag: {...typography.caption, color: colors.textSecondary, marginTop: 1},
  brandHeader: {marginBottom: spacing.xl},
  brandHeaderCompact: {marginBottom: spacing.md},
  brandSubtitle: {...typography.caption, color: colors.textSecondary, marginTop: spacing.sm},
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerTextCol: {flex: 1, minWidth: 0},
  eyebrow: {
    ...typography.label,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  headerTitle: {...typography.title, color: colors.navy},
  headerSubtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardPadded: {padding: spacing.lg},
  section: {
    backgroundColor: colors.paper,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionFlat: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {...typography.section, color: colors.navy},
  sectionDesc: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  bottomBar: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  primaryBtn: {
    minHeight: control.height,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadow.soft,
  },
  primaryBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{scale: motion.pressScale}],
  },
  primaryBtnText: {...typography.button, color: colors.textInverse, flexShrink: 1},
  secondaryBtn: {
    minHeight: control.heightSm,
    borderRadius: radius.md,
    borderColor: colors.primaryBorder,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.primarySoft,
  },
  secondaryBtnPressed: {backgroundColor: colors.primaryMuted},
  secondaryBtnText: {...typography.button, color: colors.primary, flexShrink: 1},
  textBtn: {paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs},
  textBtnLabel: {...typography.bodyStrong, color: colors.primary},
  dangerBtn: {
    minHeight: control.heightSm,
    borderRadius: radius.md,
    borderColor: colors.dangerBorder,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.dangerSoft,
  },
  dangerBtnText: {...typography.button, color: colors.dangerText},
  iconBtn: {
    minHeight: control.iconButton,
    minWidth: control.iconButton,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  iconBtnActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  iconBtnText: {...typography.caption, color: colors.textSecondary, fontWeight: '700'},
  iconBtnTextActive: {color: colors.primary},
  btnDisabled: {opacity: 0.45},
  softContinue: {
    minHeight: 54,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softContinueInactive: {
    backgroundColor: colors.subtle,
  },
  softContinueActive: {
    backgroundColor: colors.primary,
    ...shadow.soft,
  },
  softContinueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  softContinueTextInactive: {
    color: colors.textMuted,
  },
  softContinueTextActive: {
    color: colors.textInverse,
  },
});
