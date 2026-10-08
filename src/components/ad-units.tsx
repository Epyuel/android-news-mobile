import { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AdSize } from '@/constants/ads-types';
import { useAdsConfiguration, useAdsSdkReady } from '@/components/ads-provider';
import { getGoogleMobileAds } from '@/constants/google-mobile-ads';

export type BannerPlacement = 'bannerHome' | 'bannerPostDetails' | 'bannerVideo' | 'bannerDownload' | 'bannerSaved';

export function AdBanner({ placement, anchored = false, bottom = 0 }: { placement: BannerPlacement; anchored?: boolean; bottom?: number }) {
  const ads = useAdsConfiguration();
  const sdkReady = useAdsSdkReady();
  const sdk = getGoogleMobileAds();
  if (!sdk || !sdkReady || Platform.OS === 'web' || ads.adStatus !== 'on' || !ads.placements[placement] || !ads.admobBannerAdUnitId) return null;
  return <BannerRuntime key={`${placement}:${ads.admobBannerAdUnitId}`} Banner={sdk.BannerAd} size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER} unitId={ads.admobBannerAdUnitId} anchored={anchored} bottom={bottom} />;
}

function BannerRuntime({ Banner, size, unitId, anchored, bottom }: { Banner: NonNullable<ReturnType<typeof getGoogleMobileAds>>['BannerAd']; size: NonNullable<ReturnType<typeof getGoogleMobileAds>>['BannerAdSize']['ANCHORED_ADAPTIVE_BANNER']; unitId: string; anchored: boolean; bottom: number }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents={dimensions ? 'auto' : 'none'} style={[styles.banner, anchored ? styles.anchoredBanner : styles.inlineBanner, anchored ? { bottom, left: 18, right: 18 } : null, dimensions ? { height: dimensions.height } : anchored ? styles.bannerInvisible : styles.bannerHidden]}>
      <Banner
        unitId={unitId}
        size={size}
        width={Math.max(280, width - 36)}
        onAdLoaded={({ width, height }) => setDimensions({ width, height })}
        onAdFailedToLoad={() => setDimensions(null)}
      />
    </View>
  );
}

export function NativeFeedAd({ size = 'medium', enabled = true }: { size?: AdSize; enabled?: boolean }) {
  const ads = useAdsConfiguration();
  const sdk = getGoogleMobileAds();
  if (!sdk) return null;
  return <NativeFeedAdRuntime sdk={sdk} size={size} enabled={enabled} />;
}

function NativeFeedAdRuntime({ sdk, size, enabled }: { sdk: NonNullable<ReturnType<typeof getGoogleMobileAds>>; size: AdSize; enabled: boolean }) {
  const ads = useAdsConfiguration();
  const sdkReady = useAdsSdkReady();
  const theme = useTheme();
  const shouldLoad = Platform.OS !== 'web' && enabled && sdkReady && ads.adStatus === 'on' && ads.nativeAdsEnabled && Boolean(ads.admobNativeAdUnitId);
  const { nativeAd } = sdk.useNativeAd({ adUnitId: shouldLoad ? ads.admobNativeAdUnitId : null, autoLoad: shouldLoad });

  if (!nativeAd) return null;
  const AdView = sdk.NativeAdView;
  const Asset = sdk.NativeAsset;
  const Media = sdk.NativeMediaView;

  return (
    <AdView nativeAd={nativeAd} style={[styles.nativeCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }, size === 'large' && styles.nativeLarge]}>
      <View style={styles.nativeAttribution}>
        <Text style={styles.nativeBadge}>Ad</Text>
        <Text style={[styles.nativeSponsored, { color: theme.textSecondary }]}>Advertisement</Text>
      </View>
      <View style={styles.nativeCopy}>
        <View style={styles.nativeIdentity}>
          {nativeAd.icon?.url ? <Asset assetType={sdk.NativeAssetType.ICON}><Image source={{ uri: nativeAd.icon.url }} style={styles.nativeIcon} /></Asset> : null}
          <View style={styles.nativeTextGroup}>
            <Asset assetType={sdk.NativeAssetType.HEADLINE}><Text numberOfLines={2} style={[styles.nativeHeadline, { color: theme.text }]}>{nativeAd.headline}</Text></Asset>
            {nativeAd.body ? <Asset assetType={sdk.NativeAssetType.BODY}><Text numberOfLines={2} style={[styles.nativeBody, { color: theme.textSecondary }]}>{nativeAd.body}</Text></Asset> : null}
          </View>
        </View>
      </View>
      <Media style={[styles.nativeMedia, size === 'small' && styles.nativeMediaSmall]} />
      {nativeAd.callToAction ? <Asset assetType={sdk.NativeAssetType.CALL_TO_ACTION}><Text style={styles.nativeCta}>{nativeAd.callToAction}</Text></Asset> : null}
    </AdView>
  );
}

export function InterstitialController({ enabled, unitId, requestCount, interval }: { enabled: boolean; unitId: string; requestCount: number; interval: number }) {
  const sdk = getGoogleMobileAds();
  if (!sdk || !enabled || !unitId) return null;
  return <InterstitialRuntime sdk={sdk} unitId={unitId} requestCount={requestCount} interval={interval} />;
}

function InterstitialRuntime({ sdk, unitId, requestCount, interval }: { sdk: NonNullable<ReturnType<typeof getGoogleMobileAds>>; unitId: string; requestCount: number; interval: number }) {
  const { status, show } = sdk.useInterstitialAd({ adUnitId: unitId, autoLoad: true });
  const lastRequest = useRef(0);
  useEffect(() => {
    if (requestCount <= lastRequest.current) return;
    if (requestCount % Math.max(1, interval) !== 0) {
      lastRequest.current = requestCount;
      return;
    }
    if (status === 'loaded') {
      lastRequest.current = requestCount;
      show();
    } else if (status === 'error' || status === 'no-fill') {
      lastRequest.current = requestCount;
    }
  }, [interval, requestCount, show, status]);
  return null;
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', overflow: 'hidden' },
  inlineBanner: { marginVertical: 8 },
  anchoredBanner: { position: 'absolute', zIndex: 8, left: 0, right: 0 },
  bannerHidden: { height: 0 },
  bannerInvisible: { opacity: 0 },
  nativeCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginVertical: 10, padding: 12, gap: 10 },
  nativeLarge: { minHeight: 300 },
  nativeAttribution: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nativeBadge: { overflow: 'hidden', borderRadius: 9, backgroundColor: '#f0b52f', color: '#fff', paddingHorizontal: 9, paddingVertical: 4, fontSize: 12, fontWeight: '800' },
  nativeSponsored: { fontSize: 13, fontWeight: '500' },
  nativeMedia: { width: '100%', aspectRatio: 1.78, borderRadius: 9 },
  nativeMediaSmall: { aspectRatio: 2.4 },
  nativeCopy: { gap: 7 },
  nativeIdentity: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  nativeTextGroup: { flex: 1, gap: 5 },
  nativeIcon: { width: 58, height: 58, borderRadius: 9 },
  nativeHeadline: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  nativeBody: { fontSize: 14, lineHeight: 19 },
  nativeCta: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#10224b', color: '#fff', textAlign: 'center', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700' },
});
