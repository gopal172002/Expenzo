import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
  Switch,
} from 'react-native';
import {
  accentTone,
  colors,
  control,
  radius,
  shadow,
  spacing,
  typography,
} from '../theme/tokens';
import {InfoBanner} from './feedback';

export function initialsFromName(name?: string) {
  if (!name?.trim()) {
    return 'AP';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export const Avatar = ({
  name,
  size = 'md',
  tone = 'primary',
}: {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'primary' | 'purple' | 'amber' | 'teal';
}) => {
  const dim = size === 'sm' ? 36 : size === 'lg' ? 72 : size === 'xl' ? 104 : 44;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 24 : size === 'xl' ? 34 : 15;
  const palette =
    tone === 'purple'
      ? accentTone('purple')
      : tone === 'amber'
        ? accentTone('amber')
        : tone === 'teal'
          ? accentTone('teal')
          : {bg: colors.avatarBg, fg: colors.avatarFg};
  return (
    <View
      style={[
        styles.avatar,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: palette.bg,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar for ${name}` : 'Avatar'}>
      <Text style={[styles.avatarText, {fontSize, color: palette.fg}]}>
        {initialsFromName(name)}
      </Text>
    </View>
  );
};

export const SectionHeader = ({
  title,
  actionLabel,
  onAction,
  description,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  description?: string;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.flexOne}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDesc}>{description}</Text> : null}
    </View>
    {actionLabel && onAction ? (
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        hitSlop={8}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  ...rest
}: TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.searchBar, style]}>
    <Text style={styles.searchGlyph} accessibilityElementsHidden>
      ⌕
    </Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={styles.searchInput}
      returnKeyType="search"
      clearButtonMode="while-editing"
      accessibilityLabel={placeholder}
      {...rest}
    />
  </View>
);

export const QuickAction = ({
  mark,
  label,
  hint,
  onPress,
  accent = 'primary',
}: {
  mark: string;
  label: string;
  hint?: string;
  onPress: () => void;
  accent?: 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'primary';
}) => {
  const tone = accentTone(accent);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${hint ? `, ${hint}` : ''}`}
      style={({pressed}) => [styles.quickAction, pressed ? {opacity: 0.88} : null]}>
      <View style={[styles.quickIcon, {backgroundColor: tone.bg}]}>
        <Text style={[styles.quickMark, {color: tone.fg}]}>{mark}</Text>
      </View>
      <Text style={styles.quickLabel} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={styles.quickHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
};

export const SummaryCard = ({
  label,
  value,
  hint,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
}) => {
  const bg =
    tone === 'primary'
      ? colors.primarySoft
      : tone === 'success'
        ? colors.successSoft
        : tone === 'warning'
          ? colors.warningSoft
          : tone === 'danger'
            ? colors.dangerSoft
            : colors.paper;
  const body = (
    <View style={[styles.summaryCard, {backgroundColor: bg}]}>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.summaryHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) {
    return <View style={styles.summaryWrap}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({pressed}) => [styles.summaryWrap, pressed ? {opacity: 0.92} : null]}>
      {body}
    </Pressable>
  );
};

export const PreferenceRow = ({
  title,
  subtitle,
  icon,
  right,
  onPress,
  last,
  switchValue,
  onSwitchChange,
  danger,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (next: boolean) => void;
  danger?: boolean;
}) => {
  const trailing =
    right ??
    (onSwitchChange != null ? (
      <Switch
        value={!!switchValue}
        onValueChange={onSwitchChange}
        trackColor={{false: colors.borderStrong, true: colors.primary}}
        thumbColor={colors.paper}
        accessibilityLabel={title}
      />
    ) : onPress ? (
      <Text style={styles.chevron}>›</Text>
    ) : null);

  const body = (
    <View style={[styles.prefRow, last ? styles.prefRowLast : null]}>
      {icon ? (
        <View style={[styles.prefIcon, danger ? styles.prefIconDanger : null]}>
          <Text style={[styles.prefIconText, danger ? styles.prefIconTextDanger : null]}>
            {icon}
          </Text>
        </View>
      ) : null}
      <View style={styles.flexOne}>
        <Text style={[styles.prefTitle, danger ? styles.prefTitleDanger : null]}>{title}</Text>
        {subtitle ? <Text style={styles.prefSub}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress || onSwitchChange != null) {
    return body;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </Pressable>
  );
};

export const OfflineSyncBanner = ({
  isOnline,
  queuedCount,
  lastSyncedAt,
  syncMessage,
}: {
  isOnline: boolean;
  queuedCount: number;
  lastSyncedAt?: string | null;
  syncMessage?: string | null;
}) => {
  const syncHint = lastSyncedAt
    ? `Last sync ${new Date(lastSyncedAt).toLocaleString()}`
    : 'Not synced yet';

  if (!isOnline) {
    return (
      <InfoBanner tone="offline" title="Offline mode">
        Payments save on this device and sync when you reconnect.
        {queuedCount > 0 ? ` ${queuedCount} waiting.` : ''}
      </InfoBanner>
    );
  }
  if (queuedCount > 0) {
    return (
      <InfoBanner tone="warning" title="Sync pending">
        {queuedCount} expense{queuedCount === 1 ? '' : 's'} waiting to sync. {syncHint}
      </InfoBanner>
    );
  }
  if (syncMessage) {
    return <InfoBanner tone="success">{syncMessage}</InfoBanner>;
  }
  return null;
};

export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  tall,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  tall?: boolean;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable
      style={styles.sheetBackdrop}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Dismiss">
      <Pressable
        style={[styles.sheetCard, tall ? styles.sheetCardTall : null]}
        onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeaderRow}>
          {title ? <Text style={styles.sheetTitle}>{title}</Text> : <View />}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            style={styles.sheetClose}>
            <Text style={styles.sheetCloseText}>✕</Text>
          </Pressable>
        </View>
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

export const ActionTile = ({
  title,
  subtitle,
  mark,
  onPress,
  primary,
  accent = 'blue',
}: {
  title: string;
  subtitle?: string;
  mark: string;
  onPress: () => void;
  primary?: boolean;
  accent?: 'blue' | 'green' | 'purple' | 'amber' | 'teal';
}) => {
  const tone = accentTone(accent);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({pressed}) => [
        styles.actionTile,
        primary ? styles.actionTilePrimary : null,
        pressed ? {opacity: 0.92} : null,
      ]}>
      <View
        style={[
          styles.actionTileMark,
          primary
            ? {backgroundColor: colors.primary}
            : {backgroundColor: tone.bg},
        ]}>
        <Text
          style={[
            styles.actionTileMarkText,
            primary ? {color: colors.textInverse} : {color: tone.fg},
          ]}>
          {mark}
        </Text>
      </View>
      <Text style={[styles.actionTileTitle, primary ? styles.actionTileTitleLight : null]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.actionTileSub, primary ? styles.actionTileSubLight : null]}
          numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flexOne: {flex: 1, minWidth: 0},
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.paper,
    ...shadow.soft,
  },
  avatarText: {fontWeight: '800', letterSpacing: -0.3},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {...typography.section, color: colors.navy},
  sectionDesc: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  sectionAction: {...typography.caption, color: colors.primary, fontWeight: '700'},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    minHeight: control.heightSm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchGlyph: {fontSize: 16, color: colors.textMuted, fontWeight: '600'},
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
    minHeight: control.heightSm,
  },
  quickAction: {flex: 1, alignItems: 'center', minWidth: 64},
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickMark: {fontSize: 14, fontWeight: '800'},
  quickLabel: {
    ...typography.caption,
    color: colors.navy,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickHint: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  summaryWrap: {
    flex: 1,
    minWidth: 0,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    ...shadow.card,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 10,
  },
  summaryValue: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.navy,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.subtle,
  },
  prefRowLast: {borderBottomWidth: 0},
  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefIconText: {fontSize: 14, fontWeight: '800', color: colors.primary},
  prefTitle: {...typography.bodyStrong, color: colors.navy},
  prefSub: {...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 17},
  chevron: {fontSize: 22, color: colors.textMuted, fontWeight: '400', marginTop: -2},
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
    ...shadow.elevated,
  },
  sheetCardTall: {
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sheetTitle: {...typography.section, color: colors.navy, flex: 1},
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subtle,
  },
  sheetCloseText: {fontSize: 14, fontWeight: '700', color: colors.navy},
  prefIconDanger: {backgroundColor: colors.dangerSoft},
  prefIconTextDanger: {color: colors.dangerText},
  prefTitleDanger: {color: colors.dangerText},
  actionTile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 128,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  actionTilePrimary: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  actionTileMark: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionTileMarkText: {fontSize: 13, fontWeight: '800'},
  actionTileTitle: {...typography.bodyStrong, color: colors.navy, marginBottom: 4},
  actionTileTitleLight: {color: colors.textInverse},
  actionTileSub: {...typography.caption, color: colors.textSecondary, lineHeight: 17},
  actionTileSubLight: {color: 'rgba(255,255,255,0.72)'},
});
