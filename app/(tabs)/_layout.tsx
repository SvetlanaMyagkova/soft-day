import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  AppLanguage,
  LANGUAGE_STORAGE_KEY,
  getAutomaticLanguage,
  getTranslation,
} from '../../constants/i18n';

const colors = {
  background: '#F5F0E6',
  hunterGreen: '#123524',
  mutedText: '#7A6A58',
};

export default function TabLayout() {
  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());

  const t = getTranslation(language);

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
    }, [])
  );

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (savedLanguage === 'ru' || savedLanguage === 'en') {
        setLanguage(savedLanguage);
        return;
      }

      setLanguage(getAutomaticLanguage());
    } catch (error) {
      setLanguage(getAutomaticLanguage());
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.hunterGreen,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: 86,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.today,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'leaf' : 'leaf-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: t.history,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="charts"
        options={{
          title: t.charts,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}