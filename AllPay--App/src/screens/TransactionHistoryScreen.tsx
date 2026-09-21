import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useMemo, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppCard,
  EmptyState,
  FilterChip,
  InfoBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SearchBar,
  Skeleton,
  TextButton,
  TransactionRow,
} from '../components/UI';
import {
  DEFAULT_HISTORY_FILTERS,
  HistoryFilterSheet,
  type HistoryFilterState,
} from '../components/HistoryFilterSheet';
import {useAppData} from '../context/AppContext';
import {RootStackParamList} from '../navigation';
import {colors, spacing, typography} from '../theme/tokens';
import {Transaction} from '../types';
import {paiseToRupeeLabel} from '../upi/money';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const applyFilters = (items: Transaction[], filters: HistoryFilterState): Transaction[] => {
  const now = Date.now();
  const q = filters.search.trim().toLowerCase();
  const filtered = items.filter(item => {
    const statusOk = filters.status === 'All' || item.status === filters.status;
    const categoryOk =
      filters.category === 'All' || item.merchant.category === filters.category;
    const dateMs = new Date(item.timestamp).getTime();
    const dateOk =
      filters.dateRange === 'All' ||
      (filters.dateRange === '7d' && now - dateMs <= 7 * 24 * 60 * 60 * 1000) ||
      (filters.dateRange === '30d' && now - dateMs <= 30 * 24 * 60 * 60 * 1000);
    const syncOk =
      filters.sync === 'All' ||
      (filters.sync === 'queued' && item.syncStatus === 'queued') ||
      (filters.sync === 'synced' && item.syncStatus === 'synced');
    const searchOk =
      !q ||
      item.merchant.name.toLowerCase().includes(q) ||
      item.merchant.vpa?.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.upiRefId ?? '').toLowerCase().includes(q);
    return statusOk && categoryOk && dateOk && syncOk && searchOk;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === 'amount_asc') {
      return a.amount - b.amount;
    }
    if (filters.sort === 'amount_desc') {
      return b.amount - a.amount;
    }
    if (filters.sort === 'oldest') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
};

function countActiveFilters(filters: HistoryFilterState) {
  let n = 0;
  if (filters.status !== 'All') {
    n += 1;
  }
  if (filters.dateRange !== 'All') {
    n += 1;
  }
  if (filters.sync !== 'All') {
    n += 1;
  }
  if (filters.category !== 'All') {
    n += 1;
  }
  if (filters.sort !== 'newest') {
    n += 1;
  }
  return n;
}

