import { Image } from 'expo-image';
import { ArrowLeft, ArrowRight, Bell, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, ExternalLink, Info, Search, Settings, Share2, Shield, Star, Trash2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Pressable, ScrollView, Share, StatusBar, StyleSheet, Switch, Text, TextInput, View, type TextStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { doc, increment, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAppPreferences } from '@/components/app-preferences-provider';
import { Colors } from '@/constants/theme';
import type { AppLegalSettings, News, NewsCategory } from '@/constants/news-types';
import { useTheme } from '@/hooks/use-theme';
import AppTabs, { type AppTabKey } from '@/components/app-tabs';
import { db } from '@/constants/firebase-client';
import appConfig from '../../app.json';
import { AdBanner, InterstitialController, NativeFeedAd, type BannerPlacement } from '@/components/ad-units';
import { useAdsConfiguration } from '@/components/ads-provider';

const playStoreAppSearch = 'https://play.google.com/store/search?q=DANA%20HD&c=apps';
const playStorePublisherSearch = 'https://play.google.com/store/search?q=Kana%20Plus&c=apps';
const publicNewsBaseUrl = (process.env.EXPO_PUBLIC_NEWS_BASE_URL || 'https://www.takoma.kanapress.net').replace(/\/$/, '');

type LegalHtmlNode = { tag: string; attributes: Record<string, string>; children: Array<LegalHtmlNode | string> };

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' } as Record<string, string>)[code.toLowerCase()] ?? entity;
  });
}

function parseLegalHtml(html: string): LegalHtmlNode[] {
  const root: LegalHtmlNode = { tag: 'root', attributes: {}, children: [] };
  const stack = [root];
  const voidTags = new Set(['br', 'hr', 'img']);
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi) ?? [];

  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      const tag = token.match(/^<\/\s*([\w:-]+)/)?.[1]?.toLowerCase();
      if (!tag) continue;
      for (let index = stack.length - 1; index > 0; index--) {
        if (stack[index].tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }

    if (!token.startsWith('<')) {
      stack[stack.length - 1].children.push(decodeHtmlEntities(token));
      continue;
    }

    const tagMatch = token.match(/^<\s*([\w:-]+)/);
    if (!tagMatch) continue;
    const tag = tagMatch[1].toLowerCase();
    const attributeSource = token.slice(tagMatch[0].length, token.lastIndexOf('>'));
    const attributes: Record<string, string> = {};
    const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attribute: RegExpExecArray | null;
    while ((attribute = attributePattern.exec(attributeSource))) {
      attributes[attribute[1].toLowerCase()] = decodeHtmlEntities(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    }

    const node: LegalHtmlNode = { tag, attributes, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
  }

  return root.children.filter((child) => typeof child !== 'string' || Boolean(child.trim()));
}

function htmlTextColor(style = '') {
  const color = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim();
  if (!color) return undefined;
  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
  return color;
}

function htmlTextAlign(style = '') {
  const alignment = style.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)/i)?.[1]?.toLowerCase();
  return alignment as 'left' | 'center' | 'right' | 'justify' | undefined;
}

function openRichTextLink(url: string) {
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    void ExpoLinking.openURL(url).catch(() => undefined);
  }
}

function containsMobileButtonMarker(nodes: Array<LegalHtmlNode | string>): boolean {
  return nodes.some((node) => typeof node !== 'string' && (
    node.attributes['data-mobile-button'] === 'true' || containsMobileButtonMarker(node.children)
  ));
}

function richTextButtonLabel(nodes: Array<LegalHtmlNode | string>): string {
  return nodes.map((node) => typeof node === 'string' ? node : richTextButtonLabel(node.children)).join('').trim();
}

function isRichTextButton(node: LegalHtmlNode | string): node is LegalHtmlNode {
  return typeof node !== 'string' && node.tag === 'a' && (
    node.attributes['data-mobile-button'] === 'true' || containsMobileButtonMarker(node.children)
  );
}

