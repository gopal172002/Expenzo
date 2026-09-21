import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, radius, screen, shadow, spacing, typography} from '../theme/tokens';

type TabKey = 'Home' | 'History' | 'Settings';

const LABELS: Record<TabKey, string> = {
  Home: 'Home',
  History: 'History',
  Settings: 'You',
};

function HomeIcon({focused, color}: {focused: boolean; color: string}) {
  const stroke = focused ? 2 : 1.6;
  return (
    <View style={iconStyles.box}>
      <View
        style={[
          iconStyles.roof,
          {
            borderBottomColor: color,
            borderLeftWidth: 11,
            borderRightWidth: 11,
            borderBottomWidth: 9,
          },
        ]}
      />
      <View
        style={[
          iconStyles.houseBody,
          {
            borderColor: color,
            borderWidth: stroke,
            backgroundColor: focused ? color : 'transparent',
          },
        ]}>
        {focused ? (
          <View style={iconStyles.doorFilled} />
        ) : (
          <View style={[iconStyles.door, {borderColor: color}]} />
        )}
      </View>
    </View>
  );
}

function HistoryIcon({focused, color}: {focused: boolean; color: string}) {
  const w = focused ? 2.2 : 1.6;
  return (
    <View style={iconStyles.listBox}>
      {[0, 1, 2].map(i => (
        <View key={i} style={iconStyles.listRow}>
          <View
            style={[
              iconStyles.listDot,
              {
                backgroundColor: color,
                width: focused ? 5 : 4,
                height: focused ? 5 : 4,
              },
            ]}
          />
          <View
            style={[
              iconStyles.listLine,
              {backgroundColor: color, height: w, opacity: 1 - i * 0.12},
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function YouIcon({focused, color}: {focused: boolean; color: string}) {
  if (focused) {
    return (
      <View style={[iconStyles.youFilled, {backgroundColor: color}]}>
        <View style={iconStyles.youHeadFilled} />
        <View style={iconStyles.youBodyFilled} />
      </View>
    );
  }
  return (
    <View style={[iconStyles.youOutline, {borderColor: color}]}>
      <View style={[iconStyles.youHeadOutline, {borderColor: color}]} />
      <View style={[iconStyles.youBodyOutline, {borderColor: color}]} />
    </View>
  );
}

function TabGlyph({name, focused}: {name: string; focused: boolean}) {
  const color = focused ? colors.primary : colors.textMuted;
  if (name === 'Home') {
    return <HomeIcon focused={focused} color={color} />;
  }
  if (name === 'History') {
    return <HistoryIcon focused={focused} color={color} />;
  }
  return <YouIcon focused={focused} color={color} />;
}

export function FloatingTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {paddingBottom: Math.max(insets.bottom, screen.tabBarBottomPad)},
      ]}>
      <View style={styles.pill} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const {options} = descriptors[route.key];
          const label =
            LABELS[route.name as TabKey] ??
            (typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={focused ? {selected: true} : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({pressed}) => [
                styles.item,
                focused ? styles.itemActive : null,
                pressed ? {opacity: 0.85} : null,
              ]}
              hitSlop={6}>
              <TabGlyph name={route.name} focused={focused} />
              <Text
                style={[
                  styles.label,
                  focused ? styles.labelActive : styles.labelInactive,
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  box: {width: 22, height: 22, alignItems: 'center', justifyContent: 'flex-end'},
  roof: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  houseBody: {
    width: 16,
    height: 12,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  door: {
    width: 5,
    height: 7,
    borderTopWidth: 1.4,
    borderLeftWidth: 1.4,
    borderRightWidth: 1.4,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  doorFilled: {
    width: 5,
    height: 7,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  listBox: {width: 22, height: 18, justifyContent: 'space-between', paddingVertical: 1},
  listRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  listDot: {borderRadius: 3},
  listLine: {flex: 1, borderRadius: 1},
  youFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
    overflow: 'hidden',
  },
  youHeadFilled: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paper,
    marginBottom: 1.5,
  },
  youBodyFilled: {
    width: 14,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: colors.paper,
  },
  youOutline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    overflow: 'hidden',
  },
  youHeadOutline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.4,
    marginBottom: 1.5,
  },
  youBodyOutline: {
    width: 13,
    height: 7,
    borderTopWidth: 1.4,
    borderLeftWidth: 1.4,
    borderRightWidth: 1.4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    minHeight: screen.tabBarHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadow.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    minHeight: 48,
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    ...typography.label,
    letterSpacing: -0.1,
    textTransform: 'none',
    fontSize: 11,
  },
  labelInactive: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
