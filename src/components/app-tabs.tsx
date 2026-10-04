import { usePathname, useRouter } from 'expo-router';
import { Bookmark, CirclePlay, Download, House, Share2 } from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

const NAV_PATH = 'M 29 1 H 145 C 162 1 160 31 200 31 C 240 31 238 1 255 1 H 371 Q 399 1 399 29 V 35 Q 399 63 371 63 H 29 Q 1 63 1 35 V 29 Q 1 1 29 1 Z';

export type AppTabKey = 'home' | 'video' | 'social' | 'download' | 'saved';

const beforeDownload = [
  { key: 'home', path: '/', Icon: House },
  { key: 'video', path: '/video', Icon: CirclePlay },
] as const;
const afterDownload = [
  { key: 'download', path: '/download', Icon: Download },
  { key: 'saved', path: '/saved', Icon: Bookmark },
] as const;

export default function AppTabs({ active, bottomInset }: { active: AppTabKey; bottomInset: number }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const tint = theme.text === '#edf4ff' ? 'dark' : 'light';

  return (
    <View style={[styles.container, { bottom: bottomInset + 4 }]}>
      <MaskedView
        pointerEvents="none"
        style={styles.glassLayer}
        maskElement={(
          <Svg width="100%" height="100%" viewBox="0 0 400 64" preserveAspectRatio="none" style={styles.mask}>
            <Path d={NAV_PATH} fill="#fff" />
          </Svg>
        )}
      >
      </MaskedView>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 400 64" preserveAspectRatio="none" style={styles.surface}>
        <Path
          d={NAV_PATH}
          fill={theme.backgroundNav}
          fillOpacity={0.86}
          stroke={theme.backgroundSelected}
          strokeOpacity={0.55}
          strokeWidth={1}
        />
      </Svg>
      {beforeDownload.map((tab) => <TabButton key={tab.key} tab={tab} active={active} pathname={pathname} router={router} label={t(tab.key)} muted={theme.textSecondary} />)}
      <View style={styles.downloadSlot}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === 'social' }} accessibilityLabel={t('social')} onPress={() => router.push('/social')} style={styles.downloadButton}>
          <Share2 size={25} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>
      {afterDownload.map((tab) => <TabButton key={tab.key} tab={tab} active={active} pathname={pathname} router={router} label={t(tab.key)} muted={theme.textSecondary} />)}
    </View>
  );
}

function TabButton({ tab, active, pathname, router, label, muted }: {
  tab: { key: AppTabKey; path: string; Icon: typeof House };
  active: AppTabKey;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  label: string;
  muted: string;
}) {
  const selected = active === tab.key || (tab.key === 'home' && pathname.startsWith('/news/'));
  const tint = selected ? '#147fe8' : muted;
  const Icon = tab.Icon;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => router.push(tab.path)} style={styles.tab}>
      <Icon size={23} color={tint} strokeWidth={selected ? 2.4 : 2} />
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
      {selected ? <View style={styles.indicator} /> : <View style={styles.indicatorPlaceholder} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 18, right: 18, height: 64, flexDirection: 'row', paddingHorizontal: 4, paddingTop: 5, paddingBottom: 2 },
  glassLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mask: { width: '100%', height: '100%' },
  blur: { flex: 1 },
  surface: { position: 'absolute', top: 0, left: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 54, gap: 2 },
  downloadSlot: { flex: 1, alignItems: 'center', position: 'relative' },
  downloadButton: { position: 'absolute', top: -27, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#28c64b', shadowColor: '#168b31', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  label: { fontSize: 11, fontWeight: '600' },
  indicator: { width: 22, height: 3, borderRadius: 2, backgroundColor: '#147fe8' },
  indicatorPlaceholder: { width: 22, height: 3 },
});
