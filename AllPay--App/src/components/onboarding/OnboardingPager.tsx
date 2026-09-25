import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, motion, radius} from '../../theme/tokens';
import {
  ExpenseTrackingVisual,
  PaymentFlowVisual,
  ReimbursementTimeline,
  WelcomeVisual,
} from './visuals';

export type IntroSlideId = 'welcome' | 'scan' | 'organize' | 'submit';

type Slide = {
  id: IntroSlideId;
  headline: string;
  supporting?: string;
};

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    headline: 'Pay at work.\nTrack every expense.',
    supporting: 'Company spend, recorded clearly for finance.',
  },
  {
    id: 'scan',
    headline: 'Scan a shop QR.\nAllPay pays the merchant.',
    supporting: 'You pay AllPay via Razorpay. AllPay then pays the shop instantly.',
  },
  {
    id: 'organize',
    headline: 'Keep every expense\norganized.',
    supporting: 'Receipts, categories, notes, and reimbursement status in one place.',
  },
  {
    id: 'submit',
    headline: 'Submit claims\nfaster.',
    supporting: 'Your admin reviews, approves, or asks for more information.',
  },
];

type Props = {
  onFinished: () => void;
};

export function OnboardingPager({onFinished}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [animating, setAnimating] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted) {
          setReduceMotion(value);
        }
      })
      .catch(() => null);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (animating) {
        return;
      }
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      if (clamped === index) {
        return;
      }
      setAnimating(true);
      listRef.current?.scrollToIndex({
        index: clamped,
        animated: !reduceMotion,
      });
      setIndex(clamped);
      setTimeout(() => setAnimating(false), reduceMotion ? 0 : motion.slow);
    },
    [animating, index, reduceMotion],
  );

  const finish = useCallback(() => {
    if (finishing.current) {
      return;
    }
    finishing.current = true;
    onFinished();
  }, [onFinished]);

  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: ViewToken[]}) => {
    const first = viewableItems[0];
    if (first?.index != null) {
      setIndex(first.index);
    }
  }).current;

  const viewabilityConfig = useMemo(() => ({viewAreaCoveragePercentThreshold: 60}), []);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / Math.max(width, 1));
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
    setAnimating(false);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <View
      style={[styles.root, {paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16)}]}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel="AllPay product introduction">
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScrollBeginDrag={() => setAnimating(true)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({length: width, offset: width * i, index: i})}
        style={styles.list}
        renderItem={({item, index: slideIndex}) => (
          <OnboardingSlide
            slide={item}
            slideIndex={slideIndex as 0 | 1 | 2 | 3}
            width={width}
            reduceMotion={reduceMotion}
            active={slideIndex === index}
          />
        )}
      />

      <OnboardingFooter
        index={index}
        total={SLIDES.length}
        isLast={isLast}
        animating={animating}
        onNext={() => {
          if (isLast) {
            finish();
          } else {
            goTo(index + 1);
          }
        }}
        onSkip={finish}
      />
    </View>
  );
}

function OnboardingSlide({
  slide,
  slideIndex,
  width,
  reduceMotion,
  active,
}: {
  slide: Slide;
  slideIndex: 0 | 1 | 2 | 3;
  width: number;
  reduceMotion: boolean;
  active: boolean;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    if (active) {
      opacity.setValue(0.35);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity, {toValue: 1, duration: motion.normal, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 0, duration: motion.normal, useNativeDriver: true}),
      ]).start();
    }
  }, [active, opacity, reduceMotion, translateY]);

  return (
    <View style={[styles.slide, {width}]} accessibilityLabel={slide.headline.replace('\n', ' ')}>
      <Animated.View style={[styles.slideInner, {opacity, transform: [{translateY}]}]}>
        <Text style={styles.headline}>{slide.headline}</Text>
        {slide.supporting ? <Text style={styles.supporting}>{slide.supporting}</Text> : null}
        <View style={styles.visualWrap}>
          <SlideVisual index={slideIndex} />
        </View>
      </Animated.View>
    </View>
  );
}

