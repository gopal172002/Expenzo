import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  ErrorState,
  InfoBanner,
  PaymentStatusCard,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  Section,
} from '../components/UI';
import {useAppData} from '../context/AppContext';
import {RootStackParamList} from '../navigation';
import {colors, spacing} from '../theme/tokens';
import {maskRef} from '../upi/mask';
import {
  fetchMerchantPaymentStatus,
  isCollectedPayment,
  sleep,
} from '../services/razorpayMerchantPay';
import {explainPaymentStatus} from '../services/paymentStatusCopy';
import {toast} from '../utils/toast';
import type {Transaction} from '../types';

type Route = RouteProp<RootStackParamList, 'PaymentResult'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function isFinishedStatus(status: string, shopPayoutEnabled: boolean): boolean {
  if (
    status === 'payout_processed' ||
    status === 'refunded' ||
    status === 'payment_failed' ||
    status === 'payout_failed' ||
    status === 'refund_initiated'
  ) {
    return true;
  }
  return status === 'payment_captured' && !shopPayoutEnabled;
}

export const PaymentResultScreen = () => {
  const navigation = useNavigation<Nav>();
  const {paymentId} = useRoute<Route>().params;
  const {transactions, patchTransaction, isOnline} = useAppData();
  const [polling, setPolling] = useState(false);
  const [shopPayoutEnabled, setShopPayoutEnabled] = useState(false);
  const [checkingRetry, setCheckingRetry] = useState(false);

  const expense = useMemo(
    () => transactions.find(item => item.id === paymentId || item.paymentId === paymentId),
    [paymentId, transactions],
  );

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const tick = async () => {
      setPolling(true);
      while (!cancelled && Date.now() - started < 45000) {
        try {
          const latest = await fetchMerchantPaymentStatus(paymentId);
          if (cancelled) {
            return;
          }
          const payoutOn = latest.shopPayoutEnabled === true;
          setShopPayoutEnabled(payoutOn);
          await patchTransaction(paymentId, {
            paymentStatus: latest.paymentStatus as Transaction['paymentStatus'],
            razorpayPaymentId: latest.razorpayPaymentId ?? undefined,
            upiRefId: latest.payoutUtr ?? latest.razorpayPaymentId ?? undefined,
            paymentFailedReason: latest.payoutFailedReason ?? undefined,
          });
          if (isFinishedStatus(latest.paymentStatus, payoutOn)) {
            break;
          }
        } catch {
          break;
        }
        await sleep(2000);
      }
      if (!cancelled) {
        setPolling(false);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId, patchTransaction]);

  if (!expense) {
    return (
      <Screen safeTop={false}>
        <View style={styles.centered}>
          <ErrorState
            title="Payment not found"
            description="This payment may have been cleared from local storage."
            action={
              <SecondaryButton label="Back to Home" onPress={() => navigation.popToTop()} />
            }
          />
        </View>
      </Screen>
    );
  }

  const status = expense.paymentStatus ?? 'order_created';
  const copy = explainPaymentStatus(status, shopPayoutEnabled);
  const amountLabel = `₹${Number(expense.amount).toLocaleString('en-IN')}`;
  const collected = isCollectedPayment(status);
  const failed =
    status === 'payment_failed' ||
    status === 'payout_failed' ||
    status === 'refunded' ||
    status === 'payment_abandoned';

  const onRetry = async () => {
    setCheckingRetry(true);
    try {
      const latest = await fetchMerchantPaymentStatus(expense.id);
      setShopPayoutEnabled(latest.shopPayoutEnabled === true);
      await patchTransaction(expense.id, {
        paymentStatus: latest.paymentStatus as Transaction['paymentStatus'],
        razorpayPaymentId: latest.razorpayPaymentId ?? undefined,
        upiRefId: latest.payoutUtr ?? latest.razorpayPaymentId ?? undefined,
        paymentFailedReason: latest.payoutFailedReason ?? undefined,
      });
      if (isCollectedPayment(latest.paymentStatus)) {
        toast.info(
          latest.paymentStatus === 'payout_processed' ? 'Already paid' : 'Already captured',
          'This order is already paid. A new Pay would charge you again.',
        );
        return;
      }
    } catch {
      /* start a new collect only if we cannot confirm a prior capture */
    } finally {
      setCheckingRetry(false);
    }
    navigation.replace('Payment', {merchant: expense.merchant});
  };

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={copy.title} subtitle={expense.merchant.name} />
        <PaymentStatusCard
          amount={amountLabel}
          payee={expense.merchant.name}
          status={status}
          explanation={`${copy.hop1} ${copy.hop2}`}
          reference={collected ? maskRef(expense.upiRefId || expense.razorpayPaymentId) : undefined}
        />

        <Section title="What happened">
          <Text style={styles.body}>
            <Text style={styles.strong}>You → AllPay</Text> {copy.hop1}
          </Text>
          <Text style={[styles.body, styles.bodySpaced]}>
            <Text style={styles.strong}>AllPay → shop {expense.merchant.vpa}</Text> {copy.hop2}
          </Text>
          {expense.paymentFailedReason ? (
            <Text style={[styles.body, styles.bodySpaced]}>{expense.paymentFailedReason}</Text>
          ) : null}
        </Section>

        {polling ? (
          <InfoBanner tone="warning" title="Checking Razorpay">
            Confirming whether AllPay already received this payment, then whether the shop was paid.
          </InfoBanner>
        ) : null}

        {!isOnline ? (
          <InfoBanner tone="offline" title="Offline">
            This device is offline. Status will refresh when you reconnect.
          </InfoBanner>
        ) : null}

        {collected ? (
          <>
            <PrimaryButton
              label="View expense"
              onPress={() => navigation.replace('TransactionDetail', {transactionId: expense.id})}
            />
            <SecondaryButton
              label="Add receipt"
              onPress={() => navigation.replace('TransactionDetail', {transactionId: expense.id})}
            />
          </>
        ) : null}

        {failed && !collected ? (
          <PrimaryButton
            label={checkingRetry ? 'Checking…' : 'Pay again'}
            onPress={() => {
              void onRetry();
            }}
            disabled={checkingRetry}
            loading={checkingRetry}
          />
        ) : null}

        <SecondaryButton label="Return to Home" onPress={() => navigation.popToTop()} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.page,
    paddingBottom: 28,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.page,
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: 14,
  },
  bodySpaced: {
    marginTop: 8,
  },
  strong: {
    fontWeight: '700',
    color: colors.navy,
  },
});
