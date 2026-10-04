import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import i18n from '@/constants/i18n';

type ColorMode = 'system' | 'light' | 'dark';
type Language = 'en' | 'am';
type Preferences = {
  colorMode: ColorMode;
  language: Language;
  setColorMode: (mode: ColorMode) => void;
  setLanguage: (language: Language) => void;
};

const STORAGE_KEY = 'app-preferences-v1';
const PreferencesContext = createContext<Preferences | null>(null);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');
  const [language, setLanguageState] = useState<Language>(i18n.language === 'am' ? 'am' : 'en');

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (!active || !raw) return;
      try {
        const saved = JSON.parse(raw) as { colorMode?: ColorMode; language?: Language };
        if (saved.colorMode && ['system', 'light', 'dark'].includes(saved.colorMode)) setColorModeState(saved.colorMode);
        if (saved.language && ['en', 'am'].includes(saved.language)) {
          setLanguageState(saved.language);
          await i18n.changeLanguage(saved.language);
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ colorMode: mode, language }));
  };
  const setLanguage = (next: Language) => {
    setLanguageState(next);
    void i18n.changeLanguage(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ colorMode, language: next }));
  };

  const value = useMemo(() => ({ colorMode, language, setColorMode, setLanguage }), [colorMode, language]);
  const isDark = colorMode === 'system' ? systemScheme === 'dark' : colorMode === 'dark';

  return (
    <PreferencesContext.Provider value={value}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  return value;
}