function SlideVisual({index}: {index: 0 | 1 | 2 | 3}) {
  if (index === 0) {
    return <WelcomeVisual />;
  }
  if (index === 1) {
    return <PaymentFlowVisual />;
  }
  if (index === 2) {
    return <ExpenseTrackingVisual />;
  }
  return <ReimbursementTimeline />;
}

function OnboardingProgress({index, total}: {index: number; total: number}) {
  return (
    <View
      style={styles.dots}
      accessibilityRole="adjustable"
      accessibilityLabel={`Slide ${index + 1} of ${total}`}>
      {Array.from({length: total}).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === index ? styles.dotActive : null]}
          accessibilityElementsHidden
        />
      ))}
    </View>
  );
}

function NextArrowIcon() {
  return (
    <View style={styles.arrowIcon} accessibilityElementsHidden>
      <View style={[styles.arrowBar, styles.arrowBarTop]} />
      <View style={[styles.arrowBar, styles.arrowBarBottom]} />
    </View>
  );
}

function CheckIcon() {
  return (
    <View style={styles.checkIcon} accessibilityElementsHidden>
      <View style={styles.checkShort} />
      <View style={styles.checkLong} />
    </View>
  );
}

function OnboardingNextButton({
  onPress,
  disabled,
  isLast,
}: {
  onPress: () => void;
  disabled?: boolean;
  isLast: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isLast ? 'Get started' : 'Next'}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{color: 'rgba(255,255,255,0.22)', borderless: true, radius: 26}}
      style={({pressed}) => [
        styles.nextBtn,
        pressed ? styles.nextPressed : null,
        disabled ? styles.btnDisabled : null,
      ]}>
      {isLast ? <CheckIcon /> : <NextArrowIcon />}
    </Pressable>
  );
}

function OnboardingSkipButton({onPress, disabled}: {onPress: () => void; disabled?: boolean}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Skip introduction"
      hitSlop={12}
      disabled={disabled}
      onPress={onPress}
      style={styles.skipBtn}>
      <Text style={styles.skipText}>Skip</Text>
    </Pressable>
  );
}

function OnboardingFooter({
  index,
  total,
  isLast,
  animating,
  onNext,
  onSkip,
}: {
  index: number;
  total: number;
  isLast: boolean;
  animating: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.footer}>
      <OnboardingSkipButton onPress={onSkip} disabled={animating} />
      <OnboardingProgress index={index} total={total} />
      <OnboardingNextButton onPress={onNext} disabled={animating} isLast={isLast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.page,
  },
  list: {flex: 1},
  slide: {
    paddingHorizontal: 28,
    justifyContent: 'flex-start',
  },
  slideInner: {
    flex: 1,
    alignItems: 'center',
  },
  headline: {
    marginTop: 28,
    textAlign: 'center',
    color: colors.navy,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  supporting: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  visualWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 8,
    minHeight: 64,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
    borderRadius: radius.pill,
  },
  skipBtn: {
    minWidth: 56,
    minHeight: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nextPressed: {
    opacity: 0.88,
  },
  arrowIcon: {
    width: 18,
    height: 18,
    marginLeft: 0.5,
  },
  arrowBar: {
    position: 'absolute',
    left: 3.5,
    width: 11,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.textInverse,
  },
  arrowBarTop: {
    top: 5,
    transform: [{rotate: '45deg'}],
  },
  arrowBarBottom: {
    bottom: 5,
    transform: [{rotate: '-45deg'}],
  },
  checkIcon: {
    width: 18,
    height: 14,
  },
  checkShort: {
    position: 'absolute',
    left: 1,
    top: 7,
    width: 6,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.textInverse,
    transform: [{rotate: '45deg'}],
  },
  checkLong: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 12,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.textInverse,
    transform: [{rotate: '-45deg'}],
  },
  btnDisabled: {opacity: 0.45},
});
