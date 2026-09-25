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
import {fetchMerchantPaymentStatus} from '../services/razorpayMerchantPay';

type Route = RouteProp<RootStackParamList, 'PaymentResult'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const RESULT_COPY: Record<string, {title: string; body: string}> = {
  payout_processed: {
    title: 'Shop paid',
    body: 'Razorpay confirmed your payment to AllPay, and AllPay paid this merchant. Finance can now review the expense.',
  },
  payment_captured: {
    title: 'Payment received',
    body: 'Razorpay confirmed your payment to AllPay. Shop payout is skipped until RazorpayX is available.',
  },
  payout_initiated: {
    title: 'Paying the shop',
    body: 'AllPay has started the UPI payout to this merchant. This usually completes in a few seconds.',
  },
  payment_processing: {
    title: 'Confirming payment',
    body: 'Razorpay is confirming your checkout. AllPay will pay the shop as soon as it is captured.',
  },
  order_created: {
    title: 'Order created',
    body: 'Checkout did not finish. No money was taken from you and the shop was not paid.',
  },
  checkout_opened: {
    title: 'Checkout opened',
    body: 'Razorpay was opened but the payment did not complete.',
  },
  payment_abandoned: {
    title: 'Payment cancelled',
    body: 'You closed Razorpay before paying. No expense was added.',
  },
  payment_failed: {
    title: 'Payment failed',
    body: 'Razorpay could not collect the payment. The shop was not paid.',
  },
  payout_failed: {
    title: 'Shop payout failed',
    body: 'AllPay received your money but could not pay the shop. A refund should follow.',
  },
  refund_initiated: {
    title: 'Refund started',
    body: 'The shop payout failed. AllPay is refunding your Razorpay payment.',
  },
  refunded: {
    title: 'Refunded',
    body: 'The shop was not paid. Your payment to AllPay has been refunded.',
  },
};

export const PaymentResultScreen = () => {
  const navigation = useNavigation<Nav>();
  const {paymentId} = useRoute<Route>().params;
  const {transactions, patchTransaction, isOnline} = useAppData();
  const [polling, setPolling] = useState(false);

  const expense = useMemo(
    () => transactions.find(item => item.id === paymentId || item.paymentId === paymentId),
    [paymentId, transactions],
  );

  useEffect(() => {
    if (!expense) {
      return;
    }
    const status = expense.paymentStatus;
    if (
      status === 'payout_processed' ||
      status === 'payment_captured' ||
      status === 'refunded' ||
      status === 'payment_failed' ||
      status === 'payment_abandoned'
    ) {
      return;
    }
    let cancelled = false;
    setPolling(true);
    void fetchMerchantPaymentStatus(paymentId)
      .then(async latest => {
        if (cancelled) {
          return;
        }
        await patchTransaction(paymentId, {
          paymentStatus: latest.paymentStatus as NonNullable<typeof expense.paymentStatus>,
          razorpayPaymentId: latest.razorpayPaymentId ?? expense.razorpayPaymentId,
          upiRefId: latest.payoutUtr ?? expense.upiRefId,
          paymentFailedReason: latest.payoutFailedReason ?? expense.paymentFailedReason,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setPolling(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [expense, paymentId, patchTransaction]);

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
  const copy = RESULT_COPY[status] ?? {
    title: 'Payment update',
    body: 'AllPay is updating this merchant payment.',
  };
  const amountLabel = `₹${Number(expense.amount).toLocaleString('en-IN')}`;
  const success = status === 'payout_processed' || status === 'payment_captured';
  const failed =
    status === 'payment_failed' ||
    status === 'payout_failed' ||
    status === 'refunded' ||
    status === 'payment_abandoned';

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={copy.title} subtitle={expense.merchant.name} />
        <PaymentStatusCard
          amount={amountLabel}
          payee={expense.merchant.name}
          status={status}
          explanation={copy.body}
          reference={success ? maskRef(expense.upiRefId) : undefined}
        />

        <Section title="What happened">
          <Text style={styles.body}>
            <Text style={styles.strong}>You → AllPay</Text> via Razorpay checkout.
          </Text>
          <Text style={[styles.body, styles.bodySpaced]}>
            <Text style={styles.strong}>AllPay → shop</Text> {expense.merchant.vpa} via instant UPI
            payout.
          </Text>
          {expense.paymentFailedReason ? (
            <Text style={[styles.body, styles.bodySpaced]}>{expense.paymentFailedReason}</Text>
          ) : null}
        </Section>

        {polling ? (
          <InfoBanner tone="warning" title="Checking shop payout">
            Refreshing status from AllPay.
          </InfoBanner>
        ) : null}

        {!isOnline ? (
          <InfoBanner tone="offline" title="Offline">
            This device is offline. Status will refresh when you reconnect.
          </InfoBanner>
        ) : null}

        {success ? (
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

        {failed ? (
          <PrimaryButton
            label="Retry payment"
            onPress={() => navigation.replace('Payment', {merchant: expense.merchant})}
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
