import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, control, radius, shadow, spacing, typography} from '../theme/tokens';
import type {Filters} from '../types';

export type HistoryFilterState = Filters & {
  search: string;
  sync: string;
  sort: 'newest' | 'oldest' | 'amount_asc' | 'amount_desc';
};

type FilterTab = 'Sort' | 'Status' | 'Date' | 'Sync' | 'Category';

const STATUS_OPTIONS: Array<{id: Filters['status']; label: string}> = [
  {id: 'All', label: 'All'},
  {id: 'Pending Approval', label: 'Pending Approval'},
  {id: 'Approved', label: 'Approved'},
  {id: 'Rejected', label: 'Rejected'},
  {id: 'Flagged', label: 'Flagged'},
  {id: 'Abandoned', label: 'Abandoned'},
  {id: 'Recorded', label: 'Recorded'},
];

const DATE_OPTIONS: Array<{id: Filters['dateRange']; label: string}> = [
  {id: 'All', label: 'All time'},
  {id: '7d', label: 'Last 7 days'},
  {id: '30d', label: 'Last 30 days'},
];

const SYNC_OPTIONS = [
  {id: 'All', label: 'All'},
  {id: 'synced', label: 'Synced'},
  {id: 'queued', label: 'Queued'},
];

const SORT_OPTIONS: Array<{id: HistoryFilterState['sort']; label: string}> = [
  {id: 'newest', label: 'Newest first'},
  {id: 'oldest', label: 'Oldest first'},
  {id: 'amount_asc', label: 'Amount: Low to High'},
  {id: 'amount_desc', label: 'Amount: High to Low'},
];

const TABS: FilterTab[] = ['Sort', 'Status', 'Date', 'Sync', 'Category'];

export const DEFAULT_HISTORY_FILTERS: HistoryFilterState = {
  status: 'All',
  category: 'All',
  dateRange: 'All',
  search: '',
  sync: 'All',
  sort: 'newest',
};

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{selected}}
      onPress={onPress}
      style={styles.radioRow}>
      <Text style={[styles.radioLabel, selected ? styles.radioLabelOn : null]}>{label}</Text>
      <View style={[styles.radioOuter, selected ? styles.radioOuterOn : null]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

export function HistoryFilterSheet({
  visible,
  value,
  categories,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: HistoryFilterState;
  categories: string[];
  onClose: () => void;
  onApply: (next: HistoryFilterState) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [tab, setTab] = useState<FilterTab>('Sort');

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setTab('Sort');
    }
  }, [visible, value]);

  const options = useMemo(() => {
    if (tab === 'Sort') {
      return SORT_OPTIONS.map(o => ({
        id: o.id,
        label: o.label,
        selected: draft.sort === o.id,
        onSelect: () => setDraft(prev => ({...prev, sort: o.id})),
      }));
    }
    if (tab === 'Status') {
      return STATUS_OPTIONS.map(o => ({
        id: o.id,
        label: o.label,
        selected: draft.status === o.id,
        onSelect: () => setDraft(prev => ({...prev, status: o.id})),
      }));
    }
    if (tab === 'Date') {
      return DATE_OPTIONS.map(o => ({
        id: o.id,
        label: o.label,
        selected: draft.dateRange === o.id,
        onSelect: () => setDraft(prev => ({...prev, dateRange: o.id})),
      }));
    }
    if (tab === 'Sync') {
      return SYNC_OPTIONS.map(o => ({
        id: o.id,
        label: o.label,
        selected: draft.sync === o.id,
        onSelect: () => setDraft(prev => ({...prev, sync: o.id})),
      }));
    }
    return categories.map(c => ({
      id: c,
      label: c,
      selected: draft.category === c,
      onSelect: () => setDraft(prev => ({...prev, category: c})),
    }));
  }, [tab, draft, categories]);

  const sectionLabel =
    tab === 'Sort'
      ? 'SORT BY'
      : tab === 'Status'
        ? 'REIMBURSEMENT STATUS'
        : tab === 'Date'
          ? 'DATE RANGE'
          : tab === 'Sync'
            ? 'SYNC STATUS'
            : 'CATEGORY';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: Math.max(insets.top, 12)}]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close filters">
            <Text style={styles.close}>✕</Text>
          </Pressable>
          <Text style={styles.title}>Filter</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.body}>
          <View style={styles.sidebar}>
            {TABS.map(item => {
              const active = tab === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setTab(item)}
                  accessibilityRole="tab"
                  accessibilityState={{selected: active}}
                  style={[styles.sideItem, active ? styles.sideItemOn : null]}>
                  <Text style={[styles.sideText, active ? styles.sideTextOn : null]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            <Text style={styles.sectionLabel}>{sectionLabel}</Text>
            {options.map((opt, index) => (
              <View key={String(opt.id)}>
                <RadioRow label={opt.label} selected={opt.selected} onPress={opt.onSelect} />
                {index < options.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
          <Pressable
            style={styles.clearBtn}
            accessibilityRole="button"
            onPress={() =>
              setDraft(prev => ({
                ...DEFAULT_HISTORY_FILTERS,
                search: prev.search,
              }))
            }>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
          <Pressable
            style={styles.applyBtn}
            accessibilityRole="button"
            onPress={() => {
              onApply(draft);
              onClose();
            }}>
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  close: {
    fontSize: 18,
    color: colors.navy,
    fontWeight: '600',
    width: 28,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...typography.section,
    color: colors.navy,
  },
  headerSpacer: {width: 28},
  body: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sidebar: {
    width: '32%',
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.sm,
  },
  sideItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  sideItemOn: {
    backgroundColor: colors.primarySoft,
    borderRightWidth: 3,
    borderRightColor: colors.primary,
  },
  sideText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sideTextOn: {
    color: colors.primary,
    fontWeight: '800',
  },
  panel: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  panelContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
    minHeight: 52,
  },
  radioLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.navy,
    fontWeight: '400',
  },
  radioLabelOn: {
    fontWeight: '700',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
  },
  clearBtn: {
    flex: 1,
    minHeight: control.height,
    borderRadius: radius.pill,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    ...typography.button,
    color: colors.navy,
  },
  applyBtn: {
    flex: 1,
    minHeight: control.height,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  applyText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
