import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppPreferencesProvider } from '@/components/app-preferences-provider';
import { MobileSearchProvider } from '@/components/reader-ui';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function TabLayout() {
  const [startupComplete, setStartupComplete] = useState(false);

  return (
    <AppPreferencesProvider>
      <MobileSearchProvider>
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
          {!startupComplete ? <AnimatedSplashOverlay onComplete={() => setStartupComplete(true)} /> : null}
        </View>
      </MobileSearchProvider>
    </AppPreferencesProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
