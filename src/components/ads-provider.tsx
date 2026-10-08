import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/constants/firebase-client';
import { defaultAdsConfiguration } from '@/constants/ads-types';
import type { AdsConfiguration } from '@/constants/ads-types';
import { getGoogleMobileAds } from '@/constants/google-mobile-ads';

type AdsContextValue = { config: AdsConfiguration; showStartupAd: () => void; sdkReady: boolean };
const AdsContext = createContext<AdsContextValue>({ config: defaultAdsConfiguration, showStartupAd: () => undefined, sdkReady: false });

function normalizeAdsConfig(value: Record<string, unknown>): AdsConfiguration {
  const placements = value.placements && typeof value.placements === 'object'
    ? value.placements as Partial<AdsConfiguration['placements']>
    : {};
  const nativeAdStyles = value.nativeAdStyles && typeof value.nativeAdStyles === 'object'
    ? value.nativeAdStyles as Partial<AdsConfiguration['nativeAdStyles']>
    : {};
  return {
    ...defaultAdsConfiguration,
    ...value,
    adStatus: value.adStatus === 'on' ? 'on' : 'off',
    primaryAdNetwork: 'admob',
    nativeAdsEnabled: value.nativeAdsEnabled !== false,
    placements: { ...defaultAdsConfiguration.placements, ...placements },
    nativeAdStyles: { ...defaultAdsConfiguration.nativeAdStyles, ...nativeAdStyles },
    interstitialAdInterval: Math.max(1, Number(value.interstitialAdInterval) || 3),
    nativeAdInterval: Math.max(1, Number(value.nativeAdInterval ?? value.nativeAdIndex) || 4),
  } as AdsConfiguration;
}

export function AdsProvider({ children }: PropsWithChildren) {
  const [config, setConfig] = useState(defaultAdsConfiguration);
  const [ready, setReady] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [startupRequested, setStartupRequested] = useState(false);
  const adsSdk = getGoogleMobileAds();

  useEffect(() => onSnapshot(doc(db, 'ads', 'config'), (snapshot) => {
    setConfig(snapshot.exists() ? normalizeAdsConfig(snapshot.data()) : defaultAdsConfiguration);
    setConfigLoaded(true);
  }, () => { setConfig(defaultAdsConfiguration); setConfigLoaded(true); }), []);

  const showStartupAd = useCallback(() => {
    setStartupRequested(true);
  }, []);
  const value = useMemo(() => ({ config, showStartupAd, sdkReady: ready }), [config, ready, showStartupAd]);
  return (
    <AdsContext.Provider value={value}>
      {children}
      {adsSdk ? <NativeAdsRuntime sdk={adsSdk} config={config} configLoaded={configLoaded} ready={ready} setReady={setReady} startupRequested={startupRequested} /> : null}
    </AdsContext.Provider>
  );
}

function NativeAdsRuntime({ sdk, config, configLoaded, ready, setReady, startupRequested }: {
  sdk: NonNullable<ReturnType<typeof getGoogleMobileAds>>;
  config: AdsConfiguration;
  configLoaded: boolean;
  ready: boolean;
  setReady: (value: boolean) => void;
  startupRequested: boolean;
}) {
  const initialized = useRef(false);
  const startupOffered = useRef(false);
  const appOpenEnabled = config.adStatus === 'on' && (config.placements.appOpenStart || config.placements.appOpenResume);
  const appOpen = sdk.useAppOpenAd({
    adUnitId: appOpenEnabled ? config.admobAppOpenAdUnitId || null : null,
    autoLoad: ready && appOpenEnabled,
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void sdk.default().initialize().catch(() => undefined).finally(() => setReady(true));
  }, [sdk, setReady]);

  useEffect(() => {
    if (!startupRequested || !ready || !configLoaded || startupOffered.current) return;
    if (config.adStatus !== 'on' || !config.placements.appOpenStart || !config.admobAppOpenAdUnitId) {
      startupOffered.current = true;
      return;
    }
    if (appOpen.status === 'loaded') {
      startupOffered.current = true;
      appOpen.show();
    } else if (appOpen.status === 'error' || appOpen.status === 'no-fill') {
      startupOffered.current = true;
    }
  }, [appOpen.show, appOpen.status, config.adStatus, config.placements.appOpenStart, config.admobAppOpenAdUnitId, configLoaded, ready, startupRequested]);

  useEffect(() => {
    if (appOpen.status === 'closed' && appOpenEnabled && ready) appOpen.load();
  }, [appOpen.load, appOpen.status, appOpenEnabled, ready]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active' && config.adStatus === 'on' && config.placements.appOpenResume && appOpen.status === 'loaded') appOpen.show();
      previous = next;
    });
    return () => subscription.remove();
  }, [appOpen.show, appOpen.status, config.adStatus, config.placements.appOpenResume]);

  return null;
}

export function useAdsConfiguration() {
  return useContext(AdsContext).config;
}

export function useAdsSdkReady() {
  return useContext(AdsContext).sdkReady;
}

export function useStartupAd() {
  return useContext(AdsContext).showStartupAd;
}
