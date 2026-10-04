import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ChartNoAxesColumnIncreasing, Lightbulb, Newspaper, Smartphone } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const highlights = [
  { label: 'News', Icon: Newspaper, color: '#1595f4' },
  { label: 'Tips', Icon: Lightbulb, color: '#22c55e' },
  { label: 'Tech', Icon: Smartphone, color: '#8b5cf6' },
  { label: 'More', Icon: ChartNoAxesColumnIncreasing, color: '#f59e0b' },
];

export function AnimatedSplashOverlay({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onComplete, 1900);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onComplete}>
      <View onLayout={() => void SplashScreen.hideAsync()} style={styles.overlay}>
        <Image source={require('@/assets/images/dana-background-source.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.safeContent} edges={['top', 'bottom']}>
          <View style={styles.content}>
            <Image source={require('@/assets/images/dana-logo-source.png')} style={styles.logo} contentFit="contain" />
            <Text style={styles.subtitle}>Your Daily Source of</Text>
            <View style={styles.tagline}>
              <Text style={[styles.taglineText, { color: '#46e7ff' }]}>Information</Text>
              <Text style={styles.separator}>|</Text>
              <Text style={[styles.taglineText, { color: '#df76ff' }]}>News</Text>
              <Text style={styles.separator}>|</Text>
              <Text style={styles.taglineText}>Tips</Text>
            </View>
            <View style={styles.highlights}>
              {highlights.map(({ label, Icon, color }) => (
                <View key={label} style={styles.highlight}>
                  <View style={[styles.highlightIcon, { backgroundColor: color }]}>
                    <Icon size={23} color="#fff" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.highlightLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <ActivityIndicator color="#28d9f4" size="large" style={styles.loader} />
            <Text style={styles.loading}>Loading...</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function AnimatedIcon() {
  return <Image source={require('@/assets/images/dana-logo-source.png')} style={styles.smallIcon} contentFit="contain" />;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#003e47', overflow: 'hidden' },
  safeContent: { flex: 1, justifyContent: 'center' },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: 22 },
  logo: { width: 250, height: 176, marginBottom: 20 },
  subtitle: { color: '#fff', fontSize: 19, fontWeight: '500' },
  tagline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  taglineText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  separator: { color: '#dce9ff', fontSize: 17 },
  highlights: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 40 },
  highlight: { minWidth: 62, alignItems: 'center', gap: 8 },
  highlightIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  highlightLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  loader: { marginTop: 58 },
  loading: { color: '#e5edff', fontSize: 14, letterSpacing: 2, marginTop: 12 },
  smallIcon: { width: 76, height: 76 },
});
