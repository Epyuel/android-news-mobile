/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppPreferences } from '@/components/app-preferences-provider';

export function useTheme() {
  const scheme = useColorScheme();
  const { colorMode } = useAppPreferences();
  const theme = colorMode === 'system' ? (scheme === 'unspecified' ? 'light' : scheme) : colorMode;

  return Colors[theme];
}