export const TransactionHistoryScreen = () => {
  const navigation = useNavigation<Nav>();
  const {transactions, upiPayments, retrySync} = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<HistoryFilterState>(DEFAULT_HISTORY_FILTERS);

  const categories = useMemo(
    () => ['All', ...new Set(transactions.map(item => item.merchant.category))],
    [transactions],
  );
  const filtered = useMemo(() => applyFilters(transactions, filters), [filters, transactions]);
  const activeFilterCount = countActiveFilters(filters);

  const unresolved = upiPayments.filter(
    item =>
      item.status === 'UNKNOWN' ||
      item.status === 'PENDING' ||
      item.status === 'UPI_APP_OPENED' ||
      item.status === 'INITIATED',
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await retrySync();
    } finally {
      setRefreshing(false);
    }
  }, [retrySync]);

  const quickChips = [
    {
      id: 'All',
      label: 'All',
      active: filters.status === 'All' && filters.dateRange === 'All',
      onPress: () => setFilters(prev => ({...prev, status: 'All', dateRange: 'All'})),
    },
    {
      id: 'Pending Approval',
      label: 'Pending',
      active: filters.status === 'Pending Approval',
      onPress: () => setFilters(prev => ({...prev, status: 'Pending Approval'})),
    },
    {
      id: 'Approved',
      label: 'Approved',
      active: filters.status === 'Approved',
      onPress: () => setFilters(prev => ({...prev, status: 'Approved'})),
    },
    {
      id: '7d',
      label: '7 days',
      active: filters.dateRange === '7d',
      onPress: () => setFilters(prev => ({...prev, dateRange: '7d'})),
    },
  ];

  return (
    <Screen safeBottom={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        <ScreenHeader
          eyebrow="AllPay"
          title="Expense history"
          subtitle="Payment records and reimbursement status for your company account."
        />

        <SearchBar
          value={filters.search}
          onChangeText={text => setFilters(prev => ({...prev, search: text}))}
          placeholder="Search merchant, VPA, or reference"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}>
          <FilterChip
            label={activeFilterCount > 0 ? `Filter · ${activeFilterCount}` : 'Filter'}
            active={activeFilterCount > 0}
            onPress={() => setFilterOpen(true)}
          />
          {quickChips.map(chip => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              active={chip.active}
              onPress={chip.onPress}
            />
          ))}
        </ScrollView>

        {unresolved.length ? (
          <AppCard elevated>
            <Text style={styles.cardTitle}>Unresolved UPI</Text>
            <InfoBanner tone="warning" title="Not bank-verified">
              Opening a UPI app is not a successful payment. AllPay only records what was reported.
              Check status or record manually if you already paid.
            </InfoBanner>
            {unresolved.map(item => (
              <TransactionRow
                key={item.id}
                merchant={item.payeeName}
                amount={`₹${paiseToRupeeLabel(item.amountPaise)}`}
                date={`UPI · ${item.status.replace(/_/g, ' ').toLowerCase()}`}
                paymentStatus={item.status}
                onPress={() => navigation.navigate('PaymentResult', {paymentId: item.id})}
              />
            ))}
          </AppCard>
        ) : null}

        <AppCard elevated>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Expenses ({filtered.length})</Text>
            {activeFilterCount > 0 ? (
              <TextButton
                label="Clear filters"
                onPress={() =>
                  setFilters(prev => ({
                    ...DEFAULT_HISTORY_FILTERS,
                    search: prev.search,
                  }))
                }
              />
            ) : null}
          </View>

          {refreshing && filtered.length === 0 ? (
            <View>
              <Skeleton height={72} />
              <Skeleton height={72} />
              <Skeleton height={72} />
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={transactions.length === 0 ? 'No expenses yet' : 'No matching expenses'}
              description={
                transactions.length === 0
                  ? 'Scan a merchant QR to record your first company payment. AllPay opens your UPI app to complete the bank transfer.'
                  : 'Try clearing filters, or scan a merchant QR to record a payment.'
              }
              action={
                <PrimaryButton
                  label={transactions.length === 0 ? 'Scan & Pay' : 'Clear filters'}
                  onPress={() => {
                    if (transactions.length === 0) {
                      navigation.navigate('Scan');
                      return;
                    }
                    setFilters(DEFAULT_HISTORY_FILTERS);
                  }}
                />
              }
            />
          ) : (
            filtered.map(item => (
              <TransactionRow
                key={item.id}
                merchant={item.merchant.name}
                amount={`₹${item.amount.toFixed(2)}`}
                date={new Date(item.timestamp).toLocaleString()}
                category={item.merchant.category}
                syncLabel={item.syncStatus === 'queued' ? 'Queued' : 'Synced'}
                hasReceipt={item.receipts.length > 0}
                hasLocation={!!item.location}
                reimbursementStatus={item.status}
                onPress={() =>
                  navigation.navigate('TransactionDetail', {transactionId: item.id})
                }
              />
            ))
          )}
        </AppCard>
      </ScrollView>

      <HistoryFilterSheet
        visible={filterOpen}
        value={filters}
        categories={categories}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  chipScroll: {
    marginHorizontal: -spacing.page,
    marginBottom: spacing.md,
    flexGrow: 0,
  },
  chipRow: {
    paddingHorizontal: spacing.page,
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: {...typography.section, color: colors.navy, marginBottom: spacing.sm},
});
