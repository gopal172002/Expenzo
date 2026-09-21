import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
  Pressable,
} from 'react-native';
import {colors, control, radius, spacing, typography} from '../theme/tokens';

type AppTextInputProps = TextInputProps & {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const AppTextInput = ({
  label,
  error,
  helper,
  style,
  multiline,
  containerStyle,
  ...rest
}: AppTextInputProps) => (
  <View style={[styles.inputWrap, containerStyle]}>
    {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
    <RNTextInput
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={[
        styles.input,
        multiline ? styles.inputMultiline : null,
        error ? styles.inputError : null,
        rest.editable === false ? styles.inputReadonly : null,
        style,
      ]}
      accessibilityLabel={label}
      {...rest}
    />
    {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    {!error && helper ? <Text style={styles.inputHelper}>{helper}</Text> : null}
  </View>
);

export const FormInput = (props: TextInputProps) => <AppTextInput {...props} />;

export const OTPInput = ({
  value,
  onChangeText,
  length = 6,
  error,
}: {
  value: string;
  onChangeText: (v: string) => void;
  length?: number;
  error?: string;
}) => {
  const digits = value.replace(/\D/g, '').slice(0, length).split('');
  while (digits.length < length) {
    digits.push('');
  }
  return (
    <View style={styles.otpWrap}>
      <RNTextInput
        value={value.replace(/\D/g, '').slice(0, length)}
        onChangeText={t => onChangeText(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.otpHidden}
        autoFocus
        accessibilityLabel={`${length}-digit OTP`}
      />
      <View style={styles.otpBoxes} pointerEvents="none">
        {digits.map((d, i) => (
          <View
            key={i}
            style={[
              styles.otpBox,
              d ? styles.otpBoxFilled : null,
              error ? styles.otpBoxError : null,
              i === Math.min(value.length, length - 1) ? styles.otpBoxFocus : null,
            ]}>
            <Text style={styles.otpDigit}>{d}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
};

export const SelectInput = ({
  label,
  options,
  value,
  onChange,
  helper,
}: {
  label?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) => (
  <View style={styles.inputWrap}>
    {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
    <View style={styles.selectWrap}>
      {options.map(opt => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => onChange(opt)}
            style={[styles.selectChip, selected ? styles.selectChipActive : null]}>
            <Text
              style={[styles.selectChipText, selected ? styles.selectChipTextActive : null]}
              numberOfLines={1}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
    {helper ? <Text style={styles.inputHelper}>{helper}</Text> : null}
  </View>
);

/** Soft gray auth field — matches minimal “Enter mobile number” style. */
export const SoftField = ({
  prefix,
  error,
  style,
  ...rest
}: TextInputProps & {
  prefix?: string;
  error?: string;
}) => (
  <View style={styles.softWrap}>
    <View style={[styles.softField, error ? styles.softFieldError : null]}>
      {prefix ? <Text style={styles.softPrefix}>{prefix}</Text> : null}
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.softInput, style]}
        {...rest}
      />
    </View>
    {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
  </View>
);

export const InviteCodeInput = ({
  value,
  onChangeText,
  error,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}) => (
  <SoftField
    value={value}
    onChangeText={t => onChangeText(t.toUpperCase())}
    placeholder="e.g. DEM_EMP1000"
    autoCapitalize="characters"
    autoCorrect={false}
    autoFocus
    error={error}
    accessibilityLabel="Invite code"
    style={styles.inviteInput}
  />
);

export const MobileNumberInput = ({
  value,
  onChangeText,
  error,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}) => (
  <SoftField
    prefix="+91"
    value={value}
    onChangeText={t => onChangeText(t.replace(/\D/g, '').slice(0, 10))}
    placeholder="Enter your mobile number"
    keyboardType="phone-pad"
    textContentType="telephoneNumber"
    maxLength={10}
    autoFocus
    error={error}
    accessibilityLabel="Mobile number"
  />
);

export const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.filterChip, active ? styles.filterChipActive : null]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{selected: active}}>
    <Text
      style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}
      numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  inputWrap: {marginBottom: spacing.md},
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: control.inputHeight,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.paper,
  },
  inputMultiline: {minHeight: 96, textAlignVertical: 'top', paddingTop: 14},
  inputReadonly: {backgroundColor: colors.muted, color: colors.textSecondary},
  inputError: {borderColor: colors.danger},
  inputErrorText: {
    color: colors.dangerText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  inputHelper: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  softWrap: {marginBottom: spacing.md},
  softField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: control.heightLg,
    paddingHorizontal: 18,
    gap: 10,
  },
  softFieldError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  softPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  softInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    paddingVertical: 16,
    minHeight: control.heightLg,
  },
  inviteInput: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  otpWrap: {marginBottom: spacing.md},
  otpHidden: {position: 'absolute', opacity: 0, height: 1, width: 1},
  otpBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  otpBoxFilled: {
    borderColor: colors.navy,
    backgroundColor: colors.paper,
  },
  otpBoxFocus: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.paper,
  },
  otpBoxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  otpDigit: {fontSize: 22, fontWeight: '700', color: colors.navy},
  selectWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  selectChip: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.paper,
    maxWidth: '100%',
  },
  selectChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  selectChipText: {color: colors.textSecondary, fontSize: 13, fontWeight: '600'},
  selectChipTextActive: {color: colors.primary, fontWeight: '700'},
  filterChip: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.paper,
    maxWidth: '100%',
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {color: colors.textSecondary, fontSize: 12, fontWeight: '600'},
  filterChipTextActive: {color: colors.primary, fontWeight: '700'},
});
