import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Camera, CameraType} from 'react-native-camera-kit';
import {
  AppTextInput,
  IconButton,
  InfoBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  Section,
  SecondaryButton,
} from '../components/UI';
import {RootStackParamList} from '../navigation';
import {merchantFromUpiQr} from '../utils/upi';
import {toast} from '../utils/toast';
import {trackUpiEvent} from '../upi/analytics';
import {parseUpiQr as parseValidatedUpiQr} from '../upi/scanner/UpiQrParser';
import {colors, radius, shadow, spacing, typography} from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'Scan'>;

const SCAN_THROTTLE_MS = 2000;

export const ScannerScreen = () => {
  useRoute<R>();
  const navigation = useNavigation<Nav>();
  const [torchOn, setTorchOn] = useState(false);
  const [cameraAuth, setCameraAuth] = useState(Platform.OS !== 'android');
  const [rawManual, setRawManual] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const lastScanAt = useRef(0);
  const handledValue = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      handledValue.current = null;
      lastScanAt.current = 0;
      trackUpiEvent('upi_scan_started');
    }, []),
  );

  useEffect(() => {
    const requestCamera = async () => {
      if (Platform.OS !== 'android') {
        setCameraAuth(true);
        return;
      }
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera permission',
          message: 'AllPay needs the camera to scan UPI merchant QR codes.',
          buttonPositive: 'Allow',
        },
      );
      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        setCameraAuth(true);
        return;
      }
      if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Camera blocked',
          'Open system settings to enable the camera for AllPay.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open settings', onPress: () => Linking.openSettings()},
          ],
        );
      } else {
        toast.error('Camera required', 'Allow camera access to scan QR codes.');
      }
    };
    requestCamera();
  }, []);

  const onQrValue = useCallback(
    (value: string) => {
      const trimmed = value?.trim() ?? '';
      if (!trimmed) {
        return;
      }
      const now = Date.now();
      if (now - lastScanAt.current < SCAN_THROTTLE_MS) {
        return;
      }
      if (handledValue.current === trimmed) {
        return;
      }
      lastScanAt.current = now;
      const validated = parseValidatedUpiQr(trimmed);
      if (!validated.ok) {
        if (handledValue.current !== trimmed) {
          handledValue.current = trimmed;
          trackUpiEvent('upi_qr_invalid');
          toast.error('Invalid QR', `${validated.message} [${validated.code}]`);
        }
        return;
      }
      const merchant = merchantFromUpiQr(validated);
      const personal =
        !merchant.merchantCategoryCode || merchant.merchantCategoryCode === '0000';
      if (personal) {
        handledValue.current = trimmed;
        toast.error(
          'Personal UPI not supported',
          'Scan a merchant / shop QR. AllPay does not pay personal UPI IDs.',
        );
        return;
      }
      trackUpiEvent('upi_qr_scanned');
      handledValue.current = trimmed;
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 400);
      navigation.navigate('Payment', {merchant});
    },
    [navigation],
  );

  const handleManual = () => {
    onQrValue(rawManual);
  };

  return (
    <Screen safeTop={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Scan merchant QR"
          subtitle="Point the camera at a merchant UPI QR. You pay AllPay via Razorpay. The shop is paid only after RazorpayX payout."
        />

        <InfoBanner tone="info" title="Merchant QR only">
          Scan a shop / business UPI QR. You pay AllPay through Razorpay, then AllPay pays this
          merchant instantly. Personal UPI IDs are not supported.
        </InfoBanner>

        <View style={styles.cameraCard}>
          <View style={[styles.cameraWrap, scanFlash ? styles.cameraFlash : null]}>
            {cameraAuth ? (
              <Camera
                style={styles.camera}
                cameraType={CameraType.Back}
                scanBarcode
                showFrame
                laserColor={colors.scannerLaser}
                frameColor={colors.scannerFrame}
                torchMode={torchOn ? 'on' : 'off'}
                onReadCode={e => onQrValue(e.nativeEvent.codeStringValue)}
                onError={e => toast.error('Camera error', e.nativeEvent.errorMessage)}
                allowedBarcodeTypes={['qr']}
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Text style={styles.placeholderText}>
                  {Platform.OS === 'android'
                    ? 'Waiting for camera permission...'
                    : 'Preparing camera...'}
                </Text>
              </View>
            )}
            <View style={styles.scanHintOverlay} pointerEvents="none">
              <Text style={styles.scanHintText}>Align QR inside the frame</Text>
            </View>
          </View>
          <View style={styles.cameraControls}>
            <IconButton
              label={torchOn ? 'Torch on' : 'Torch'}
              active={torchOn}
              onPress={() => setTorchOn(v => !v)}
              disabled={!cameraAuth}
            />
            <Text style={styles.controlHint}>Hold steady for a clear scan</Text>
          </View>
        </View>

        <Section title="Trouble scanning?">
          <Text style={styles.hintText}>
            Ensure the full QR is in the frame. UPI QRs use the
            <Text style={styles.mono}> upi://pay?...</Text> format.
          </Text>
          {showManual ? (
            <>
              <AppTextInput
                label="UPI link"
                value={rawManual}
                onChangeText={setRawManual}
                placeholder="Paste full UPI link (upi://pay?...)"
                multiline
                autoCorrect={false}
                autoCapitalize="none"
              />
              <PrimaryButton label="Use pasted link" onPress={handleManual} />
            </>
          ) : (
            <SecondaryButton
              label="Enter or paste UPI link instead"
              onPress={() => setShowManual(true)}
            />
          )}
        </Section>
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
  cameraCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cameraWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cameraFlash: {
    borderWidth: 3,
    borderColor: colors.success,
  },
  camera: {
    width: '100%',
    height: 340,
  },
  cameraPlaceholder: {
    width: '100%',
    height: 340,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  scanHintOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHintText: {
    backgroundColor: colors.scannerOverlay,
    color: colors.textInverse,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  controlHint: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.navySoft,
  },
});
