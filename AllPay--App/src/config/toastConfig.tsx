import React from 'react';
import {Dimensions, StyleSheet} from 'react-native';
import {BaseToast, ErrorToast} from 'react-native-toast-message';
import type {ToastConfigParams} from 'react-native-toast-message';
import {colors, radius, shadow} from '../theme/tokens';

const screenW = Dimensions.get('window').width;
const maxToastWidth = Math.min(360, screenW * 0.92);

const t1 = {
  fontSize: 13,
  fontWeight: '700' as const,
  lineHeight: 17,
  color: colors.navy,
};

const t2 = {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '400' as const,
  color: colors.textSecondary,
  marginTop: 2,
};

const content = {
  paddingVertical: 8,
  paddingHorizontal: 12,
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    maxWidth: maxToastWidth,
    width: maxToastWidth,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    ...shadow.elevated,
    marginTop: 4,
    alignSelf: 'center',
  },
  successAccent: {borderLeftColor: colors.success},
  errorAccent: {borderLeftColor: colors.danger},
  infoAccent: {borderLeftColor: colors.primary},
});

export const toastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      style={[styles.base, styles.successAccent]}
      contentContainerStyle={content}
      text1Style={t1}
      text2Style={t2}
    />
  ),
  error: (props: ToastConfigParams<any>) => (
    <ErrorToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      style={[styles.base, styles.errorAccent]}
      contentContainerStyle={content}
      text1Style={t1}
      text2Style={t2}
    />
  ),
  info: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      style={[styles.base, styles.infoAccent]}
      contentContainerStyle={content}
      text1Style={t1}
      text2Style={t2}
    />
  ),
};
