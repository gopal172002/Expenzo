import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Alert, Platform, ScrollView, StyleSheet, Text} from 'react-native';
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
import {trackUpiEvent} from '../upi/analytics';
import {isSaneAmountPaise, paiseToRupeeLabel, parseRupeeInputToPaise} from '../upi/money';
import {buildUpiPayUri, isPersonalP2pPayment} from '../upi/scanner/UpiQrParser';
import {
  detectIosPaymentUpiApps,
  hasCompatibleUpiApp,
  launchUpiIntent,
} from '../upi/payment/UpiPaymentLauncher';
import {detectInstalledUpiApps} from '../services/upiApps';
import {
  mapUpiResultToStatus,
  parseUpiPaymentResult,
} from '../upi/payment/UpiPaymentResultParser';

type Route = RouteProp<RootStackParamList, 'Payment'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function pickUpiApp(
  apps: Array<{id: string; name: string}>,
  preferredId: string | null,
): Promise<string | null> {
  if (apps.length === 0) {
    return Promise.resolve(null);
  }
  if (apps.length === 1) {
    return Promise.resolve(apps[0].id);
  }
  return new Promise(resolve => {
    const preferred = preferredId
      ? apps.find(app => app.id === preferredId)
      : undefined;
    const ordered = preferred
      ? [preferred, ...apps.filter(app => app.id !== preferred.id)]
      : apps;
    Alert.alert(
      'Pay with',
      'Choose a UPI app. For personal UPI IDs, PhonePe or Google Pay often work when Paytm is blocked.',
      [
        ...ordered.map(app => ({
          text: app.name,
          onPress: () => resolve(app.id),
        })),
        {text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null)},
      ],
      {cancelable: true, onDismiss: () => resolve(null)},
    );
  });
}

