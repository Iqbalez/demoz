import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Text } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981', // Emerald-500 matching dashboard primary
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#090e1a', // Slate navy background
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          paddingTop: 6,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#090e1a',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '800',
          color: '#f8fafc',
          letterSpacing: -0.5,
        },
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Demoz Clock',
          tabBarLabel: 'Clock',
          headerTitle: 'DEMOZ GATEWAY',
          // Correct native Text elements instead of HTML span
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18, fontWeight: 'bold' }}>📍</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Logs History',
          tabBarLabel: 'History',
          headerTitle: 'ATTENDANCE LOGS',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18, fontWeight: 'bold' }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Request Leave',
          tabBarLabel: 'Leave',
          headerTitle: 'LEAVE PLANNER',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18, fontWeight: 'bold' }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'My Wallet',
          tabBarLabel: 'Wallet',
          headerTitle: 'PAYROLL LOCKER',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18, fontWeight: 'bold' }}>💳</Text>,
        }}
      />
    </Tabs>
  );
}
