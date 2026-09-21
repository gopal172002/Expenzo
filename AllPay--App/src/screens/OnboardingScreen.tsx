import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useAppData} from '../context/AppContext';
import {OnboardingPager} from '../components/onboarding/OnboardingPager';
import {
  InviteCodeInput,
  MobileNumberInput,
  OTPInput,
  Screen,
  SoftContinueButton,
  TextButton,
} from '../components/UI';
import {
  completeOnboardingApi,
  confirmProfile,
  mapBackendProfile,
  sendOtp,
  verifyInviteCode,
  verifyOtp,
  type BackendEmployeeProfile,
} from '../services/onboarding';
import {storage} from '../services/storage';
import {colors, radius, spacing} from '../theme/tokens';
import {toast} from '../utils/toast';

type Step = 'welcome' | 'invite' | 'profile' | 'otp' | 'privacy' | 'walkthrough';

export const OnboardingScreen = () => {
  const {finishEmployeeLogin, setLocationCaptureEnabled} = useAppData();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | undefined>();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>();
  const [onboardingToken, setOnboardingToken] = useState('');
  const [backendProfile, setBackendProfile] = useState<BackendEmployeeProfile | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [pendingProfile, setPendingProfile] = useState<{
    profile: ReturnType<typeof mapBackendProfile>;
    token: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    storage
      .getIntroSeen()
      .then(seen => {
        if (cancelled) {
          return;
        }
        if (seen) {
          setStep('invite');
        }
        setBootstrapped(true);
      })
      .catch(() => {
        if (!cancelled) {
          setBootstrapped(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const t = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const finishIntro = async () => {
    try {
      await storage.setIntroSeen();
    } catch {
      // Still continue into invite if persistence fails.
    }
    setStep('invite');
  };

  const resetToInvite = () => {
    setStep('invite');
    setOnboardingToken('');
    setBackendProfile(null);
    setIsReturningUser(false);
    setOtp('');
    setOtpError(undefined);
    setPendingProfile(null);
  };

  const handleInviteContinue = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setInviteError('Enter the mobile invite code from your admin.');
      toast.error('Invite required', 'Enter the mobile invite code from your admin.');
      return;
    }
    setInviteError(undefined);
    setBusy(true);
    try {
      const verified = await verifyInviteCode(code);
      if (!verified.ok) {
        setInviteError(verified.message);
        toast.error('Invalid invite', verified.message);
        return;
      }

      setBackendProfile(verified.profile);
      setOnboardingToken(verified.onboardingToken);
      setIsReturningUser(verified.alreadyOnboarded);
      setPhone((verified.profile.phone || '').replace(/\D/g, '').slice(-10));
      setStep('profile');
      toast.success(
        verified.alreadyOnboarded ? 'Invite verified' : 'Invite accepted',
        verified.alreadyOnboarded
          ? `Welcome back, ${verified.profile.name}!`
          : `Hello ${verified.profile.name} — confirm your details.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmProfile = async () => {
    if (!onboardingToken || !backendProfile) {
      return;
    }
    const mobile = phone.trim();
    if (mobile.length < 10) {
      setPhoneError('Enter a valid 10-digit mobile number.');
      toast.error('Phone required', 'Enter a valid mobile number.');
      return;
    }
    setPhoneError(undefined);
    setBusy(true);
    try {
      const result = await confirmProfile(onboardingToken, mobile, backendProfile.name);
      if (!result.ok) {
        toast.error('Profile error', result.message);
        return;
      }
      setBackendProfile(result.profile);
      const otpResult = await sendOtp(onboardingToken);
      if (!otpResult.ok) {
        toast.error('OTP error', otpResult.message);
        return;
      }
      setResendIn(30);
      setStep('otp');
      toast.info('OTP sent', `${otpResult.message} Dev OTP: 123456`);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyAndComplete = async () => {
    if (!onboardingToken) {
      return;
    }
    if (otp.trim().length !== 6) {
      setOtpError('Enter the 6-digit verification code.');
      toast.error('OTP required', 'Enter the 6-digit verification code.');
      return;
    }
    setOtpError(undefined);
    setBusy(true);
    try {
      const verified = await verifyOtp(onboardingToken, otp);
      if (!verified.ok) {
        setOtpError(verified.message);
        toast.error('OTP failed', verified.message);
        return;
      }
      const done = await completeOnboardingApi(onboardingToken);
      if (!done.ok) {
        toast.error('Setup failed', done.message);
        return;
      }
      setPendingProfile({
        profile: mapBackendProfile(done.profile),
        token: done.token,
      });
      setStep('privacy');
      toast.success(
        isReturningUser ? 'Verified' : 'Account ready',
        isReturningUser ? `Welcome back, ${done.profile.name}!` : `Welcome, ${done.profile.name}!`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!onboardingToken || resendIn > 0) {
      return;
    }
    setBusy(true);
    try {
      const result = await sendOtp(onboardingToken);
      if (result.ok) {
        setResendIn(30);
        toast.info('OTP resent', `${result.message} Dev OTP: 123456`);
      } else {
        toast.error('OTP error', result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!pendingProfile) {
      return;
    }
    setBusy(true);
    try {
      await finishEmployeeLogin(pendingProfile.profile, pendingProfile.token);
    } finally {
      setBusy(false);
    }
  };

  if (!bootstrapped) {
    return (
      <Screen>
        <View style={styles.boot}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (step === 'welcome') {
    return (
      <Screen safeBottom={false} safeTop={false}>
        <OnboardingPager onFinished={finishIntro} />
      </Screen>
    );
  }

  if (step === 'invite') {
    return (
      <Screen style={styles.authScreen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.authBody}>
            <Text style={styles.authTitle}>Enter invite code</Text>
            <InviteCodeInput
              value={inviteCode}
              onChangeText={t => {
                setInviteCode(t);
                if (inviteError) {
                  setInviteError(undefined);
                }
              }}
              error={inviteError}
            />
            <View style={styles.authSpacer} />
            <SoftContinueButton
              label="Continue"
              onPress={handleInviteContinue}
              ready={inviteCode.trim().length > 0}
              disabled={busy}
              loading={busy}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (step === 'profile' && backendProfile) {
    return (
      <Screen style={styles.authScreen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.authBody}>
            <Text style={styles.authTitle}>Enter mobile number</Text>
            <Text style={styles.authHint}>
              {backendProfile.name} · {backendProfile.companyName}
            </Text>
            <MobileNumberInput
              value={phone}
              onChangeText={t => {
                setPhone(t);
                if (phoneError) {
                  setPhoneError(undefined);
                }
              }}
              error={phoneError}
            />
            <View style={styles.authSpacer} />
            <SoftContinueButton
              label="Continue"
              onPress={handleConfirmProfile}
              ready={phone.trim().length === 10}
              disabled={busy}
              loading={busy}
            />
            <TextButton label="Use a different invite" onPress={resetToInvite} />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (step === 'otp' && backendProfile) {
    const phoneDisplay = phone.trim().length === 10 ? `+91${phone}` : phone || 'your number';
    return (
      <Screen style={styles.authScreen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.otpBody}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => setStep('profile')}
              hitSlop={12}
              style={styles.otpBackBtn}>
              <Text style={styles.otpBackGlyph}>‹</Text>
            </Pressable>

            <Text style={styles.otpTitle}>Enter your OTP</Text>

            <OTPInput
              value={otp}
              onChangeText={t => {
                setOtp(t);
                if (otpError) {
                  setOtpError(undefined);
                }
              }}
              error={otpError}
            />

            <Text style={styles.otpSentLine}>We sent a 6-digit code to {phoneDisplay}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{disabled: busy || resendIn > 0}}
              disabled={busy || resendIn > 0}
              onPress={handleResendOtp}
              style={styles.otpMetaRow}>
              <Text style={styles.otpMetaIcon}>💬</Text>
              <Text
                style={[
                  styles.otpMetaText,
                  resendIn > 0 ? styles.otpMetaMuted : styles.otpMetaActive,
                ]}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit phone number"
              onPress={() => setStep('profile')}
              style={styles.otpMetaRow}>
              <Text style={styles.otpMetaIcon}>✎</Text>
              <Text style={[styles.otpMetaText, styles.otpMetaActive]}>Edit phone number</Text>
            </Pressable>

            <View style={styles.authSpacer} />

            <SoftContinueButton
              label={busy ? 'Verifying…' : 'Continue'}
              onPress={handleVerifyAndComplete}
              ready={otp.trim().length === 6}
              disabled={busy}
              loading={busy}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (step === 'privacy' && pendingProfile) {
    const goNext = async (enableLocation: boolean) => {
      setBusy(true);
      try {
        await setLocationCaptureEnabled(enableLocation);
        setStep('walkthrough');
      } finally {
        setBusy(false);
      }
    };

    return (
      <Screen safeTop={false} style={styles.privacyRoot}>
        <View style={styles.privacyBackdrop} pointerEvents="none">
          <View style={styles.privacyPeek}>
            <Text style={styles.privacyPeekTitle}>You're almost ready</Text>
            <Text style={styles.privacyPeekSub}>
              Signed in as {pendingProfile.profile.employeeName}
            </Text>
            <View style={styles.privacyPeekCard}>
              <Text style={styles.privacyPeekCardText}>Scan & Pay on Home</Text>
            </View>
            <View style={styles.privacyPeekCard}>
              <Text style={styles.privacyPeekCardText}>Open your preferred UPI app</Text>
            </View>
            <View style={styles.privacyPeekCard}>
              <Text style={styles.privacyPeekCardText}>Finance reviews claims later</Text>
            </View>
          </View>
          <View style={styles.privacyDim} />
        </View>

        <View style={styles.privacySheet}>
          <View style={styles.privacyIconWrap}>
            <View style={styles.privacyIconBox}>
              <Text style={styles.privacyIconText}>AP</Text>
            </View>
            <View style={styles.privacyBadge} />
          </View>
          <Text style={styles.privacyTitle}>Help verify payments</Text>
          <Text style={styles.privacyBody}>
            Optional one-time location when a payment is confirmed helps finance verify where it
            happened. No continuous or background tracking.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => goNext(true)}
            style={({pressed}) => [
              styles.privacyPrimaryBtn,
              pressed ? {opacity: 0.9} : null,
              busy ? {opacity: 0.6} : null,
            ]}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.privacyPrimaryText}>ENABLE LOCATION</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => goNext(false)}
            style={({pressed}) => [
              styles.privacySecondaryBtn,
              pressed ? {opacity: 0.6} : null,
            ]}>
            <Text style={styles.privacySecondaryText}>MAYBE LATER</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (step === 'walkthrough' && pendingProfile) {
    return (
      <Screen safeTop={false} style={styles.privacyRoot}>
        <View style={styles.privacyBackdrop} pointerEvents="none">
          <View style={styles.privacyPeek}>
            <Text style={styles.privacyPeekTitle}>Welcome aboard</Text>
            <Text style={styles.privacyPeekSub}>
              {pendingProfile.profile.employeeName} · {pendingProfile.profile.companyName}
            </Text>
            <View style={styles.privacyPeekCard}>
              <Text style={styles.privacyPeekCardText}>Scan & Pay from Home</Text>
            </View>
            <View style={styles.privacyPeekCard}>
              <Text style={styles.privacyPeekCardText}>Confirm amount, then open UPI</Text>
            </View>
            <View style={styles.privacyPeekCard}>
              <Text style={styles.privacyPeekCardText}>Return here to see the result</Text>
            </View>
          </View>
          <View style={styles.privacyDim} />
        </View>

        <View style={styles.readySheet}>
          <View style={styles.privacyIconWrap}>
            <View style={styles.privacyIconBox}>
              <Text style={styles.privacyIconText}>AP</Text>
            </View>
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeMark}>✓</Text>
            </View>
          </View>
          <Text style={styles.privacyTitle}>You're ready</Text>
          <Text style={styles.privacyBody}>
            Signed in as {pendingProfile.profile.employeeName} at{' '}
            {pendingProfile.profile.companyName}. Scan & Pay is your main action — finance still
            reviews claims after payment.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={finish}
            style={({pressed}) => [
              styles.privacyPrimaryBtn,
              pressed ? {opacity: 0.9} : null,
              busy ? {opacity: 0.6} : null,
            ]}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.privacyPrimaryText}>GO TO HOME</Text>
            )}
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.authScreen}>
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  boot: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  authScreen: {backgroundColor: colors.page},
  authBody: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: 28,
    paddingBottom: 16,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
    marginBottom: 20,
  },
  authHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -12,
    marginBottom: 20,
  },
  authSpacer: {flex: 1},
  otpBody: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: 8,
    paddingBottom: 16,
  },
  otpBackBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 4,
  },
  otpBackGlyph: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '300',
    color: colors.navy,
    marginLeft: -4,
  },
  otpTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
    marginBottom: 28,
  },
  otpSentLine: {
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  otpMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 4,
  },
  otpMetaIcon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  otpMetaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  otpMetaMuted: {
    color: colors.textMuted,
  },
  otpMetaActive: {
    color: colors.navy,
    fontWeight: '600',
  },
  privacyRoot: {
    backgroundColor: colors.page,
    justifyContent: 'flex-end',
  },
  privacyBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  privacyPeek: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    gap: 12,
  },
  privacyPeekTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  privacyPeekSub: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  privacyPeekCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    backgroundColor: colors.paper,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  privacyPeekCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  privacyDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  privacySheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  privacyIconWrap: {
    marginBottom: 20,
  },
  privacyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyIconText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  privacyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  privacyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  privacyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  privacyPrimaryBtn: {
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  privacyPrimaryText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  privacySecondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  privacySecondaryText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  readySheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  readyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBadgeMark: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
});