function LegalInline({ node, theme, onLink }: { node: LegalHtmlNode | string; theme: ReturnType<typeof useTheme>; onLink: (url: string) => void }): ReactNode {
  if (typeof node === 'string') return node;
  if (node.tag === 'br') return '\n';
  if (node.tag === 'img') return null;

  const style: TextStyle[] = [];
  if (['b', 'strong'].includes(node.tag)) style.push({ fontWeight: '700' });
  if (['i', 'em'].includes(node.tag)) style.push({ fontStyle: 'italic' });
  if (node.tag === 'u') style.push({ textDecorationLine: 'underline' });
  if (['s', 'strike', 'del'].includes(node.tag)) style.push({ textDecorationLine: 'line-through' });
  if (node.tag === 'code') style.push({ fontFamily: 'monospace', backgroundColor: theme.backgroundElement });
  const isMobileButton = node.tag === 'a' && (
    node.attributes['data-mobile-button'] === 'true' || containsMobileButtonMarker(node.children)
  );
  if (isMobileButton) {
    style.push({
      color: '#ffffff',
      backgroundColor: '#147fe8',
      textDecorationLine: 'none',
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 21,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
    });
  } else if (node.tag === 'a') {
    style.push({ color: '#147fe8', textDecorationLine: 'underline' });
  }
  const color = htmlTextColor(node.attributes.style);
  if (color && !isMobileButton) style.push({ color });

  const href = node.attributes.href;
  const children = node.children.map((child, index) => <LegalInline key={index} node={child} theme={theme} onLink={onLink} />);
  return (
    <Text style={style} onPress={node.tag === 'a' && href ? () => onLink(href) : undefined}>
      {isMobileButton ? '\u2197 ' : null}{children}
    </Text>
  );
}

function LegalBlock({ node, theme, onLink }: {
  node: LegalHtmlNode | string;
  theme: ReturnType<typeof useTheme>;
  onLink: (url: string) => void;
}): ReactNode {
  if (typeof node === 'string') return <Text style={{ color: theme.text, fontSize: 16, lineHeight: 27 }}>{node}</Text>;
  if (node.tag === 'br') return <View style={{ height: 10 }} />;
  if (node.tag === 'hr') return <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected, marginVertical: 12 }} />;

  const children = node.children;
  const renderChildren = () => children.map((child, index) => <LegalBlock key={index} node={child} theme={theme} onLink={onLink} />);
  const textChildren = children.map((child, index) => <LegalInline key={index} node={child} theme={theme} onLink={onLink} />);
  const textStyle = { color: theme.text, fontSize: 16, lineHeight: 27, textAlign: htmlTextAlign(node.attributes.style) } as const;

  if (node.tag === 'p' || /^h[1-6]$/.test(node.tag) || node.tag === 'pre') {
    const headingSize: Record<string, number> = { h1: 24, h2: 20, h3: 18, h4: 17, h5: 16, h6: 16 };
    const buttonLinks = children.some(isRichTextButton);
    if (node.tag === 'p' && buttonLinks) {
      const rows: ReactNode[] = [];
      let inlineNodes: Array<LegalHtmlNode | string> = [];
      const flushInline = () => {
        if (!inlineNodes.length) return;
        rows.push(<Text key={`text-${rows.length}`} selectable style={textStyle}>{inlineNodes.map((child, index) => <LegalInline key={index} node={child} theme={theme} onLink={onLink} />)}</Text>);
        inlineNodes = [];
      };
      children.forEach((child) => {
        if (!isRichTextButton(child)) {
          inlineNodes.push(child);
          return;
        }
        flushInline();
        const href = child.attributes.href;
        rows.push(
          <Pressable
            key={`button-${rows.length}`}
            accessibilityRole="button"
            accessibilityLabel={richTextButtonLabel(child.children)}
            disabled={!href}
            onPress={href ? () => onLink(href) : undefined}
            style={styles.richTextLinkButton}
          >
            <View style={styles.richTextLinkButtonContent}>
              <ExternalLink size={17} color="#ffffff" />
              <Text style={styles.richTextLinkButtonText}>{richTextButtonLabel(child.children)}</Text>
            </View>
          </Pressable>,
        );
      });
      flushInline();
      return <View style={{ marginBottom: 14, alignItems: 'flex-start', gap: 10 }}>{rows}</View>;
    }
    return (
      <View style={{ marginBottom: node.tag === 'p' ? 14 : 10 }}>
        <Text selectable style={[
          textStyle,
          node.tag.startsWith('h') ? { fontSize: headingSize[node.tag], lineHeight: headingSize[node.tag] + 8, fontWeight: '700' } : null,
          node.tag === 'pre' ? { fontFamily: 'monospace', backgroundColor: theme.backgroundElement, padding: 10 } : null,
        ]}>{textChildren}</Text>
      </View>
    );
  }

  if (node.tag === 'ul' || node.tag === 'ol') {
    const items = children.filter((child): child is LegalHtmlNode => typeof child !== 'string' && child.tag === 'li');
    return (
      <View style={{ marginBottom: 12, paddingLeft: 8 }}>
        {items.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 }}>
            <Text style={{ color: theme.text, fontSize: 16, lineHeight: 27, width: 28 }}>{node.tag === 'ol' ? `${index + 1}.` : '•'}</Text>
            <View style={{ flex: 1 }}><LegalBlock node={item} theme={theme} onLink={onLink} /></View>
          </View>
        ))}
      </View>
    );
  }

  if (node.tag === 'li') {
    return (
      <View>
        {children.map((child, index) => <LegalBlock key={index} node={child} theme={theme} onLink={onLink} />)}
      </View>
    );
  }

  if (node.tag === 'blockquote') {
    return <View style={{ borderLeftWidth: 3, borderLeftColor: theme.backgroundSelected, paddingLeft: 12, marginVertical: 8 }}>{renderChildren()}</View>;
  }

  if (node.tag === 'table') {
    const rows = children.filter((child): child is LegalHtmlNode => typeof child !== 'string' && child.tag === 'tr');
    const groupedRows = children.filter((child): child is LegalHtmlNode => typeof child !== 'string' && ['thead', 'tbody', 'tfoot'].includes(child.tag)).flatMap((group) => group.children.filter((child): child is LegalHtmlNode => typeof child !== 'string' && child.tag === 'tr'));
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ marginBottom: 14 }}>{(rows.length ? rows : groupedRows).map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row' }}>
            {row.children.filter((cell): cell is LegalHtmlNode => typeof cell !== 'string' && ['th', 'td'].includes(cell.tag)).map((cell, cellIndex) => (
              <View key={cellIndex} style={{ minWidth: 100, flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected, padding: 8, backgroundColor: cell.tag === 'th' ? theme.backgroundElement : 'transparent' }}>
                <Text selectable style={[textStyle, cell.tag === 'th' ? { fontWeight: '700' } : null]}>{cell.children.map((child, index) => <LegalInline key={index} node={child} theme={theme} onLink={onLink} />)}</Text>
              </View>
            ))}
          </View>
        ))}</View>
      </ScrollView>
    );
  }

  if (['root', 'div', 'section', 'article', 'thead', 'tbody', 'tfoot'].includes(node.tag)) return <View>{renderChildren()}</View>;
  return <Text style={textStyle}>{textChildren}</Text>;
}

