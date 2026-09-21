import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {toastConfig} from './src/config/toastConfig';
import {FloatingTabBar} from './src/components/FloatingTabBar';
import {AppProvider, useAppData} from './src/context/AppContext';
import {RootStackParamList} from './src/navigation';
import {HomeScreen} from './src/screens/HomeScreen';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {PaymentScreen} from './src/screens/PaymentScreen';
import {PaymentQrPayScreen} from './src/screens/PaymentQrPayScreen';
import {PaymentResultScreen} from './src/screens/PaymentResultScreen';
import {ScannerScreen} from './src/screens/ScannerScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {TransactionDetailScreen} from './src/screens/TransactionDetailScreen';
import {TransactionHistoryScreen} from './src/screens/TransactionHistoryScreen';
import {colors} from './src/theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.page,
    card: colors.paper,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

const MainTabs = () => (
  <Tabs.Navigator
    tabBar={props => <FloatingTabBar {...props} />}
    screenOptions={{
      headerShown: false,
      tabBarHideOnKeyboard: true,
      headerTitleStyle: {fontWeight: '700', color: colors.navy},
      headerShadowVisible: false,
      headerStyle: {backgroundColor: colors.paper},
    }}>
    <Tabs.Screen name="Home" component={HomeScreen} />
    <Tabs.Screen name="History" component={TransactionHistoryScreen} />
    <Tabs.Screen name="Settings" component={SettingsScreen} />
  </Tabs.Navigator>
);

const Navigator = () => {
  const {profile} = useAppData();
  if (!profile) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: '',
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: {color: colors.navy, fontWeight: '700'},
          headerStyle: {backgroundColor: colors.paper},
          contentStyle: {backgroundColor: colors.page},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{headerShown: false}}
        />
        <Stack.Screen name="Scan" component={ScannerScreen} options={{title: 'Scan QR'}} />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{title: 'Confirm payment'}}
        />
        <Stack.Screen
          name="PaymentQrPay"
          component={PaymentQrPayScreen}
          options={{title: 'Scan to pay'}}
        />
        <Stack.Screen
          name="PaymentResult"
          component={PaymentResultScreen}
          options={{title: 'Payment result'}}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailScreen}
          options={{title: 'Expense detail'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <AppProvider>
        <Navigator />
      </AppProvider>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}

export default App;
