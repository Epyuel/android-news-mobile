import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';

type GoogleMobileAdsSdk = typeof import('react-native-google-mobile-ads');
let cachedSdk: GoogleMobileAdsSdk | null | undefined;

export function getGoogleMobileAds(): GoogleMobileAdsSdk | null {
  if (Platform.OS === 'web' || Constants.appOwnership === AppOwnership.Expo) return null;
  if (cachedSdk !== undefined) return cachedSdk;
  try {
    cachedSdk = require('react-native-google-mobile-ads') as GoogleMobileAdsSdk;
  } catch {
    cachedSdk = null;
  }
  return cachedSdk;
}
