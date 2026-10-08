import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppPreferencesProvider } from '@/components/app-preferences-provider';
import { MobileSearchProvider } from '@/components/reader-ui';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AdsProvider, useStartupAd } from '@/components/ads-provider';
import { useRouter } from 'expo-router';
import { configureNotifications } from '@/lib/push-notifications';

export default function TabLayout() {
  const [startupComplete, setStartupComplete] = useState(false);

  return (
    <AppPreferencesProvider>
      <AdsProvider>
        <MobileSearchProvider>
          <View style={styles.root}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
            <NotificationNavigation />
            {!startupComplete ? <AnimatedSplashOverlay onComplete={() => setStartupComplete(true)} /> : null}
            {startupComplete ? <StartupAdTrigger /> : null}
          </View>
        </MobileSearchProvider>
      </AdsProvider>
    </AppPreferencesProvider>
  );
}

function NotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    const openNotificationTarget = (response: import('expo-notifications').NotificationResponse) => {
      const target = response.notification.request.content.data?.screen;
      switch (target) {
        case 'video': router.push('/video'); break;
        case 'social': router.push('/social'); break;
        case 'saved': router.push('/saved'); break;
        case 'download': router.push('/download'); break;
        default: router.push('/');
      }
    };

    return configureNotifications(openNotificationTarget);
  }, [router]);

  return null;
}

function StartupAdTrigger() {
  const showStartupAd = useStartupAd();
  useEffect(() => showStartupAd(), [showStartupAd]);
  return null;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
