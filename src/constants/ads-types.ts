export type AdPlacementKey =
  | 'bannerHome'
  | 'bannerPostDetails'
  | 'bannerVideo'
  | 'bannerDownload'
  | 'bannerSaved'
  | 'interstitialPostList'
  | 'interstitialPostDetails'
  | 'nativePostList'
  | 'nativePostDetails'
  | 'nativeExitDialog'
  | 'appOpenStart'
  | 'appOpenResume';

export type AdSize = 'small' | 'medium' | 'large';

export interface AdsConfiguration {
  adStatus: 'on' | 'off';
  primaryAdNetwork: 'admob';
  admobAppId: string;
  admobBannerAdUnitId: string;
  admobInterstitialAdUnitId: string;
  admobNativeAdUnitId: string;
  admobAppOpenAdUnitId: string;
  nativeAdsEnabled: boolean;
  placements: Record<AdPlacementKey, boolean>;
  interstitialAdInterval: number;
  nativeAdInterval: number;
  nativeAdStyles: {
    postList: AdSize;
    videoList: AdSize;
    postDetails: AdSize;
    exitDialog: AdSize;
  };
}

export const defaultAdsConfiguration: AdsConfiguration = {
  adStatus: 'off',
  primaryAdNetwork: 'admob',
  admobAppId: '',
  admobBannerAdUnitId: '',
  admobInterstitialAdUnitId: '',
  admobNativeAdUnitId: '',
  admobAppOpenAdUnitId: '',
  nativeAdsEnabled: true,
  placements: {
    bannerHome: true,
    bannerPostDetails: true,
    bannerVideo: true,
    bannerDownload: true,
    bannerSaved: true,
    interstitialPostList: true,
    interstitialPostDetails: true,
    nativePostList: true,
    nativePostDetails: true,
    nativeExitDialog: true,
    appOpenStart: true,
    appOpenResume: true,
  },
  interstitialAdInterval: 3,
  nativeAdInterval: 4,
  nativeAdStyles: { postList: 'medium', videoList: 'large', postDetails: 'large', exitDialog: 'medium' },
};
