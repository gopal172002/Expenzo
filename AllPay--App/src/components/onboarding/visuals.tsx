import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme/tokens';

const PAGE = colors.page;
const INK = colors.navy;
const MUTED = colors.textSecondary;
const LINE = colors.navy;
const SOFT = colors.subtle;
const BLUE = colors.primary;
const GREEN = colors.success;

type FloatCardProps = {
  children: React.ReactNode;
  rotate: string;
  style?: object;
};

function FloatCard({children, rotate, style}: FloatCardProps) {
  return (
    <View style={[styles.floatCard, {transform: [{rotate}]}, style]}>{children}</View>
  );
}

function PhoneFrame({children}: {children: React.ReactNode}) {
  return (
    <View style={styles.phoneOuter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.phoneNotch} />
      <View style={styles.phoneInner}>{children}</View>
    </View>
  );
}

function MetaRow({label, sub}: {label: string; sub: string}) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>AP</Text>
      </View>
      <Text style={styles.metaLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.metaSub}>{sub}</Text>
    </View>
  );
}

/** Slide 1 — QR + receipt floating over phone. */
export function WelcomeVisual() {
  return (
    <View style={styles.stage}>
      <PhoneFrame>
        <View style={styles.phoneBg} />
      </PhoneFrame>
      <FloatCard rotate="-4deg" style={styles.cardTop}>
        <View style={styles.thumbRow}>
          <View style={[styles.thumb, styles.thumbBlue]}>
            <Text style={styles.thumbGlyph}>QR</Text>
          </View>
          <View style={[styles.thumb, styles.thumbSoft]}>
            <View style={styles.miniQr} />
          </View>
          <View style={[styles.thumb, styles.thumbInk]}>
            <Text style={styles.thumbGlyphLight}>Pay</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Scan merchant QR</Text>
        <MetaRow label="AllPay" sub="at work" />
      </FloatCard>
      <FloatCard rotate="3.5deg" style={styles.cardBottom}>
        <View style={styles.thumbRow}>
          <View style={[styles.thumb, styles.thumbGreen]}>
            <Text style={styles.thumbGlyph}>₹</Text>
          </View>
          <View style={[styles.thumb, styles.thumbSoft]}>
            <View style={styles.line} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
          <View style={[styles.thumb, styles.thumbSoft]}>
            <Text style={styles.amountMini}>₹420</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Expense recorded</Text>
        <MetaRow label="Receipt ready" sub="synced" />
      </FloatCard>
    </View>
  );
}

