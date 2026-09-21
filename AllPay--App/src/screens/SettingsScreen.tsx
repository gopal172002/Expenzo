import React, {useState} from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  AppCard,
  Avatar,
  BottomSheet,
  CompanyBadge,
  IconButton,
  PreferenceRow,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  TextButton,
} from '../components/UI';
import {useAppData} from '../context/AppContext';
import type {RootStackParamList} from '../navigation';
import {colors, radius, spacing, typography} from '../theme/tokens';
import {toast} from '../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type SheetKind = 'menu' | 'contact' | 'privacy' | null;

const SUPPORT_EMAIL = 'support@allpay.in';

export const SettingsScreen = () => {
  const navigation = useNavigation<Nav>();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const {
    profile,
    locationEnabled,
    setLocationCaptureEnabled,
    installedUpiApps,
    defaultUpiAppId,
    setDefaultUpiApp,
    refreshInstalledUpiApps,
    isOnline,
    lastSyncedAt,
    queuedCount,
    retrySync,
    logout,
    transactions,
  } = useAppData();

  const firstName = profile?.employeeName?.split(/\s+/)[0] || 'there';
  const expenseCount = transactions.length;
  const pendingCount = transactions.filter(t => t.status === 'Pending Approval').length;
  const defaultApp = installedUpiApps.find(a => a.id === defaultUpiAppId);

  const closeSheet = () => setSheet(null);

  const toggleLocation = (next: boolean) => {
    if (next) {
      Alert.alert(
        'Enable location snapshot?',
        'AllPay may capture a one-time GPS snapshot when a payment is confirmed. There is no continuous or background tracking. You can turn this off anytime.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Enable',
            onPress: () => {
              setLocationCaptureEnabled(true).catch(() => null);
            },
          },
        ],
      );
      return;
    }
    setLocationCaptureEnabled(false).catch(() => null);
  };

  const handleLogout = () => {
    closeSheet();
    Alert.alert(
      'Log out of AllPay?',
      'This clears your session and local expense data on this device. Queued items that have not synced may be lost.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            logout().catch(() => toast.error('Logout failed', 'Please try again.'));
          },
        },
      ],
    );
  };

  const openContactEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=AllPay%20support`).catch(() =>
      toast.info('Contact us', `Email ${SUPPORT_EMAIL}`),
    );
  };

  return (
    <Screen safeBottom={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="AllPay"
          title="You"
          subtitle="Profile, preferences, and account"
          right={<IconButton label="☰" onPress={() => setSheet('menu')} />}
        />

        <View style={styles.profileBlock}>
          <Avatar name={profile?.employeeName} size="xl" />
          <Text style={styles.hey}>Hey, {firstName}</Text>
          <Text style={styles.heyMeta}>
            {profile?.companyName ?? 'Company'} ·{' '}
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <PrimaryButton
          label="My expenses"
          onPress={() => navigation.navigate('MainTabs', {screen: 'History'})}
          style={styles.expensesBtn}
        />

        <CompanyBadge
          companyName={profile?.companyName}
          employeeName={profile?.employeeName}
        />

        <AppCard elevated>
          <Text style={styles.cardTitle}>Your account</Text>
          <Text style={styles.cardMeta}>
            {expenseCount} expenses · {pendingCount} pending · {queuedCount} queued
          </Text>

          <View style={styles.accountGrid}>
            <View style={styles.accountTile}>
              <Text style={styles.accountLabel}>Company</Text>
              <Text style={styles.accountValue} numberOfLines={2}>
                {profile?.companyName ?? '—'}
              </Text>
              <Text style={styles.accountSub}>{profile?.department || 'Department'}</Text>
            </View>
            <View style={styles.accountTile}>
              <Text style={styles.accountLabel}>Employee</Text>
              <Text style={styles.accountValue} numberOfLines={2}>
                {profile?.employeeId || '—'}
              </Text>
              <Text style={styles.accountSub}>{profile?.mobile || 'No mobile'}</Text>
            </View>
          </View>

          <SecondaryButton
            label={isOnline ? 'Sync now' : 'Offline — will retry'}
            onPress={() => {
              retrySync().catch(() => null);
              toast.info('Sync', isOnline ? 'Syncing now…' : 'Offline — will retry later');
            }}
          />
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>Preferences</Text>
          <Text style={styles.cardMeta}>Location, UPI, and sync</Text>

          <PreferenceRow
            icon="📍"
            title="Location snapshot"
            subtitle="One-time GPS when a payment is confirmed"
            switchValue={locationEnabled}
            onSwitchChange={toggleLocation}
          />

          <Text style={styles.prefSectionLabel}>Default UPI app</Text>
          <Text style={styles.prefHint}>
            AllPay opens this app to complete the bank payment. AllPay does not settle payments
            itself.
          </Text>
          {installedUpiApps.length === 0 ? (
            <Text style={styles.prefHint}>
              No UPI app detected. Install GPay, PhonePe, Paytm, or BHIM.
            </Text>
          ) : (
            installedUpiApps.map(item => {
              const selected = defaultUpiAppId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setDefaultUpiApp(item.id)
                      .then(() => toast.success('Default UPI app', item.name))
                      .catch(() => null);
                  }}
                  style={[styles.upiChip, selected ? styles.upiChipOn : null]}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  accessibilityLabel={`${item.name}${selected ? ', selected' : ''}`}>
                  <Text style={styles.upiChipMark}>{item.logo}</Text>
                  <Text style={[styles.upiChipText, selected ? styles.upiChipTextOn : null]}>
                    {item.name}
                  </Text>
                  {selected ? <Text style={styles.upiChipCheck}>✓</Text> : null}
                </Pressable>
              );
            })
          )}
          <TextButton label="Refresh installed apps" onPress={refreshInstalledUpiApps} />

          <PreferenceRow
            icon="↻"
            title="Last sync"
            subtitle={
              [
                lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not yet',
                defaultApp?.name,
              ]
                .filter(Boolean)
                .join(' · ')
            }
            last
          />
        </AppCard>

        <AppCard>
          <PreferenceRow
            icon="💬"
            title="Contact us"
            subtitle="Email AllPay support"
            onPress={() => setSheet('contact')}
          />
          <PreferenceRow
            icon="☰"
            title="Privacy policy"
            subtitle="How AllPay uses your data"
            onPress={() => setSheet('privacy')}
          />
          <PreferenceRow
            icon="⎋"
            title="Log out"
            subtitle="Clear session on this device"
            danger
            last
            onPress={handleLogout}
          />
        </AppCard>

        <Text style={styles.versionLine}>AllPay employee app</Text>
      </ScrollView>

      <BottomSheet visible={sheet === 'menu'} onClose={closeSheet} title="Account menu">
        <PreferenceRow
          icon="💬"
          title="Contact us"
          onPress={() => setSheet('contact')}
        />
        <PreferenceRow
          icon="☰"
          title="Privacy policy"
          onPress={() => setSheet('privacy')}
        />
        <PreferenceRow
          icon="⎋"
          title="Log out"
          danger
          last
          onPress={handleLogout}
        />
      </BottomSheet>

      <BottomSheet visible={sheet === 'contact'} onClose={closeSheet} title="Contact us">
        <Text style={styles.sheetBody}>
          Need help with Scan & Pay, receipts, or reimbursement? Reach the AllPay team and we will
          get back to you.
        </Text>
        <PreferenceRow
          icon="@"
          title={SUPPORT_EMAIL}
          subtitle="Tap to open email"
          last
          onPress={openContactEmail}
        />
        <SecondaryButton
          label="Email support"
          onPress={() => {
            openContactEmail();
            closeSheet();
          }}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'privacy'}
        onClose={closeSheet}
        title="Privacy policy"
        tall>
        <ScrollView
          style={styles.privacyScroll}
          contentContainerStyle={styles.privacyScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled>
          <Text style={styles.privacyUpdated}>Last updated: 21 Sep 2026</Text>
          <Text style={styles.privacyHeading}>What AllPay collects</Text>
          <Text style={styles.sheetBody}>
            AllPay records company expense details you create in the app, including merchant name,
            amount, category, notes, receipts you attach, and payment status reported by your UPI
            app.
          </Text>
          <Text style={styles.privacyHeading}>Location</Text>
          <Text style={styles.sheetBody}>
            Location is optional. When enabled, AllPay may capture a one-time GPS snapshot at payment
            confirmation. There is no continuous or background tracking. You can turn this off in
            Preferences anytime.
          </Text>
          <Text style={styles.privacyHeading}>Payments</Text>
          <Text style={styles.sheetBody}>
            AllPay is not a UPI app. Bank payments are completed in PhonePe, Google Pay, Paytm, BHIM,
            or another installed UPI app. AllPay only records the reported result for your company
            expense claim.
          </Text>
          <Text style={styles.privacyHeading}>Who can see your data</Text>
          <Text style={styles.sheetBody}>
            Expense data syncs to your company admin dashboard so finance can review, approve,
            reject, or request more information. AllPay does not sell your personal data.
          </Text>
          <Text style={styles.privacyHeading}>Contact</Text>
          <Text style={styles.sheetBody}>
            Questions about privacy? Email {SUPPORT_EMAIL}.
          </Text>
        </ScrollView>
      </BottomSheet>
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
  profileBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  hey: {
    ...typography.title,
    color: colors.navy,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  heyMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  expensesBtn: {marginTop: 0, marginBottom: spacing.md},
  cardTitle: {...typography.section, color: colors.navy},
  cardMeta: {...typography.caption, color: colors.textSecondary, marginTop: 3, marginBottom: spacing.md},
  accountGrid: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm},
  accountTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  accountValue: {...typography.bodyStrong, color: colors.navy},
  accountSub: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  prefSectionLabel: {
    ...typography.bodyStrong,
    color: colors.navy,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  prefHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  upiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.muted,
    minHeight: 48,
  },
  upiChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  upiChipMark: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    width: 28,
    textAlign: 'center',
  },
  upiChipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  upiChipTextOn: {
    color: colors.navy,
    fontWeight: '700',
  },
  upiChipCheck: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  versionLine: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  sheetBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  privacyScroll: {maxHeight: 420},
  privacyScrollContent: {paddingBottom: spacing.lg},
  privacyUpdated: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  privacyHeading: {
    ...typography.bodyStrong,
    color: colors.navy,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
});
