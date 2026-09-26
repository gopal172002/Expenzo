import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet} from 'react-native';
import {COMPANY_AMOUNT_LIMIT} from '../constants/mockData';
import {
  AppTextInput,
  DetailRow,
  InfoBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  Section,
} from '../components/UI';
import {useAppData} from '../context/AppContext';
import {RootStackParamList} from '../navigation';
import {colors, spacing} from '../theme/tokens';
import {getPolicyWarningFromPolicies} from '../utils/policies';
import {toast} from '../utils/toast';
import {isSaneAmountPaise, paiseToRupeeLabel, parseRupeeInputToPaise} from '../upi/money';
import {isPersonalP2pPayment} from '../upi/scanner/UpiQrParser';
import {createUuid} from '../upi/id';
import {capturePaymentLocationSnapshot} from '../services/locationSnapshot';
import {
  buildMerchantCheckoutOptions,
  checkoutErrorMessage,
  confirmMerchantPayment,
  createMerchantOrder,
  fetchMerchantPaymentStatus,
  isCheckoutSettled,
  isCollectedPayment,
  markMerchantCheckoutOpened,
  openMerchantCheckout,
  type MerchantPaymentStatus,
} from '../services/razorpayMerchantPay';
import type {Transaction} from '../types';

type Route = RouteProp<RootStackParamList, 'Payment'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export const PaymentScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {merchant} = route.params;
  const {
    profile,
    policies,
    transactions,
    locationEnabled,
    upsertTransaction,
    patchTransaction,
  } = useAppData();

  const qrLockedPaise = merchant.amountPaise;
  const [amountText, setAmountText] = useState(
    qrLockedPaise !== undefined ? paiseToRupeeLabel(qrLockedPaise) : '',
  );
  const [paying, setPaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const personalP2p = isPersonalP2pPayment({
    payeeVpa: merchant.vpa,
    merchantCategoryCode: merchant.merchantCategoryCode,
    baseSanitizedUri: merchant.sanitizedUri,
  });

  const applySettledPayment = async (
    txId: string,
    settled: MerchantPaymentStatus,
    fallbackPaymentId?: string,
  ) => {
    const collected = isCollectedPayment(settled.paymentStatus);
    await patchTransaction(txId, {
      paymentStatus: settled.paymentStatus as Transaction['paymentStatus'],
      razorpayPaymentId: settled.razorpayPaymentId ?? fallbackPaymentId,
      upiRefId: settled.payoutUtr ?? settled.razorpayPaymentId ?? fallbackPaymentId,
      paymentFailedReason: settled.payoutFailedReason ?? undefined,
      paymentConfirmedAt: new Date().toISOString(),
      syncStatus: collected ? 'synced' : 'queued',
    });

    if (settled.paymentStatus === 'payout_processed') {
      toast.info('Shop paid', 'You paid AllPay. AllPay paid this shop.');
    } else if (settled.paymentStatus === 'payout_initiated') {
      toast.info('Paying the shop', 'You paid AllPay. Shop payout is in progress.');
    } else if (settled.paymentStatus === 'payment_captured') {
      toast.info(
        'AllPay received payment',
        settled.shopPayoutEnabled
          ? 'Razorpay captured your payment. Shop payout is still in progress.'
          : 'Razorpay captured your payment. The shop was not paid — RazorpayX is not connected.',
      );
    } else if (settled.paymentStatus === 'refunded') {
      toast.error('Refunded', 'The shop was not paid. Your payment to AllPay was refunded.');
    } else if (settled.paymentStatus === 'payout_failed') {
      toast.error('Shop payout failed', settled.payoutFailedReason || 'AllPay could not pay the shop.');
    } else if (settled.paymentStatus === 'payment_failed') {
      toast.error('Payment failed', settled.payoutFailedReason || 'Razorpay did not take money from you.');
    } else if (settled.payoutFailedReason) {
      toast.error('Shop payout failed', settled.payoutFailedReason);
    }
  };

  const recoverClosedCheckout = async (txId: string) => {
    try {
      const latest = await fetchMerchantPaymentStatus(txId);
      if (isCheckoutSettled(latest.paymentStatus)) {
        await applySettledPayment(txId, latest);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const goToResult = (txId: string) => {
    navigation.replace('PaymentResult', {paymentId: txId});
  };

  const continuePayment = async (parsedPaise: number) => {
    if (paying || !profile) {
      return;
    }
    if (personalP2p) {
      toast.error(
        'Personal UPI not supported',
        'AllPay only pays merchant / shop QRs. Ask for a business QR.',
      );
      return;
    }

    setPaying(true);
    const txId = createUuid();
    const amountRupees = Number(paiseToRupeeLabel(parsedPaise));
    try {
      setStatusMessage('Creating payment to AllPay...');
      const order = await createMerchantOrder({
        txId,
        amount: amountRupees,
        employeeId: profile.employeeId,
        merchant: {
          vpa: merchant.vpa,
          name: merchant.name,
          category: merchant.category,
          mcc: merchant.mcc || merchant.merchantCategoryCode || '',
          ...(merchant.amount != null ? {amount: merchant.amount} : {}),
        },
      });
      const draft: Transaction = {
        id: txId,
        employeeId: profile.employeeId,
        merchant,
        amount: amountRupees,
        amountPaise: parsedPaise,
        timestamp: new Date().toISOString(),
        upiApp: 'Razorpay',
        status: 'Recorded',
        syncStatus: 'queued',
        receipts: [],
        location: null,
        paymentStatus: 'order_created',
        razorpayOrderId: order.orderId,
        orderAmountPaise: order.amount,
        paymentMethod: 'razorpay_merchant_payout',
        expenseSource: 'ALLPAY_MERCHANT_PAYOUT',
      };
      await upsertTransaction(draft);

      await markMerchantCheckoutOpened(txId);
      setStatusMessage('Open Razorpay to pay AllPay...');
      const opened = await openMerchantCheckout(
        buildMerchantCheckoutOptions({
          key: order.keyId,
          amount: String(order.amount),
          currency: order.currency,
          name: 'AllPay',
          description: `Pay ${merchant.name}`,
          orderId: order.orderId,
          employeeName: profile.employeeName,
          contact: profile.mobile,
          themeColor: colors.navy,
        }),
        txId,
      );

      if (opened.source === 'synced') {
        await applySettledPayment(txId, opened.status, opened.status.razorpayPaymentId ?? undefined);
        goToResult(txId);
        return;
      }

      const checkout = opened.checkout;
      const snapshot = await capturePaymentLocationSnapshot(locationEnabled);
      setStatusMessage('Confirming payment to AllPay...');
      const confirmed = await confirmMerchantPayment({
        txId,
        razorpay_order_id: checkout.razorpay_order_id,
        razorpay_payment_id: checkout.razorpay_payment_id,
        razorpay_signature: checkout.razorpay_signature,
        location: snapshot.location,
      });
      await applySettledPayment(txId, confirmed, checkout.razorpay_payment_id);
      await patchTransaction(txId, {location: snapshot.location});
      goToResult(txId);
    } catch (error) {
      const message = checkoutErrorMessage(error);
      setStatusMessage('Checking if Razorpay already collected this payment...');
      const recovered = await recoverClosedCheckout(txId);
      if (recovered) {
        goToResult(txId);
        return;
      }
      if (/already paid|order is already paid|trouble completing/i.test(message)) {
        toast.info('Checking payment', 'Razorpay may already have this order. Confirming with AllPay.');
        await patchTransaction(txId, {paymentStatus: 'payment_processing'});
      } else if (/cancelled|backpressed|dismiss/i.test(message) || /user closed|user cancelled/i.test(message)) {
        toast.info(
          'Checkout closed',
          'If Razorpay already captured this order, AllPay will mark it paid. Otherwise no money was taken.',
        );
        await patchTransaction(txId, {paymentStatus: 'payment_abandoned'});
      } else {
        toast.error('Payment failed', message);
        await patchTransaction(txId, {
          paymentStatus: 'payment_failed',
          paymentFailedReason: message,
        });
      }
      goToResult(txId);
    } finally {
      setPaying(false);
      setStatusMessage(null);
    }
  };

  const onConfirm = async () => {
    if (personalP2p) {
      Alert.alert(
        'Personal UPI not supported',
        'AllPay only records merchant / shop payments. Ask for a business QR with a merchant category.',
      );
      return;
    }
    const parsedPaise =
      qrLockedPaise !== undefined ? qrLockedPaise : parseRupeeInputToPaise(amountText);
    if (parsedPaise === null) {
      toast.error('Invalid amount', 'Enter a valid amount in rupees.');
      return;
    }
    if (!isSaneAmountPaise(parsedPaise)) {
      toast.error('Invalid amount', 'Amount must be between ₹1.00 and ₹1,00,000.00.');
      return;
    }

    const warning =
      profile && policies.length
        ? getPolicyWarningFromPolicies(
            Number(paiseToRupeeLabel(parsedPaise)),
            merchant.category,
            profile.employeeId,
            profile.department,
            policies,
            transactions,
          )
        : null;

    if (parsedPaise > COMPANY_AMOUNT_LIMIT * 100) {
      toast.info(
        'Limit warning',
        `Amount exceeds company threshold of INR ${COMPANY_AMOUNT_LIMIT}.`,
      );
    }

    if (warning) {
      Alert.alert('Policy warning', warning, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Proceed anyway', onPress: () => continuePayment(parsedPaise)},
      ]);
      return;
    }
    await continuePayment(parsedPaise);
  };

  const displayPaise =
    qrLockedPaise !== undefined ? qrLockedPaise : parseRupeeInputToPaise(amountText);
  const payLabel =
    displayPaise && isSaneAmountPaise(displayPaise)
      ? `Pay ₹${paiseToRupeeLabel(displayPaise)} via Razorpay`
      : 'Continue to Razorpay';

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={profile?.companyName}
          title="Confirm merchant payment"
          subtitle="You pay AllPay through Razorpay. The shop is paid only if RazorpayX is connected."
        />

        <InfoBanner tone="info" title="Merchant payment">
          Step 1: you pay AllPay in Razorpay. When AllPay receives that money, Razorpay closes and
          this app shows success — even if the shop is not paid yet.
          Step 2: AllPay pays this shop only when RAZORPAYX_ACCOUNT_NUMBER is set on the server.
          If the payment fails, Razorpay also closes and this app shows the failure.
        </InfoBanner>

        {personalP2p ? (
          <InfoBanner tone="warning" title="Personal UPI ID">
            This QR is a personal account. AllPay only pays merchant / shop QRs.
          </InfoBanner>
        ) : null}

        {statusMessage ? (
          <InfoBanner tone="warning" title="Working…">
            {statusMessage}
          </InfoBanner>
        ) : null}

        <Section title="Merchant">
          <DetailRow label="Name" value={merchant.name} />
          <DetailRow label="UPI ID (VPA)" value={merchant.vpa} />
          <DetailRow label="Category" value={merchant.category || '—'} />
          <DetailRow
            label="MCC"
            value={merchant.mcc || merchant.merchantCategoryCode || '—'}
            last={!merchant.note}
          />
          {merchant.note ? <DetailRow label="Note" value={merchant.note} last /> : null}
        </Section>

        <Section title="Amount">
          <AppTextInput
            label="Amount (INR)"
            value={amountText}
            onChangeText={text => {
              if (qrLockedPaise !== undefined) {
                return;
              }
              if (text === '' || /^\d+(\.\d{0,2})?$/.test(text)) {
                setAmountText(text);
              }
            }}
            editable={qrLockedPaise === undefined}
            keyboardType="decimal-pad"
            placeholder="Enter amount in INR"
            helper={
              qrLockedPaise !== undefined
                ? 'Amount is fixed by the merchant QR.'
                : `Company threshold warning at ₹${COMPANY_AMOUNT_LIMIT.toLocaleString('en-IN')}`
            }
            style={styles.amountInput}
          />
        </Section>

        <Section title="Before you pay">
          <DetailRow label="You pay" value="AllPay (Razorpay checkout)" />
          <DetailRow label="Shop receives" value="Only after RazorpayX payout to this VPA" />
          <DetailRow label="Shop UPI" value={merchant.vpa} />
          <DetailRow
            label="Location snapshot"
            value={
              locationEnabled
                ? 'Enabled — one-time capture after confirmation'
                : 'Off — enable in Settings if finance requires it'
            }
            last
          />
        </Section>

        <PrimaryButton
          label={paying ? 'Processing…' : payLabel}
          onPress={onConfirm}
          disabled={paying || personalP2p}
          loading={paying}
        />
        <SecondaryButton label="Cancel" onPress={() => navigation.goBack()} disabled={paying} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.page,
    paddingBottom: 24,
    flexGrow: 1,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
  },
});
