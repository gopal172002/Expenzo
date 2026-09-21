import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useMemo} from 'react';
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
import {paiseToRupeeLabel} from '../upi/money';
import {expenseIdForPayment} from '../upi/payment/expenseFromPayment';

type Route = RouteProp<RootStackParamList, 'PaymentResult'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export const PaymentResultScreen = () => {
  const navigation = useNavigation<Nav>();
  const {paymentId} = useRoute<Route>().params;
  const {upiPayments, applyUpiPaymentStatus, transactions, isOnline, queuedCount} = useAppData();
  const payment = useMemo(
    () => upiPayments.find(item => item.id === paymentId),
    [paymentId, upiPayments],
  );
  const expense = useMemo(
    () =>
      transactions.find(
        item => item.paymentId === paymentId || item.id === payment?.expenseId,
      ),
    [payment?.expenseId, paymentId, transactions],
  );

  if (!payment) {
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

  const amountLabel = `₹${paiseToRupeeLabel(payment.amountPaise)}`;
  const status = payment.status;

  const title =
    status === 'SUCCESS_REPORTED'
      ? 'Success reported'
      : status === 'FAILED'
        ? 'Payment failed'
        : status === 'PENDING'
          ? 'Payment pending'
          : status === 'CANCELLED'
            ? 'Payment cancelled'
            : status === 'USER_CONFIRMED'
              ? 'Recorded by you'
              : status === 'UPI_APP_OPENED'
                ? 'UPI app opened'
                : status === 'INITIATED'
                  ? 'Payment initiated'
                  : 'Status unknown';

  const subtitle =
    status === 'SUCCESS_REPORTED'
      ? 'Your UPI app reported a successful payment. AllPay recorded this expense for your company — this is not an independent bank settlement confirmation.'
      : status === 'FAILED'
        ? 'The bank or UPI app declined this payment. No expense was added. You can try again with another UPI app or a merchant QR.'
        : status === 'PENDING'
          ? 'The UPI app reported that this transaction is still pending. Do not pay again unless you know the first attempt failed.'
          : status === 'CANCELLED'
            ? 'The UPI app was closed before a result was returned. No expense was added.'
            : status === 'USER_CONFIRMED'
              ? 'You confirmed this payment manually. This is not a UPI success callback — finance may ask for proof.'
              : status === 'UPI_APP_OPENED'
                ? 'Your UPI app was opened. Complete the payment there, then return. Opening the app alone does not mean the payment succeeded.'
                : status === 'INITIATED'
                  ? 'Payment was created but the UPI app has not returned a result yet.'
                  : "We could not determine the result. If money left your account, record the expense below — otherwise try again.";

  const openExpense = () => {
    const id = expense?.id ?? expenseIdForPayment(payment.id);
    navigation.replace('TransactionDetail', {transactionId: id});
  };

  const recordManuallyLabel =
    status === 'UPI_APP_OPENED' || status === 'UNKNOWN' || status === 'INITIATED'
      ? 'I paid — record expense'
      : 'Record manually';

  const expenseStatus = expense?.status ?? 'Not created yet';

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={title} subtitle={payment.payeeName} />
        <PaymentStatusCard
          amount={amountLabel}
          payee={payment.payeeName}
          status={status}
          explanation={subtitle}
          reference={
            status === 'SUCCESS_REPORTED'
              ? maskRef(payment.upiTxnId ?? payment.upiTxnRef)
              : undefined
          }
        />

        <Section title="What this means">
          <Text style={styles.body}>
            <Text style={styles.strong}>Payment status</Text> is what your UPI app reported to
            AllPay.
          </Text>
          <Text style={[styles.body, styles.bodySpaced]}>
            <Text style={styles.strong}>Expense / reimbursement</Text>: {expenseStatus}. Finance
            decides approval later — a recorded payment is not an approved claim.
          </Text>
        </Section>

        {!isOnline ? (
          <InfoBanner tone="offline" title="Offline result">
            This result is saved on your device
            {queuedCount > 0 ? ` (${queuedCount} queued)` : ''}. It will sync to your company
            account when you reconnect.
          </InfoBanner>
        ) : null}

        {status === 'SUCCESS_REPORTED' || status === 'USER_CONFIRMED' ? (
          <>
            <PrimaryButton label="View expense" onPress={openExpense} />
            <SecondaryButton label="Add receipt" onPress={openExpense} />
          </>
        ) : null}

        {status === 'FAILED' || status === 'CANCELLED' ? (
          <PrimaryButton
            label="Retry payment"
            onPress={() =>
              navigation.replace('Payment', {
                merchant: {
                  vpa: payment.payeeVpa,
                  name: payment.payeeName,
                  category: payment.category,
                  mcc: payment.mcc,
                  amountPaise: payment.amountPaise,
                  note: payment.note,
                },
              })
            }
          />
        ) : null}

        {status === 'UNKNOWN' ||
        status === 'PENDING' ||
        status === 'UPI_APP_OPENED' ||
        status === 'INITIATED' ? (
          <>
            <PrimaryButton
              label={recordManuallyLabel}
              onPress={async () => {
                await applyUpiPaymentStatus(payment.id, 'USER_CONFIRMED');
              }}
            />
            <SecondaryButton
              label={status === 'PENDING' ? 'Keep pending' : 'Return to Home'}
              onPress={() => navigation.popToTop()}
            />
          </>
        ) : (
          <SecondaryButton label="Return to Home" onPress={() => navigation.popToTop()} />
        )}
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
