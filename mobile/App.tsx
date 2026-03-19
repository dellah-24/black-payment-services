/**
 * BlackPayments Wallet - React Native Mobile App
 * 
 * A comprehensive mobile wallet for P2P USDT trading with DeFi integration
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ethers } from 'ethers';

// Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Icons
import { Ionicons } from '@expo/vector-icons';

// Context
import { WalletProvider, useWallet } from './src/context/WalletContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import ReceiveScreen from './src/screens/ReceiveScreen';
import P2PScreen from './src/screens/P2PScreen';
import DefiScreen from './src/screens/DefiScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SwapScreen from './src/screens/SwapScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AuthScreen from './src/screens/AuthScreen';
import KYCScreen from './src/screens/KYCScreen';

// Components
import { Button } from './src/components/Button';
import { Card } from './src/components/Card';
import { Input } from './src/components/Input';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Send: undefined;
  Receive: undefined;
  Swap: undefined;
  P2P: { screen?: string };
  Defi: undefined;
  Settings: undefined;
  KYC: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  P2P: undefined;
  Defi: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Tab Navigator
 */
function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'P2P') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          } else if (route.name === 'Defi') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Wallet' }}
      />
      <Tab.Screen 
        name="P2P" 
        component={P2PScreen}
        options={{ tabBarLabel: 'P2P' }}
      />
      <Tab.Screen 
        name="Defi" 
        component={DefiScreen}
        options={{ tabBarLabel: 'DeFi' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Main App Component
 */
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <ThemeProvider>
      <WalletProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen name="Auth">
                {(props) => (
                  <AuthScreen {...props} onAuthSuccess={() => setIsAuthenticated(true)} />
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen 
                  name="Send" 
                  component={SendScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen 
                  name="Receive" 
                  component={ReceiveScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen 
                  name="Swap" 
                  component={SwapScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen 
                  name="KYC" 
                  component={KYCScreen}
                  options={{ presentation: 'modal' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </WalletProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