export const PaymentScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {merchant} = route.params;
  const {
    profile,
    policies,
    transactions,
    defaultUpiAppId,
    locationEnabled,
    installedUpiApps,
    createUpiPayment,
    markUpiAppOpened,
    applyUpiPaymentStatus,
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

  const defaultAppName =
    installedUpiApps.find(a => a.id === defaultUpiAppId)?.name ?? 'your UPI app';

  const continuePayment = async (parsedPaise: number) => {
    if (paying || !profile) {
      return;
    }
    setPaying(true);
    try {
      setStatusMessage('Saving payment...');
      const payment = await createUpiPayment({
        payeeVpa: merchant.vpa,
        payeeName: merchant.name,
        amountPaise: parsedPaise,
        note: merchant.note,
        category: merchant.category,
        mcc: merchant.mcc,
      });
      trackUpiEvent('upi_payment_confirmed');

      const uri = buildUpiPayUri({
        payeeVpa: merchant.vpa,
        payeeName: merchant.name,
        amountPaise: parsedPaise,
        note: merchant.note,
        merchantTransactionRef: merchant.qrTransactionRef,
        merchantCategoryCode: merchant.merchantCategoryCode,
        baseSanitizedUri: merchant.sanitizedUri,
      });

      const hasApp = await hasCompatibleUpiApp(uri);
      if (!hasApp) {
        await applyUpiPaymentStatus(payment.id, 'CANCELLED');
        toast.error(
          'No UPI app',
          'Install Google Pay, PhonePe, Paytm, or BHIM, then try again.',
        );
        navigation.replace('PaymentResult', {paymentId: payment.id});
        return;
      }

      let preferredAppId = defaultUpiAppId;
      const installedApps =
        Platform.OS === 'ios'
          ? await detectIosPaymentUpiApps()
          : (await detectInstalledUpiApps()).map(app => ({id: app.id, name: app.name}));

      if (installedApps.length === 0) {
        await applyUpiPaymentStatus(payment.id, 'CANCELLED');
        toast.error(
          'No UPI app',
          'Install Google Pay, PhonePe, Paytm, or BHIM, then try again.',
        );
        navigation.replace('PaymentResult', {paymentId: payment.id});
        return;
      }

      const defaultAvailable =
        defaultUpiAppId && installedApps.some(app => app.id === defaultUpiAppId);
      if (defaultAvailable) {
        preferredAppId = defaultUpiAppId;
      } else if (installedApps.some(app => app.id === 'paytm')) {
        preferredAppId = 'paytm';
      } else if (installedApps.length > 1) {
        const chosen = await pickUpiApp(installedApps, defaultUpiAppId);
        if (!chosen) {
          await applyUpiPaymentStatus(payment.id, 'CANCELLED');
          trackUpiEvent('upi_result_cancelled');
          navigation.replace('PaymentResult', {paymentId: payment.id});
          return;
        }
        preferredAppId = chosen;
      } else {
        preferredAppId = installedApps[0].id;
      }

      if (personalP2p && Platform.OS === 'ios') {
        await markUpiAppOpened(payment.id);
        trackUpiEvent('upi_app_launched');
        navigation.replace('PaymentQrPay', {
          paymentId: payment.id,
          upiUri: uri,
          preferredAppId: preferredAppId ?? 'paytm',
        });
        return;
      }

      await markUpiAppOpened(payment.id);
      setStatusMessage('Opening UPI app...');
      trackUpiEvent('upi_app_launched');
      const launch = await launchUpiIntent(uri, {preferredAppId, personalP2p});

      if (launch.kind === 'no_app') {
        await applyUpiPaymentStatus(payment.id, 'CANCELLED');
        toast.error(
          'No UPI app',
          'Install Google Pay, PhonePe, Paytm, or BHIM, then try again.',
        );
      } else if (launch.kind === 'cancelled') {
        await applyUpiPaymentStatus(payment.id, 'CANCELLED');
        trackUpiEvent('upi_result_cancelled');
      } else if (launch.kind === 'unsupported') {
        await applyUpiPaymentStatus(payment.id, 'UNKNOWN');
      } else if (launch.kind === 'opened') {
        trackUpiEvent('upi_result_unknown');
        if (personalP2p) {
          toast.info(
            'Complete payment in UPI app',
            'If SBI shows risk policy after PIN, return and use Scan to pay.',
          );
        } else {
          toast.info(
            'Complete payment in UPI app',
            'After PIN, return here if status is unknown.',
          );
        }
      } else {
        const parsed = parseUpiPaymentResult(launch.raw);
        const mapped = mapUpiResultToStatus(parsed, merchant.qrTransactionRef);
        await applyUpiPaymentStatus(payment.id, mapped, {
          upiTxnId: parsed.transactionId ?? undefined,
          upiTxnRef: parsed.transactionReference ?? undefined,
          approvalRefNo: parsed.approvalReference ?? undefined,
          upiResponseCode: parsed.responseCode ?? undefined,
        });
        if (mapped === 'SUCCESS_REPORTED') {
          trackUpiEvent('upi_result_success');
        } else if (mapped === 'FAILED') {
          trackUpiEvent('upi_result_failed');
          if (personalP2p) {
            toast.error(
              'Bank declined auto-pay',
              'SBI often blocks third-party UPI intents to personal IDs. Scan the payment QR in Paytm instead.',
            );
            navigation.replace('PaymentQrPay', {
              paymentId: payment.id,
              upiUri: uri,
              preferredAppId: preferredAppId ?? 'paytm',
            });
            return;
          }
          toast.error(
            'UPI app reported failure',
            'Try Google Pay or PhonePe, or a shop merchant QR.',
          );
        } else if (mapped === 'PENDING') {
          trackUpiEvent('upi_result_pending');
        } else {
          trackUpiEvent('upi_result_unknown');
        }
      }
      navigation.replace('PaymentResult', {paymentId: payment.id});
    } finally {
      setPaying(false);
      setStatusMessage(null);
    }
  };

  const onConfirm = async () => {
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
      ? `Pay ₹${paiseToRupeeLabel(displayPaise)} with UPI`
      : 'Continue to UPI';

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={profile?.companyName}
          title="Confirm payment"
          subtitle="Review details, then AllPay opens your UPI app. Your PIN is entered only in that app."
        />

        <InfoBanner tone="info" title="External UPI payment">
          AllPay will open {defaultAppName} (or let you choose). Opening the app is not the same as
          a successful bank payment — the result is recorded when the UPI app reports it.
        </InfoBanner>

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
          <DetailRow
            label="Selected UPI app"
            value={defaultUpiAppId ? defaultAppName : 'Choose when paying'}
          />
          <DetailRow
            label="Location snapshot"
            value={
              locationEnabled
                ? 'Enabled — one-time capture after confirmation'
                : 'Off — enable in Settings if finance requires it'
            }
          />
          <DetailRow
            label="Payment type"
            value={personalP2p ? 'Personal UPI ID' : 'Merchant / shop QR'}
            last
          />
          {personalP2p ? (
            <Text style={styles.helpText}>
              Personal UPI: auto-pay may fail on some banks after PIN. If that happens, use Scan to
              pay inside your UPI app.
            </Text>
          ) : null}
        </Section>

        <PrimaryButton
          label={paying ? 'Opening UPI…' : payLabel}
          onPress={onConfirm}
          disabled={paying}
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
  helpText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
  },
});
