import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import colors from '@/constants/colors';

export default function IndexScreen() {
  const [target, setTarget] = useState<'onboarding' | 'tabs' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@scanly_onboarding').then(val => {
      setTarget(val === 'done' ? 'tabs' : 'onboarding');
    });
  }, []);

  if (!target) {
    return <View style={{ flex: 1, backgroundColor: colors.light.background }} />;
  }

  if (target === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
