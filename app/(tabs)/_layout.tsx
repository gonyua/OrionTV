import React from 'react';
import { Platform } from 'react-native';
import { Stack, Tabs } from 'expo-router';
import { Home, Search, Heart, Settings, Tv } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export default function TabsLayout() {
  const { deviceType, spacing } = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  if (deviceType !== 'mobile') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="live" />
        <Stack.Screen name="search" />
        <Stack.Screen name="settings" />
      </Stack>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: '#888',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#1c1c1e',
          borderTopWidth: 1,
          borderTopColor: '#333',
          paddingTop: spacing / 2,
          paddingBottom: insets.bottom + spacing / 2,
          paddingHorizontal: spacing,
          height: 52 + insets.bottom + (Platform.OS === 'ios' ? spacing / 2 : 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: '收藏',
          tabBarIcon: ({ color }) => <Heart size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: '直播',
          href: null,
          tabBarIcon: ({ color }) => <Tv size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '搜索',
          tabBarIcon: ({ color }) => <Search size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

