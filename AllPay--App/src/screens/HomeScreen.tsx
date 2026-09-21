import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  ActionTile,
  AppCard,
  AppLogo,
  Avatar,
  EmptyState,
  FadeIn,
  OfflineSyncBanner,
  PrimaryButton,
  QuickAction,
  Screen,
  SectionHeader,
  SummaryCard,
  TransactionRow,
} from '../components/UI';
import {useAppData} from '../context/AppContext';
import {RootStackParamList} from '../navigation';
import {colors, radius, spacing, typography} from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatInr = (n: number) =>
  `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

const TABS = ['Overview', 'Pay', 'Activity', 'Sync'] as const;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const {
    profile,
    transactions,
    syncMessage,
    isOnline,
    lastSyncedAt,
    queuedCount,
    retrySync,
    policies,
    locationEnabled,
  } = useAppData();

  const latest = transactions.slice(0, 5);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const monthSpend = useMemo(
    () =>
      transactions
        .filter(item => new Date(item.timestamp).getTime() >= monthStart)
        .reduce((sum, item) => sum + item.amount, 0),
    [monthStart, transactions],
  );

  const pendingReimbursement = useMemo(
    () =>
      transactions
        .filter(item => item.status === 'Pending Approval')
        .reduce((sum, item) => sum + (item.reimbursementAmount ?? item.amount), 0),
    [transactions],
  );

  const needsInfo = useMemo(
    () =>
      transactions.filter(
        item =>
          item.status === 'Flagged' ||
          (item.status === 'Recorded' && item.receipts.length === 0),
      ),
    [transactions],
  );

  const syncHint = lastSyncedAt
    ? `Synced ${new Date(lastSyncedAt).toLocaleDateString()}`
    : 'Not synced yet';

  const firstName = profile?.employeeName?.split(' ')[0] ?? 'there';

  return (
    <Screen safeBottom={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <AppLogo size="sm" />
              <View style={styles.brandText}>
                <Text style={styles.brandTitle}>AllPay</Text>
                <Text style={styles.brandSub} numberOfLines={1}>
                  Hi, {firstName}
                  {profile?.companyName ? ` · ${profile.companyName}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.topActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() => navigation.navigate('MainTabs', {screen: 'Settings'})}
                hitSlop={4}>
                <Avatar name={profile?.employeeName} size="sm" />
              </Pressable>
            </View>
          </View>

          <OfflineSyncBanner
            isOnline={isOnline}
            queuedCount={queuedCount}
            lastSyncedAt={lastSyncedAt}
            syncMessage={syncMessage}
          />

          <View style={styles.indexRow}>
            <SummaryCard
              label="This month"
              value={formatInr(monthSpend)}
              hint="Spend"
              tone="primary"
            />
            <SummaryCard
              label="Pending"
              value={formatInr(pendingReimbursement)}
              hint="Claims"
              tone={pendingReimbursement > 0 ? 'warning' : 'success'}
              onPress={() => navigation.navigate('MainTabs', {screen: 'History'})}
            />
            <SummaryCard
              label="Attention"
              value={String(needsInfo.length)}
              hint={needsInfo.length ? 'Action needed' : 'All clear'}
              tone={needsInfo.length > 0 ? 'danger' : 'success'}
            />
          </View>

          <View style={styles.tabRow} accessibilityRole="tablist">
            {TABS.map(item => {
              const active = tab === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setTab(item)}
                  accessibilityRole="tab"
                  accessibilityState={{selected: active}}
                  style={styles.tabItem}>
                  <Text style={[styles.tabText, active ? styles.tabTextOn : null]}>{item}</Text>
                  {active ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineGhost} />}
                </Pressable>
              );
            })}
          </View>

          {(tab === 'Overview' || tab === 'Pay') && (
            <>
              <SectionHeader title="Quick actions" />
              <View style={styles.quickRow}>
                <QuickAction
                  mark="QR"
                  label="Scan"
                  hint="Pay"
                  accent="blue"
                  onPress={() => navigation.navigate('Scan')}
                />
                <QuickAction
                  mark="≡"
                  label="History"
                  hint={`${transactions.length}`}
                  accent="teal"
                  onPress={() => navigation.navigate('MainTabs', {screen: 'History'})}
                />
                <QuickAction
                  mark="₹"
                  label="Pending"
                  hint={formatInr(pendingReimbursement)}
                  accent="amber"
                  onPress={() => navigation.navigate('MainTabs', {screen: 'History'})}
                />
                <QuickAction
                  mark="↻"
                  label="Sync"
                  hint={isOnline ? 'Online' : 'Off'}
                  accent="green"
                  onPress={() => retrySync()}
                />
              </View>

              <SectionHeader
                title="Scan & pay"
                description="AllPay opens your installed UPI app — it does not settle the bank payment."
              />
              <View style={styles.grid}>
                <ActionTile
                  primary
                  mark="QR"
                  title="Scan & Pay"
                  subtitle="Merchant QR → open UPI"
                  onPress={() => navigation.navigate('Scan')}
                />
                <ActionTile
                  mark="≡"
                  title="Expense history"
                  subtitle={`${transactions.length} records`}
                  accent="blue"
                  onPress={() => navigation.navigate('MainTabs', {screen: 'History'})}
                />
                <ActionTile
                  mark="₹"
                  title="Pending claims"
                  subtitle={
                    pendingReimbursement > 0
                      ? `${formatInr(pendingReimbursement)} awaiting`
                      : 'All clear'
                  }
                  accent="amber"
                  onPress={() => navigation.navigate('MainTabs', {screen: 'History'})}
                />
                <ActionTile
                  mark="···"
                  title="Profile & policy"
                  subtitle={`${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}`}
                  accent="purple"
                  onPress={() => navigation.navigate('MainTabs', {screen: 'Settings'})}
                />
              </View>
            </>
          )}

          {(tab === 'Overview' || tab === 'Activity') && (
            <>
              <SectionHeader
                title="Recent expenses"
                actionLabel="See all"
                onAction={() => navigation.navigate('MainTabs', {screen: 'History'})}
              />

              <AppCard style={styles.listCard} padded>
                {needsInfo.length > 0 ? (
                  <View style={styles.needsBanner}>
                    <Text style={styles.needsTitle}>{needsInfo.length} need attention</Text>
                    <Text style={styles.needsSub}>Add receipts or missing details</Text>
                  </View>
                ) : null}

                {latest.length === 0 ? (
                  <EmptyState
                    title="No expenses yet"
                    description="Scan a merchant QR to record your first company payment. AllPay will open your UPI app to complete the bank transfer."
                    action={
                      <PrimaryButton
                        label="Scan & Pay"
                        onPress={() => navigation.navigate('Scan')}
                      />
                    }
                  />
                ) : (
                  latest.map(item => (
                    <TransactionRow
                      key={item.id}
                      merchant={item.merchant.name}
                      amount={formatInr(item.amount)}
                      date={new Date(item.timestamp).toLocaleDateString()}
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
            </>
          )}

          {(tab === 'Overview' || tab === 'Sync') && (
            <AppCard elevated>
              <Text style={styles.syncTitle}>Sync & privacy</Text>
              <Text style={styles.syncLine}>
                {isOnline ? 'Online' : 'Offline'} · {syncHint}
                {queuedCount > 0 ? ` · ${queuedCount} queued` : ''}
              </Text>
              <Text style={styles.syncLine}>
                Location: {locationEnabled ? 'One-time snapshot on' : 'Off'}
              </Text>
              {policies.length > 0 ? (
                <Text style={styles.syncLine}>
                  {policies.length} compan{policies.length === 1 ? 'y' : 'ies'} polic
                  {policies.length === 1 ? 'y' : 'ies'} active
                </Text>
              ) : null}
              {queuedCount > 0 ? (
                <PrimaryButton label="Sync now" onPress={() => retrySync()} />
              ) : null}
            </AppCard>
          )}
        </FadeIn>
      </ScrollView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0},
  brandText: {flex: 1, minWidth: 0},
  brandTitle: {...typography.titleSm, color: colors.navy},
  brandSub: {...typography.caption, color: colors.textSecondary, marginTop: 1},
  topActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  indexRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xs,
    minHeight: 44,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    paddingBottom: 10,
    textAlign: 'center',
  },
  tabTextOn: {color: colors.navy, fontWeight: '800'},
  tabUnderline: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: -1,
  },
  tabUnderlineGhost: {alignSelf: 'stretch', height: 3, marginBottom: -1},
  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  listCard: {
    backgroundColor: colors.muted,
    marginBottom: spacing.md,
  },
  needsBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  needsTitle: {...typography.caption, fontWeight: '800', color: colors.warningText},
  needsSub: {...typography.caption, color: colors.warningText, marginTop: 2},
  syncTitle: {...typography.section, color: colors.navy, marginBottom: spacing.sm},
  syncLine: {...typography.caption, color: colors.textSecondary, lineHeight: 19, marginBottom: 2},
});
