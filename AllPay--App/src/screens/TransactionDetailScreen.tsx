import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {EXPENSE_PURPOSES} from '../constants/mockData';
import {
  AppTextInput,
  DetailRow,
  ErrorState,
  InfoBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  Section,
  SecondaryButton,
  SelectInput,
  StatusBadge,
  Timeline,
} from '../components/UI';
import {useAppData} from '../context/AppContext';
import {RootStackParamList} from '../navigation';
import {Receipt} from '../types';
import {isPaymentCaptured} from '../services/payments';
import {toast} from '../utils/toast';
import {maskRef, maskVpa} from '../upi/mask';
import {paiseToRupeeLabel} from '../upi/money';
import {colors, radius, spacing} from '../theme/tokens';

type Route = RouteProp<RootStackParamList, 'TransactionDetail'>;

const FILE_LIMIT_BYTES = 5 * 1024 * 1024;

const isWithin48Hours = (isoDate: string): boolean =>
  Date.now() - new Date(isoDate).getTime() <= 48 * 60 * 60 * 1000;

const normalizeReceipts = (assets: any[]): Receipt[] =>
  assets.map((asset, idx) => ({
    id: `${asset.fileName ?? 'receipt'}-${idx}-${Date.now()}`,
    uri: asset.uri ?? '',
    fileName: asset.fileName ?? `receipt-${idx + 1}.jpg`,
    fileSize: asset.fileSize ?? 0,
    type: asset.type ?? 'image/jpeg',
  }));