function LegalDocument({ html, theme, onLink }: { html: string; theme: ReturnType<typeof useTheme>; onLink: (url: string) => void }) {
  return <View>{parseLegalHtml(html).map((node, index) => <LegalBlock key={index} node={node} theme={theme} onLink={onLink} />)}</View>;
}

type MobileSearchValue = { query: string; setQuery: (value: string) => void };
const MobileSearchContext = createContext<MobileSearchValue | null>(null);
const SearchVisibilityContext = createContext<((visible: boolean) => void) | null>(null);

export function MobileSearchProvider({ children }: PropsWithChildren) {
  const [query, setQuery] = useState('');
  return <MobileSearchContext.Provider value={{ query, setQuery }}>{children}</MobileSearchContext.Provider>;
}

export function useMobileSearch() {
  const value = useContext(MobileSearchContext);
  if (!value) throw new Error('useMobileSearch must be used within MobileShell');
  return value;
}

export function MobileShell({ active, children, bannerPlacement }: PropsWithChildren<{ active: AppTabKey; bannerPlacement?: BannerPlacement }>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, colorMode, setColorMode } = useAppPreferences();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [legalPage, setLegalPage] = useState<'privacyPolicy' | 'publisherInfo' | null>(null);
  const [expandedSettings, setExpandedSettings] = useState('general');
  const [legalContent, setLegalContent] = useState<AppLegalSettings | null>(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalError, setLegalError] = useState('');
  const { query, setQuery } = useMobileSearch();
  const pageBanner: BannerPlacement = bannerPlacement ?? ({ home: 'bannerHome', video: 'bannerVideo', social: 'bannerHome', download: 'bannerDownload', saved: 'bannerSaved' } as const)[active];
  const headerOffset = useRef(new Animated.Value(0)).current;
  const headerVisible = useRef(true);
  const setHeaderVisible = useCallback((visible: boolean) => {
    if (headerVisible.current === visible) return;
    headerVisible.current = visible;
    Animated.timing(headerOffset, {
      toValue: visible ? 0 : -82,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [headerOffset]);

  useEffect(() => {
    if (!preferencesOpen) return;
    setLegalLoading(true);
    return onSnapshot(doc(db, 'appSettings', 'legal'), (snapshot) => {
      if (!snapshot.exists()) {
        setLegalContent(null);
      } else {
        const data = snapshot.data();
        setLegalContent({
          privacyPolicy: typeof data.privacyPolicy === 'string' ? data.privacyPolicy : '',
          privacyPolicyText: typeof data.privacyPolicyText === 'string' ? data.privacyPolicyText : '',
          publisherInfo: typeof data.publisherInfo === 'string' ? data.publisherInfo : '',
          publisherInfoText: typeof data.publisherInfoText === 'string' ? data.publisherInfoText : '',
        });
      }
      setLegalError('');
      setLegalLoading(false);
    }, (error) => {
      setLegalError(error.message || t('settingsUnavailable'));
      setLegalLoading(false);
    });
  }, [preferencesOpen, t]);

  const clearImageCache = async () => {
    try {
      await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
      Alert.alert(t('clearCache'), t('cacheCleared'));
    } catch {
      Alert.alert(t('clearCache'), t('settingsUnavailable'));
    }
  };

  const clearSearchHistory = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const historyKeys = keys.filter((key) => key.toLowerCase().includes('search-history'));
      if (historyKeys.length) await AsyncStorage.multiRemove(historyKeys);
      setQuery('');
      Alert.alert(t('clearSearchHistory'), t('searchHistoryCleared'));
    } catch {
      Alert.alert(t('clearSearchHistory'), t('settingsUnavailable'));
    }
  };

  const openStoreLink = (url: string) => {
    void ExpoLinking.openURL(url).catch(() => Alert.alert(t('settings'), t('settingsLinkUnavailable')));
  };

  const aboutApp = () => {
    Alert.alert(
      'DANA HD',
      `Version ${appConfig.expo.version}\n\n${t('aboutCopyright', { year: new Date().getFullYear() })}`,
      [{ text: 'OK' }],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.background === Colors.dark.background ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={false}
      />
      <View style={styles.frame}>
        <Animated.View style={[styles.searchHeader, { backgroundColor: theme.background, transform: [{ translateY: headerOffset }] }]}>
          <View style={styles.searchRow}>
            <View accessibilityLabel="DANA HD" style={styles.brandButton}>
              <Image source={require('@/assets/images/dana-logo-source.png')} style={styles.brandImage} contentFit="contain" />
            </View>
            <View style={[styles.searchPill, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <Search size={25} color={theme.textSecondary} strokeWidth={2.2} />
              <TextInput
                accessibilityLabel={t('search')}
                placeholder="DANA HD"
                placeholderTextColor={theme.textSecondary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
            <Pressable accessibilityLabel={t('settings')} accessibilityRole="button" onPress={() => { setLegalPage(null); setPreferencesOpen(true); }} style={[styles.settingsButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <Settings size={21} color={theme.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>
        <SearchVisibilityContext.Provider value={setHeaderVisible}>
          <View style={styles.content}>{children}</View>
        </SearchVisibilityContext.Provider>
        {active !== 'social' ? <AdBanner placement={pageBanner} anchored bottom={insets.bottom + 68} /> : null}
        <AppTabs active={active} bottomInset={insets.bottom} />
      </View>
      <Modal
        visible={preferencesOpen}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => legalPage ? setLegalPage(null) : setPreferencesOpen(false)}
      >
        <View style={[styles.settingsScreen, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={[styles.settingsHeader, { borderBottomColor: theme.backgroundSelected }]}>
            <Pressable accessibilityLabel={t('back')} onPress={() => legalPage ? setLegalPage(null) : setPreferencesOpen(false)} style={styles.settingsBack}>
              <ArrowLeft size={23} color={theme.text} />
            </Pressable>
            <Text style={[styles.settingsTitle, { color: theme.text }]}>{legalPage ? t(legalPage) : t('settings')}</Text>
          </View>

          {legalPage ? (
            <ScrollView contentContainerStyle={styles.legalScroll} showsVerticalScrollIndicator={false}>
              {legalLoading ? <ActivityIndicator color="#147fe8" style={styles.legalLoading} /> : legalError ? (
                <Text style={[styles.legalText, { color: theme.textSecondary }]}>{legalError}</Text>
              ) : (() => {
                const raw = legalPage === 'privacyPolicy' ? legalContent?.privacyPolicy : legalContent?.publisherInfo;
                const plain = legalPage === 'privacyPolicy' ? legalContent?.privacyPolicyText : legalContent?.publisherInfoText;
                const richHtml = typeof raw === 'string' && /<\/?[a-z][^>]*>/i.test(raw) ? raw : '';
                const content = plain?.trim() || (typeof raw === 'string' && !richHtml ? raw.trim() : '');
                return richHtml ? (
                  <LegalDocument html={richHtml} theme={theme} onLink={openRichTextLink} />
                ) : content ? (
                  <Text selectable style={[styles.legalText, { color: theme.text }]}>{content}</Text>
                ) : (
                  <Text style={[styles.legalEmpty, { color: theme.textSecondary }]}>{t('noLegalContent')}</Text>
                );
              })()}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
              <SettingsGroup title={t('general')} subtitle={t('generalHint')} expanded={expandedSettings === 'general'} onPress={() => setExpandedSettings(expandedSettings === 'general' ? '' : 'general')} theme={theme}>
                <View style={styles.settingsControlRow}>
                  <View style={styles.settingsRowCopy}><Text style={[styles.settingsRowTitle, { color: theme.text }]}>{t('darkMode')}</Text><Text style={[styles.settingsRowHint, { color: theme.textSecondary }]}>{t('darkModeHint')}</Text></View>
                  <Switch value={colorMode === 'dark'} onValueChange={(enabled) => setColorMode(enabled ? 'dark' : 'light')} trackColor={{ false: '#cbd5e1', true: '#73a9df' }} thumbColor={colorMode === 'dark' ? '#147fe8' : '#f8fafc'} />
                </View>
                <Text style={[styles.settingsControlLabel, { color: theme.textSecondary }]}>{t('language')}</Text>
                <View style={[styles.segment, { backgroundColor: theme.background }]}>
                  {(['en', 'am'] as const).map((item) => (
                    <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.segmentOption, language === item && { backgroundColor: theme.backgroundSelected }]}>
                      <Text style={[styles.segmentText, { color: theme.text }]}>{t(item === 'en' ? 'english' : 'amharic')}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => void registerForPushNotifications().then((enabled) => {
                  Alert.alert(t('pushNotification'), enabled === null ? t('pushRegistrationFailed') : enabled ? t('pushEnabled') : t('pushPermissionDenied'));
                }).catch(() => Alert.alert(t('pushNotification'), t('pushRegistrationFailed')))} style={[styles.settingsActionRow, { borderTopColor: theme.backgroundSelected }]}>
                  <Bell size={19} color={theme.textSecondary} /><View style={styles.settingsRowCopy}><Text style={[styles.settingsRowTitle, { color: theme.text }]}>{t('pushNotification')}</Text><Text style={[styles.settingsRowHint, { color: theme.textSecondary }]}>{t('pushNotificationHint')}</Text></View><ChevronDown size={18} color={theme.textSecondary} style={styles.sideChevron} />
                </Pressable>
              </SettingsGroup>

              <SettingsGroup title={t('cache')} subtitle={t('cacheHint')} expanded={expandedSettings === 'cache'} onPress={() => setExpandedSettings(expandedSettings === 'cache' ? '' : 'cache')} theme={theme}>
                <SettingsAction icon={<Trash2 size={19} color={theme.textSecondary} />} title={t('clearCache')} subtitle={t('clearCacheHint')} onPress={() => void clearImageCache()} theme={theme} />
                <SettingsAction icon={<Search size={19} color={theme.textSecondary} />} title={t('clearSearchHistory')} onPress={() => void clearSearchHistory()} theme={theme} />
              </SettingsGroup>

              <SettingsGroup title={t('privacy')} subtitle={t('privacyHint')} expanded={expandedSettings === 'privacy'} onPress={() => setExpandedSettings(expandedSettings === 'privacy' ? '' : 'privacy')} theme={theme}>
                <SettingsAction icon={<Shield size={19} color={theme.textSecondary} />} title={t('privacyPolicy')} onPress={() => setLegalPage('privacyPolicy')} theme={theme} />
                <SettingsAction icon={<Info size={19} color={theme.textSecondary} />} title={t('publisherInfo')} onPress={() => setLegalPage('publisherInfo')} theme={theme} />
              </SettingsGroup>

              <SettingsGroup title={t('about')} subtitle={t('aboutHint')} expanded={expandedSettings === 'about'} onPress={() => setExpandedSettings(expandedSettings === 'about' ? '' : 'about')} theme={theme}>
                <SettingsAction icon={<Info size={19} color={theme.textSecondary} />} title={t('aboutUs')} onPress={aboutApp} theme={theme} />
                <SettingsAction icon={<Star size={19} color={theme.textSecondary} />} title={t('rateUs')} onPress={() => openStoreLink(playStoreAppSearch)} theme={theme} />
                <SettingsAction icon={<Share2 size={19} color={theme.textSecondary} />} title={t('shareFriends')} onPress={() => void Share.share({ message: playStoreAppSearch })} theme={theme} />
                <SettingsAction icon={<Settings size={19} color={theme.textSecondary} />} title={t('moreApps')} onPress={() => openStoreLink(playStorePublisherSearch)} theme={theme} />
              </SettingsGroup>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsGroup({ title, subtitle, expanded, onPress, theme, children }: PropsWithChildren<{
  title: string;
  subtitle: string;
  expanded: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}>) {
  return (
    <View style={[styles.settingsGroup, { borderBottomColor: theme.backgroundSelected }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={styles.settingsGroupHeader}>
        <View style={styles.settingsRowCopy}>
          <Text style={[styles.settingsGroupTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.settingsGroupSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
        {expanded ? <ChevronUp size={20} color={theme.textSecondary} /> : <ChevronDown size={20} color={theme.textSecondary} />}
      </Pressable>
      {expanded ? <View style={styles.settingsGroupBody}>{children}</View> : null}
    </View>
  );
}

function SettingsAction({ icon, title, subtitle, onPress, theme }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.settingsActionRow}>
      {icon}
      <View style={styles.settingsRowCopy}>
        <Text style={[styles.settingsRowTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.settingsRowHint, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <ChevronDown size={17} color={theme.textSecondary} style={styles.sideChevron} />
    </Pressable>
  );
}

export function NewsFeed({ items, relatedItems = items, categories, savedIds, onToggleSaved, emptyMessage, featuredFirst = true, initialNewsId }: {
  items: News[];
  relatedItems?: News[];
  categories: NewsCategory[];
  savedIds: string[];
  onToggleSaved: (id: string) => void;
  emptyMessage: string;
  featuredFirst?: boolean;
  initialNewsId?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const ads = useAdsConfiguration();
  const interstitialEnabled = ads.adStatus === 'on' && (ads.placements.interstitialPostList || ads.placements.interstitialPostDetails);
  const [interstitialRequestCount, setInterstitialRequestCount] = useState(0);
  const [selected, setSelected] = useState<News | null>(null);
  const detailScrollRef = useRef<ScrollView>(null);
  const openedSharedNewsRef = useRef<string | null>(null);
  const nativeInterval = ads.nativeAdInterval;
  const nativeEnabled = ads.adStatus === 'on' && ads.nativeAdsEnabled && ads.placements.nativePostList && Boolean(ads.admobNativeAdUnitId);
  const openNews = useCallback((item: News) => {
    setSelected(item);
    setInterstitialRequestCount((count) => count + 1);
    void updateDoc(doc(db, 'news', item.id), { views: increment(1) }).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!initialNewsId || openedSharedNewsRef.current === initialNewsId) return;
    const sharedNews = items.find((item) => item.id === initialNewsId);
    if (!sharedNews) return;
    openedSharedNewsRef.current = initialNewsId;
    openNews(sharedNews);
  }, [initialNewsId, items, openNews]);
  useEffect(() => {
    if (!selected) return;
    requestAnimationFrame(() => detailScrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [selected?.id]);
  const related = selected ? relatedItems.filter((item) => item.id !== selected.id && item.categoryId === selected.categoryId).slice(0, 6) : [];
  if (!items.length) {
    return <View style={styles.emptyWrap}><Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyMessage}</Text></View>;
  }
  return (
    <View style={styles.feed}>
      <InterstitialController enabled={interstitialEnabled} unitId={ads.admobInterstitialAdUnitId} requestCount={interstitialRequestCount} interval={ads.interstitialAdInterval} />
      {items.map((item, index) => (
        <View key={item.id}>
          <NewsCard
            news={item}
            category={categories.find((category) => category.id === item.categoryId)?.name ?? categories.find((category) => category.name === item.categoryId)?.name}
            featured={featuredFirst && index === 0}
            saved={savedIds.includes(item.id)}
            onToggleSaved={() => onToggleSaved(item.id)}
            onOpen={() => openNews(item)}
          />
          {nativeEnabled && (index + 1) % nativeInterval === 0 ? <NativeFeedAd size={ads.nativeAdStyles.postList} /> : null}
        </View>
      ))}
      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.detailScrim}>
          <View style={[styles.detailSheet, { backgroundColor: theme.backgroundElement, paddingBottom: Math.max(insets.bottom, 14) }]}>
            <View style={styles.detailHandle} />
            <Pressable accessibilityLabel={t('close')} onPress={() => setSelected(null)} style={styles.detailClose}>
              <X size={22} color={theme.textSecondary} />
            </Pressable>
            <ScrollView ref={detailScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              {selected?.image ? <Image source={{ uri: selected.image }} style={styles.detailImage} contentFit="cover" transition={180} /> : null}
              <Text style={[styles.detailTitle, { color: theme.text }]}>{selected?.title}</Text>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>{selected ? formatNewsDate(selected.date, i18n.language) : ''}</Text>
              {selected?.description && /<\/?[a-z][^>]*>/i.test(selected.description) ? (
                <View style={{ marginTop: 18 }}>
                  <LegalDocument html={selected.description} theme={theme} onLink={openRichTextLink} />
                </View>
              ) : (
                <Text style={[styles.detailDescription, { color: theme.text }]}>{selected?.descriptionText || stripHtml(selected?.description ?? '') || t('noDescription')}</Text>
              )}
              {ads.adStatus === 'on' && ads.nativeAdsEnabled && ads.placements.nativePostDetails ? <NativeFeedAd size={ads.nativeAdStyles.postDetails} enabled /> : null}
              <AdBanner placement="bannerPostDetails" />
              {related.length ? (
                <View style={styles.relatedSection}>
                  <Text style={[styles.relatedHeading, { color: theme.text }]}>{t('relatedNews')}</Text>
                  {related.map((item) => (
                    <Pressable key={item.id} onPress={() => openNews(item)} style={[styles.relatedCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                      {item.image ? <Image source={{ uri: item.image }} style={styles.relatedImage} contentFit="cover" transition={160} /> : <View style={[styles.relatedImage, styles.relatedImageFallback, { backgroundColor: theme.backgroundSelected }]} />}
                      <View style={styles.relatedCopy}>
                        <Text numberOfLines={1} style={styles.relatedCategory}>{categories.find((category) => category.id === item.categoryId)?.name || ''}</Text>
                        <Text numberOfLines={2} style={[styles.relatedTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text numberOfLines={2} style={[styles.relatedDescription, { color: theme.textSecondary }]}>{item.descriptionText || stripHtml(item.description)}</Text>
                      </View>
                      <ArrowRight size={17} color={theme.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function NewsCard({ news, category, featured = false, saved, onToggleSaved, onOpen }: {
  news: News;
  category?: string;
  featured?: boolean;
  saved: boolean;
  onToggleSaved: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const date = formatNewsDate(news.date, i18n.language);
  const description = news.descriptionText || stripHtml(news.description);

  const share = async () => {
    const postUrl = `${publicNewsBaseUrl}/post/${encodeURIComponent(news.id)}`;
    await Share.share({ title: news.title, message: postUrl, url: postUrl });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={onOpen} style={!featured ? styles.compactPressable : undefined}>
        {news.image ? (
          <Image source={{ uri: news.image }} style={[styles.newsImage, featured ? styles.featuredImage : styles.compactImage]} contentFit="cover" transition={160} accessibilityLabel={news.title} />
        ) : (
          <View style={[styles.imagePlaceholder, featured ? styles.featuredImage : styles.compactImage, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={featured ? styles.featuredCopy : styles.compactCopy}>
          {(news.type !== 'standard' || category) && (
            <Text style={[styles.eyebrow, { color: news.type === 'breaking' ? '#da625d' : '#3176cc' }]}>
              {news.type !== 'standard' ? t(news.type) : category?.toLocaleUpperCase()}
            </Text>
          )}
          <Text numberOfLines={2} style={[featured ? styles.featuredTitle : styles.compactTitle, { color: theme.text }]}>{news.title}</Text>
          <Text numberOfLines={featured ? 3 : 2} style={[styles.description, { color: theme.text }]}>{description || t('noDescription')}</Text>
        </View>
      </Pressable>
      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: theme.textSecondary }]}>{date}</Text>
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('share')} onPress={() => void share()} style={[styles.actionButton, { borderColor: theme.textSecondary }]}>
            <Share2 size={17} color={theme.textSecondary} />
            <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>{t('share')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? t('removeSaved') : t('save')} onPress={onToggleSaved} style={[styles.bookmarkButton, { borderColor: theme.textSecondary }]}>
            {saved ? <BookmarkCheck size={19} color="#147fe8" /> : <Bookmark size={19} color={theme.textSecondary} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function ScreenHeading({ title, subtitle, compact = false }: { title: string; subtitle?: string; compact?: boolean }) {
  const theme = useTheme();
  return (
    <View style={compact ? styles.compactScreenHeading : styles.screenHeading}>
      <Text style={[compact ? styles.compactScreenTitle : styles.screenTitle, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function LoadingOrError({ loading, error, retry }: { loading: boolean; error?: string; retry?: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!loading && !error) return null;
  return (
    <View style={styles.emptyWrap}>
      <Text style={[styles.empty, { color: theme.textSecondary }]}>{loading ? t('loading') : error}</Text>
      {!loading && error && retry ? <Pressable onPress={retry} style={styles.retryButton}><Text style={styles.retryText}>{t('retry')}</Text></Pressable> : null}
    </View>
  );
}

export function ContentScroll({ children }: PropsWithChildren) {
  const theme = useTheme();
  const setHeaderVisible = useContext(SearchVisibilityContext);
  const previousOffset = useRef(0);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const offset = Math.max(0, contentOffset.y);
        const maxOffset = Math.max(0, contentSize.height - layoutMeasurement.height);
        if (offset <= 8 || (maxOffset > 0 && offset >= maxOffset - 12)) setHeaderVisible?.(true);
        else if (offset > previousOffset.current + 3) setHeaderVisible?.(false);
        else if (offset < previousOffset.current - 3) setHeaderVisible?.(true);
        previousOffset.current = offset;
      }}
    >
      {children}
    </ScrollView>
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function formatNewsDate(value: string, language: string) {
  const date = new Date(`${value}T00:00:00`);
  if (!value || Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', { dateStyle: 'long' }).format(date);
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { flex: 1, position: 'relative' },
  searchHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 9 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchPill: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingLeft: 14, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#6792c0', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: 5 },
  settingsButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#6792c0', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  brandButton: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#003e47', borderWidth: 1, borderColor: '#003e47', shadowColor: '#6f91b4', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  brandImage: { width: 44, height: 44 },
  content: { flex: 1, minHeight: 0 },
  detailScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#07121b99' },
  detailSheet: { height: '94%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  detailHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#9aa8b9', opacity: 0.55 },
  detailClose: { alignSelf: 'flex-end', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  detailScroll: { paddingBottom: 18 },
  detailImage: { width: '100%', aspectRatio: 1.58, borderRadius: 17, backgroundColor: '#dce8f4', marginBottom: 20 },
  richTextLinkButton: { minHeight: 52, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 26, backgroundColor: '#147fe8', shadowColor: '#147fe8', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  richTextLinkButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  richTextLinkButtonText: { color: '#ffffff', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  detailTitle: { fontSize: 25, lineHeight: 32, fontWeight: '800', marginBottom: 8 },
  detailDescription: { marginTop: 18, fontSize: 16, lineHeight: 26 },
  relatedSection: { marginTop: 26, gap: 10 },
  relatedHeading: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  relatedCard: { minHeight: 102, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, shadowColor: '#26384f', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  relatedImage: { width: 82, height: 82, borderRadius: 11, backgroundColor: '#dce8f4' },
  relatedImageFallback: { opacity: 0.65 },
  relatedCopy: { flex: 1, gap: 4 },
  relatedCategory: { color: '#147fe8', fontSize: 11, fontWeight: '700' },
  relatedTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  relatedDescription: { fontSize: 12, lineHeight: 16 },
  detailActions: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  detailAction: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  settingsScreen: { flex: 1 },
  settingsHeader: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  settingsBack: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  settingsTitle: { fontSize: 22, fontWeight: '700' },
  settingsContent: { paddingHorizontal: 22, paddingBottom: 26 },
  settingsGroup: { borderBottomWidth: StyleSheet.hairlineWidth },
  settingsGroupHeader: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  settingsGroupTitle: { fontSize: 17, fontWeight: '700' },
  settingsGroupSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  settingsGroupBody: { paddingBottom: 14 },
  settingsRowCopy: { flex: 1, minWidth: 0 },
  settingsControlRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  settingsRowTitle: { fontSize: 16, fontWeight: '600' },
  settingsRowHint: { marginTop: 4, fontSize: 13, lineHeight: 19 },
  settingsControlLabel: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  settingsActionRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sideChevron: { transform: [{ rotate: '-90deg' }] },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  legalScroll: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30, flexGrow: 1 },
  legalText: { fontSize: 16, lineHeight: 27 },
  legalEmpty: { flex: 1, minHeight: 200, textAlign: 'center', textAlignVertical: 'center', fontSize: 15, lineHeight: 24 },
  legalLoading: { marginTop: 30 },
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  segmentOption: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 11 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 18, paddingTop: 85, paddingBottom: 112, flexGrow: 1 },
  feed: { gap: 18, paddingBottom: 14 },
  card: { borderRadius: 24, overflow: 'hidden', padding: 15, shadowColor: '#334a68', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  newsImage: { width: '100%', borderRadius: 17, backgroundColor: '#dce8f4' },
  featuredImage: { aspectRatio: 1.58 },
  compactImage: { width: 142, height: 126 },
  imagePlaceholder: { borderRadius: 17 },
  featuredCopy: { paddingTop: 14 },
  compactCopy: { flex: 1, paddingLeft: 13, paddingTop: 2, gap: 4 },
  compactPressable: { flexDirection: 'row' },
  eyebrow: { fontSize: 10, fontWeight: '800', marginBottom: 5 },
  featuredTitle: { fontSize: 21, lineHeight: 27, fontWeight: '800' },
  compactTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  description: { fontSize: 15, lineHeight: 22, marginTop: 6, fontWeight: '400' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 14 },
  dateText: { flexShrink: 1, fontSize: 13, fontWeight: '500' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { minHeight: 38, borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionSymbol: { fontSize: 20, lineHeight: 23 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  bookmarkButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bookmarkSymbol: { fontSize: 20, lineHeight: 23 },
  screenHeading: { paddingTop: 12, paddingBottom: 18 },
  screenTitle: { fontSize: 25, fontWeight: '800' },
  compactScreenHeading: { paddingTop: 2, paddingBottom: 10 },
  compactScreenTitle: { fontSize: 20, fontWeight: '700' },
  screenSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  emptyWrap: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  empty: { fontSize: 15, lineHeight: 23, textAlign: 'center' },
  retryButton: { marginTop: 14, minHeight: 40, borderRadius: 20, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#147fe8' },
  retryText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
