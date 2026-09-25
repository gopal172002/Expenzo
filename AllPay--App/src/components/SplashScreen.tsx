import React, {useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme/tokens';

const logo = require('../assets/brand/splash-logo.png');

/** Full-screen branded splash shown while the app finishes bootstrapping. */
export const SplashScreen = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.root} accessibilityLabel="AllPay loading">
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Animated.View style={[styles.markWrap, {opacity, transform: [{scale}]}]}>
        <View style={styles.logoClip}>
          <Image source={logo} style={styles.logo} resizeMode="cover" />
        </View>
        <Text style={styles.wordmark}>AllPay</Text>
        <Text style={styles.tag}>Company expenses</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandGradientEnd,
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: colors.brandGradientStart,
    opacity: 0.85,
  },
  glowBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.brandGradientEnd,
    opacity: 0.35,
  },
  markWrap: {
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 1,
  },
  logoClip: {
    width: 112,
    height: 112,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logo: {
    width: 112,
    height: 112,
  },
  wordmark: {
    ...typography.title,
    color: colors.textInverse,
    marginTop: spacing.sm,
  },
  tag: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.72)',
  },
});
