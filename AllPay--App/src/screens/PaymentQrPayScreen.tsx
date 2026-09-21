import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  ErrorState,
  InfoBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  Section,
} from '../components/UI';
import {useAppData} from '../context/AppContext';
import {RootStackParamList} from '../navigation';
import {toast} from '../utils/toast';
import {paiseToRupeeLabel} from '../upi/money';
import {
  launchUpiIntent,
  openUpiAppHome,
  upiQrImageUrl,
} from '../upi/payment/UpiPaymentLauncher';
import {colors, radius, shadow, spacing} from '../theme/tokens';

type Route = RouteProp<RootStackParamList, 'PaymentQrPay'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const APP_LABEL: Record<string, string> = {
  paytm: 'Paytm',
  phonepe: 'PhonePe',
  gpay: 'Google Pay',
  bhim: 'BHIM',
};

export const PaymentQrPayScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {paymentId, upiUri, preferredAppId} = route.params;
  const {upiPayments, applyUpiPaymentStatus, markUpiAppOpened} = useAppData();
  const payment = upiPayments.find(item => item.id === paymentId);
  const [opening, setOpening] = useState(false);

  const appId = preferredAppId ?? 'paytm';
  const appName = APP_LABEL[appId] ?? 'UPI app';

  useEffect(() => {
    openUpiAppHome(appId).catch(() => undefined);
  }, [appId]);

  if (!payment) {
    return (
      <Screen safeTop={false}>
        <View style={styles.centered}>
          <ErrorState title="Payment not found" />
        </View>
      </Screen>
    );
  }

  const onOpenApp = async () => {
    setOpening(true);
    try {
      const result = await openUpiAppHome(appId);
      if (result.kind === 'no_app') {
        toast.error('App not found', `Install ${appName} and try again.`);
      }
    } finally {
      setOpening(false);
    }
  };

  const onTryAutoPay = async () => {
    setOpening(true);
    try {
      await markUpiAppOpened(payment.id);
      const launch = await launchUpiIntent(upiUri, {
        preferredAppId: appId,
        personalP2p: true,
      });
      if (launch.kind === 'no_app') {
        toast.error('No UPI app', `Install ${appName} and try again.`);
        return;
      }
      toast.info(
        'Auto-fill opened',
        'If SBI shows risk policy after PIN, come back and scan the QR above in Paytm instead.',
      );
      navigation.replace('PaymentResult', {paymentId: payment.id});
    } finally {
      setOpening(false);
    }
  };

  const onConfirmPaid = async () => {
    await applyUpiPaymentStatus(payment.id, 'USER_CONFIRMED');
    navigation.replace('PaymentResult', {paymentId: payment.id});
  };

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Scan to pay"
          subtitle={`${payment.payeeName} · ₹${paiseToRupeeLabel(payment.amountPaise)}`}
        />

        <InfoBanner tone="info" title="Why scan instead of auto-pay?">
          SBI and other banks often block auto-fill links to personal UPI IDs with “UPI risk
          policy” after PIN. Scanning this QR inside {appName} is the same as scanning the person’s
          original QR — that path works.
        </InfoBanner>

        <Section title="Payment QR">
          <View style={styles.qrWrap}>
            <Image
              source={{uri: upiQrImageUrl(upiUri, 260)}}
              style={styles.qrImage}
              accessibilityLabel="Payment QR code"
            />
          </View>
          <Text style={styles.steps}>
            1. Open {appName} → Scan & Pay{'\n'}
            2. Scan this QR on your screen{'\n'}
            3. Confirm amount → enter PIN{'\n'}
            4. Return here → tap I paid — record expense
          </Text>
        </Section>

        <PrimaryButton
          label={opening ? 'Opening…' : `Open ${appName}`}
          onPress={onOpenApp}
          disabled={opening}
          loading={opening}
        />
        <PrimaryButton
          label="I paid — record expense"
          onPress={onConfirmPaid}
          disabled={opening}
        />
        <SecondaryButton
          label="Try auto-fill anyway (may fail on personal UPI)"
          onPress={onTryAutoPay}
          disabled={opening}
        />
        <SecondaryButton label="Cancel" onPress={() => navigation.goBack()} />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.page,
  },
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
    ...shadow.card,
  },
  qrImage: {
    width: 260,
    height: 260,
  },
  steps: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