export const TransactionDetailScreen = () => {
  const route = useRoute<Route>();
  const {
    transactions,
    upiPayments,
    submitForReimbursement,
    addReceipts,
    applyUpiPaymentStatus,
  } = useAppData();
  const tx = useMemo(
    () => transactions.find(item => item.id === route.params.transactionId),
    [route.params.transactionId, transactions],
  );
  const [purpose, setPurpose] = useState(EXPENSE_PURPOSES[0]);
  const [note, setNote] = useState('');

  if (!tx) {
    return (
      <Screen safeTop={false}>
        <View style={styles.centered}>
          <ErrorState title="Transaction not found" />
        </View>
      </Screen>
    );
  }

  const linkedPayment = tx.paymentId
    ? upiPayments.find(item => item.id === tx.paymentId)
    : undefined;
  const unresolvedUpi =
    tx.paymentStatus === 'UNKNOWN' ||
    tx.paymentStatus === 'PENDING' ||
    linkedPayment?.status === 'UNKNOWN' ||
    linkedPayment?.status === 'PENDING';
  const canAttach = isWithin48Hours(tx.timestamp) && tx.receipts.length < 3;
  const paymentReady = isPaymentCaptured(tx.paymentStatus);
  const canSubmit =
    paymentReady && (tx.status === 'Recorded' || tx.status === 'Flagged');
  let submitLabel = 'Already submitted';
  if (!paymentReady) {
    submitLabel = 'Payment not confirmed';
  } else if (canSubmit) {
    submitLabel = 'Submit for reimbursement';
  }

  const attachFromSource = async (source: 'camera' | 'gallery') => {
    const pickerResult =
      source === 'camera'
        ? await launchCamera({mediaType: 'photo', quality: 0.8})
        : await launchImageLibrary({mediaType: 'photo', selectionLimit: 3});

    const assets = pickerResult.assets ?? [];
    const invalid = assets.find(
      asset =>
        !['image/jpeg', 'image/png'].includes(asset.type ?? '') ||
        (asset.fileSize ?? 0) > FILE_LIMIT_BYTES,
    );
    if (invalid) {
      toast.error('Invalid file', 'Use JPEG or PNG, max 5 MB per image.');
      return;
    }
    const receipts = normalizeReceipts(assets);
    await addReceipts(tx.id, receipts);
  };

  const submit = async () => {
    if (note.length > 500) {
      toast.error('Note too long', 'Maximum 500 characters.');
      return;
    }
    await submitForReimbursement(tx.id, purpose, note);
    toast.success('Submitted', 'This expense is now pending approval.');
  };

  const timelineItems = [
    {
      title: 'Expense recorded',
      meta: new Date(tx.timestamp).toLocaleString(),
      tone: 'success' as const,
    },
    tx.paymentStatus
      ? {
          title: `Payment: ${tx.paymentStatus.replace(/_/g, ' ')}`,
          meta: tx.upiRefId ? `Ref ${maskRef(tx.upiRefId)}` : undefined,
          tone:
            tx.paymentStatus === 'SUCCESS_REPORTED' || tx.paymentStatus === 'USER_CONFIRMED'
              ? ('success' as const)
              : tx.paymentStatus === 'FAILED' || tx.paymentStatus === 'CANCELLED'
                ? ('danger' as const)
                : ('warning' as const),
        }
      : null,
    {
      title: `Reimbursement: ${tx.status}`,
      meta: tx.adminNote || tx.rejectionReason,
      tone:
        tx.status === 'Approved'
          ? ('success' as const)
          : tx.status === 'Rejected'
            ? ('danger' as const)
            : ('default' as const),
    },
    {
      title: `Sync: ${tx.syncStatus}`,
      tone: tx.syncStatus === 'synced' ? ('success' as const) : ('warning' as const),
    },
  ].filter(Boolean) as Array<{title: string; meta?: string; tone?: 'default' | 'success' | 'warning' | 'danger'}>;

  return (
    <Screen safeTop={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={tx.merchant.name}
          subtitle={`${new Date(tx.timestamp).toLocaleString()} · ${tx.id}`}
        />
        <View style={styles.statusRow}>
          <StatusBadge status={tx.status} />
          {tx.paymentStatus ? <StatusBadge status={tx.paymentStatus} /> : null}
          <StatusBadge status={tx.syncStatus} />
        </View>

        <InfoBanner tone="info" title="Payment vs reimbursement">
          Payment status is what your UPI app reported. Reimbursement status is decided by finance.
          A successful payment record is not an approved claim.
        </InfoBanner>

        <Section title="Payment details">
          <DetailRow label="Merchant" value={tx.merchant.name} />
          <DetailRow
            label="UPI ID"
            value={tx.merchant.vpa ? maskVpa(tx.merchant.vpa) : '--'}
          />
          <DetailRow label="MCC" value={tx.merchant.mcc} />
          <DetailRow
            label="Amount"
            value={
              tx.amountPaise != null
                ? `₹${paiseToRupeeLabel(tx.amountPaise)}`
                : `INR ${tx.amount.toFixed(2)}`
            }
          />
          <DetailRow
            label="Method"
            value={
              tx.paymentMethod === 'razorpay_merchant_payout'
                ? 'Razorpay → shop payout'
                : tx.paymentMethod === 'UPI_INTENT'
                  ? 'UPI'
                  : tx.upiApp
            }
          />
          <DetailRow label="Payment status" value={tx.paymentStatus ?? 'Not started'} />
          <DetailRow label="Reference" value={maskRef(tx.upiRefId ?? tx.upiTxnRef)} />
          <DetailRow label="Sync" value={tx.syncStatus} />
          <DetailRow
            label="Location"
            value={
              tx.location
                ? `${tx.location.latitude.toFixed(4)}, ${tx.location.longitude.toFixed(4)}`
                : 'Not captured'
            }
            last
          />
          {tx.paymentMethod === 'razorpay_merchant_payout' ? (
            <Text style={styles.helpText}>
              You paid AllPay via Razorpay. Shop paid is confirmed only when status is Shop paid.
            </Text>
          ) : null}
          {tx.policyWarning ? (
            <InfoBanner tone="warning" title="Policy warning">
              {tx.policyWarning}
            </InfoBanner>
          ) : null}
        </Section>

        {unresolvedUpi && tx.paymentId ? (
          <Section title="Couldn't determine payment status">
            <Text style={styles.helpText}>
              We couldn't determine the result of this UPI payment. Recording manually is not the
              same as a successful UPI callback.
            </Text>
            <SecondaryButton
              label="Record expense"
              onPress={() => applyUpiPaymentStatus(tx.paymentId as string, 'USER_CONFIRMED')}
            />
          </Section>
        ) : null}

        <Section title="Receipts" description="Max 3 images, within 48 hours of payment.">
          <View style={styles.thumbWrap}>
            {tx.receipts.length === 0 ? (
              <Text style={styles.empty}>No receipts uploaded yet.</Text>
            ) : null}
            {tx.receipts.map(receipt => (
              <Image key={receipt.id} source={{uri: receipt.uri}} style={styles.thumb} />
            ))}
          </View>
          {canAttach ? (
            <>
              <SecondaryButton
                label="Take receipt photo"
                onPress={() => attachFromSource('camera')}
              />
              <SecondaryButton
                label="Choose from gallery"
                onPress={() => attachFromSource('gallery')}
              />
            </>
          ) : (
            <Text style={styles.helpText}>
              Attachment window closed or maximum receipts reached.
            </Text>
          )}
        </Section>

        <Section title="Submit for reimbursement">
          {!canSubmit ? (
            <InfoBanner tone="warning" title="Submission blocked">
              {!paymentReady
                ? 'Confirm the payment result before submitting a claim.'
                : 'This expense is already submitted or cannot be claimed in its current state.'}
            </InfoBanner>
          ) : null}
          <SelectInput
            label="Business purpose"
            options={EXPENSE_PURPOSES}
            value={purpose}
            onChange={setPurpose}
          />
          <AppTextInput
            label="Note"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            placeholder="Add note (max 500 chars)"
            editable={canSubmit}
            helper={`${note.length}/500`}
          />
          <PrimaryButton label={submitLabel} onPress={submit} disabled={!canSubmit} />
        </Section>

        <Section title="Activity">
          <Timeline items={timelineItems} />
        </Section>

        {tx.status === 'Approved' ? (
          <Section title="Approval info">
            <DetailRow
              label="Reimbursed"
              value={`INR ${tx.reimbursementAmount?.toFixed(2) ?? '--'}`}
            />
            <DetailRow
              label="Date"
              value={
                tx.reimbursementDate
                  ? new Date(tx.reimbursementDate).toLocaleDateString()
                  : '--'
              }
              last
            />
          </Section>
        ) : null}

        {tx.status === 'Rejected' ? (
          <Section title="Rejected reason">
            <Text style={styles.row}>{tx.rejectionReason ?? tx.adminNote ?? 'Not provided'}</Text>
          </Section>
        ) : null}

        {tx.adminNote && tx.status === 'Flagged' ? (
          <Section title="Admin comment">
            <Text style={styles.row}>{tx.adminNote}</Text>
          </Section>
        ) : null}
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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  row: {
    color: colors.navy,
    marginBottom: 6,
    lineHeight: 20,
  },
  thumbWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: {
    color: colors.textMuted,
    width: '100%',
    marginBottom: spacing.sm,
  },
  helpText: {
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
    fontSize: 13,
  },
});