/** Slide 2 — scan → UPI. */
export function PaymentFlowVisual() {
  return (
    <View style={styles.stage}>
      <PhoneFrame>
        <View style={styles.phoneBg} />
      </PhoneFrame>
      <FloatCard rotate="-3deg" style={styles.cardTop}>
        <View style={styles.thumbRow}>
          {['1', '2', '3'].map(n => (
            <View key={n} style={[styles.thumb, styles.thumbSoft, styles.stepThumb]}>
              <Text style={styles.stepNum}>{n}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardTitle}>Scan · Review · Open UPI</Text>
        <MetaRow label="Your flow" sub="3 steps" />
      </FloatCard>
      <FloatCard rotate="4deg" style={styles.cardBottom}>
        <View style={styles.thumbRow}>
          {['Pe', 'GPay', 'Paytm'].map(name => (
            <View key={name} style={[styles.thumb, styles.thumbBlueSoft]}>
              <Text style={styles.upiMini}>{name}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardTitle}>Pay the shop via AllPay</Text>
        <MetaRow label="PhonePe · GPay · BHIM" sub="secure" />
      </FloatCard>
    </View>
  );
}

/** Slide 3 — organized expense. */
export function ExpenseTrackingVisual() {
  return (
    <View style={styles.stage}>
      <PhoneFrame>
        <View style={styles.phoneBg} />
      </PhoneFrame>
      <FloatCard rotate="-3.5deg" style={styles.cardTop}>
        <View style={styles.thumbRow}>
          <View style={[styles.thumb, styles.thumbSoft]}>
            <Text style={styles.merchantMini}>Cafe</Text>
          </View>
          <View style={[styles.thumb, styles.thumbInk]}>
            <Text style={styles.thumbGlyphLight}>₹860</Text>
          </View>
          <View style={[styles.thumb, styles.thumbGreen]}>
            <Text style={styles.thumbGlyph}>✓</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Cafe Metro · Meals</Text>
        <MetaRow label="Receipt attached" sub="queued" />
      </FloatCard>
      <FloatCard rotate="3deg" style={styles.cardBottom}>
        <View style={styles.thumbRow}>
          <View style={[styles.thumb, styles.thumbSoft]}>
            <Text style={styles.metaChip}>Loc</Text>
          </View>
          <View style={[styles.thumb, styles.thumbSoft]}>
            <Text style={styles.metaChip}>Sync</Text>
          </View>
          <View style={[styles.thumb, styles.thumbBlueSoft]}>
            <Text style={styles.metaChipBlue}>Offline OK</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Snapshot · Sync · Offline</Text>
        <MetaRow label="Always tracked" sub="safe" />
      </FloatCard>
    </View>
  );
}

/** Slide 4 — submit & reimburse. */
export function ReimbursementTimeline() {
  return (
    <View style={styles.stage}>
      <PhoneFrame>
        <View style={styles.phoneBg} />
      </PhoneFrame>
      <FloatCard rotate="-4deg" style={styles.cardTop}>
        <View style={styles.thumbRow}>
          {['Pay', 'File', 'Send'].map(label => (
            <View key={label} style={[styles.thumb, styles.thumbSoft]}>
              <Text style={styles.metaChip}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardTitle}>Recorded → Submitted</Text>
        <MetaRow label="Claim ready" sub="fast" />
      </FloatCard>
      <FloatCard rotate="3.5deg" style={styles.cardBottom}>
        <View style={styles.thumbRow}>
          <View style={[styles.thumb, styles.thumbBlueSoft]}>
            <Text style={styles.metaChipBlue}>Review</Text>
          </View>
          <View style={[styles.thumb, styles.thumbGreen]}>
            <Text style={styles.thumbGlyph}>₹</Text>
          </View>
          <View style={[styles.thumb, styles.thumbInk]}>
            <Text style={styles.thumbGlyphLight}>Done</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Finance reimburses</Text>
        <MetaRow label="Status stays clear" sub="separate" />
      </FloatCard>
    </View>
  );
}

export function FeatureChip({label}: {label: string}) {
  return (
    <View style={styles.legacyChip}>
      <Text style={styles.legacyChipText}>{label}</Text>
    </View>
  );
}

export function InformationNote({children}: {children: string}) {
  return (
    <View style={styles.legacyNote}>
      <Text style={styles.legacyNoteText}>{children}</Text>
    </View>
  );
}

export function OnboardingIllustration({slide}: {slide: 0 | 1 | 2 | 3}) {
  if (slide === 0) {
    return <WelcomeVisual />;
  }
  if (slide === 1) {
    return <PaymentFlowVisual />;
  }
  if (slide === 2) {
    return <ExpenseTrackingVisual />;
  }
  return <ReimbursementTimeline />;
}

const styles = StyleSheet.create({
  stage: {
    height: 380,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  phoneOuter: {
    width: 200,
    height: 330,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: LINE,
    backgroundColor: PAGE,
    padding: 10,
    overflow: 'hidden',
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 72,
    height: 8,
    borderRadius: 4,
    backgroundColor: LINE,
    marginBottom: 8,
    opacity: 0.85,
  },
  phoneInner: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: SOFT,
  },
  phoneBg: {
    flex: 1,
    backgroundColor: SOFT,
  },
  floatCard: {
    position: 'absolute',
    width: 236,
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 11,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTop: {
    top: 12,
    zIndex: 3,
  },
  cardBottom: {
    top: 178,
    zIndex: 2,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 9,
  },
  thumb: {
    flex: 1,
    height: 58,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbSoft: {backgroundColor: SOFT},
  thumbBlue: {backgroundColor: BLUE},
  thumbBlueSoft: {backgroundColor: colors.primaryMuted},
  thumbGreen: {backgroundColor: GREEN},
  thumbInk: {backgroundColor: INK},
  stepThumb: {height: 56},
  thumbGlyph: {color: colors.textInverse, fontWeight: '800', fontSize: 18},
  thumbGlyphLight: {color: colors.textInverse, fontWeight: '800', fontSize: 13},
  stepNum: {color: INK, fontWeight: '800', fontSize: 18},
  upiMini: {color: BLUE, fontWeight: '800', fontSize: 11},
  merchantMini: {color: INK, fontWeight: '700', fontSize: 12},
  metaChip: {color: INK, fontWeight: '700', fontSize: 11},
  metaChipBlue: {color: BLUE, fontWeight: '800', fontSize: 10},
  amountMini: {color: INK, fontWeight: '800', fontSize: 14},
  miniQr: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 4,
  },
  line: {
    width: '70%',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginVertical: 3,
  },
  lineShort: {width: '45%'},
  cardTitle: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: colors.textInverse, fontSize: 7, fontWeight: '800'},
  metaLabel: {flex: 1, color: MUTED, fontSize: 11, fontWeight: '500'},
  metaSub: {color: MUTED, fontSize: 11, fontWeight: '500'},
  legacyChip: {
    backgroundColor: colors.paper,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legacyChipText: {fontSize: 12, fontWeight: '700', color: BLUE},
  legacyNote: {padding: 10},
  legacyNoteText: {fontSize: 12, color: MUTED},
});
