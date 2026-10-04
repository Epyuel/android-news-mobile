import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Link2, MessageCircle, Play, X } from 'lucide-react-native';
import { SiFacebook, SiInstagram, SiTelegram, SiTiktok, SiYoutube } from '@thinkhuman/react-native-simple-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { ContentScroll, LoadingOrError, MobileShell, NewsFeed, ScreenHeading, useMobileSearch } from '@/components/reader-ui';
import { useTheme } from '@/hooks/use-theme';
import { useNews } from '@/hooks/use-news';
import { useSavedNews } from '@/hooks/use-saved-news';
import { db } from '@/constants/firebase-client';
import type { NewsVideo, SocialLink } from '@/constants/news-types';

export function HomeScreen() {
  const { news, categories, loading, error } = useNews();
  const { savedIds, toggleSaved } = useSavedNews();
  const { t } = useTranslation();
  const { query } = useMobileSearch();
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const visible = useMemo(() => news.filter((item) => {
    const text = `${item.title} ${item.descriptionText}`.toLocaleLowerCase();
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory || categories.find((category) => category.id === selectedCategory)?.name === item.categoryId;
    return matchesCategory && text.includes(query.trim().toLocaleLowerCase());
  }), [news, categories, query, selectedCategory]);

  return (
    <MobileShell active="home">
      <ContentScroll>
        {categories.length ? (
          <View style={styles.categoryFilters}>
            <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>{t('filterByCategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable onPress={() => setSelectedCategory(null)} style={[styles.categoryFilter, { backgroundColor: selectedCategory === null ? theme.backgroundSelected : theme.backgroundElement, borderColor: selectedCategory === null ? '#147fe8' : theme.backgroundSelected }]}>
              <Text style={[styles.categoryFilterText, { color: selectedCategory === null ? '#147fe8' : theme.text }]}>{t('all')}</Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === category.id }} onPress={() => setSelectedCategory(category.id)} style={[styles.categoryFilter, { backgroundColor: selectedCategory === category.id ? theme.backgroundSelected : theme.backgroundElement, borderColor: selectedCategory === category.id ? '#147fe8' : theme.backgroundSelected }]}>
                {category.image ? <Image source={{ uri: category.image }} style={styles.categoryThumb} contentFit="cover" /> : <View style={[styles.categoryThumb, { backgroundColor: theme.backgroundSelected }]} />}
                <Text numberOfLines={1} style={[styles.categoryFilterText, { color: selectedCategory === category.id ? '#147fe8' : theme.text }]}>{category.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          </View>
        ) : null}
        {loading || error ? <LoadingOrError loading={loading} error={error} /> : (
          <NewsFeed items={visible} categories={categories} savedIds={savedIds} onToggleSaved={toggleSaved} emptyMessage={query ? t('emptySearch') : t('emptyNews')} />
        )}
      </ContentScroll>
    </MobileShell>
  );
}

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || '';
    if (url.hostname.endsWith('youtube.com') || url.hostname.endsWith('youtube-nocookie.com')) {
      return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || '';
    }
  } catch { return ''; }
  return '';
}

export function VideoScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { query } = useMobileSearch();
  const [videos, setVideos] = useState<NewsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => onSnapshot(collection(db, 'videos'), (snapshot) => {
    const items = snapshot.docs.map((item) => {
      const data = item.data();
      const rawDate = data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : typeof data.createdAt === 'string' ? data.createdAt : '';
      return { id: item.id, title: String(data.title ?? ''), videoUrl: String(data.videoUrl ?? data.url ?? ''), status: data.status === 'published' ? 'published' : 'unpublished', createdAt: rawDate } satisfies NewsVideo;
    }).filter((item) => item.status === 'published' && item.videoUrl).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setVideos(items);
    setLoading(false);
    setError('');
  }, (reason) => { setError(reason.message); setLoading(false); }), []);

  const visible = useMemo(() => videos.filter((video) => `${video.title} ${video.videoUrl}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [videos, query]);

  return (
    <MobileShell active="video">
      <ContentScroll>
        <ScreenHeading title={t('videos')} compact />
        {loading || error ? <LoadingOrError loading={loading} error={error} /> : visible.length ? <View style={styles.videoList}>
          {visible.map((video) => {
            const id = youtubeId(video.videoUrl);
            const thumbnail = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
            return <Pressable key={video.id} accessibilityRole="link" accessibilityLabel={video.title} onPress={() => void Linking.openURL(video.videoUrl)} style={[styles.videoCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.videoImageWrap}>
                {thumbnail ? <Image source={{ uri: thumbnail }} style={styles.videoImage} contentFit="cover" /> : <View style={[styles.videoImage, { backgroundColor: theme.backgroundSelected }]} />}
                <View style={styles.videoPlay}><Play size={22} color="#fff" fill="#fff" /></View>
              </View>
              <Text numberOfLines={2} style={[styles.videoTitle, { color: theme.text }]}>{video.title}</Text>
              <View style={styles.videoMeta}>
                <Text style={[styles.videoDate, { color: theme.textSecondary }]}>{formatVideoDate(video.createdAt, i18n.language)}</Text>
                <View style={styles.commentMeta}><MessageCircle size={15} color={theme.textSecondary} /><Text style={[styles.videoDate, { color: theme.textSecondary }]}>YouTube</Text></View>
              </View>
            </Pressable>;
          })}
        </View> : <View style={styles.empty}><Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noVideos')}</Text></View>}
      </ContentScroll>
    </MobileShell>
  );
}

function SocialPlatformIcon({ platform, color, size }: { platform: string; color: string; size: number }) {
  switch (platform.toLowerCase()) {
    case 'instagram': return <SiInstagram size={size} color="default" />;
    case 'youtube': return <SiYoutube size={size} color="default" />;
    case 'tiktok': return <SiTiktok size={size} color="default" />;
    case 'facebook': return <SiFacebook size={size} color="default" />;
    case 'telegram': return <SiTelegram size={size} color="default" />;
    default: return <Link2 size={size} color={color} strokeWidth={2.2} />;
  }
}

export function SocialScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => onSnapshot(collection(db, 'socialLinks'), (snapshot) => {
    setLinks(snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, platform: String(data.platform ?? ''), url: String(data.url ?? ''), status: data.status === 'inactive' ? 'inactive' : 'active' } satisfies SocialLink;
    }).filter((item) => item.status === 'active' && item.url).sort((a, b) => a.platform.localeCompare(b.platform)));
    setLoading(false);
    setError('');
  }, (reason) => { setError(reason.message); setLoading(false); }), []);

  return (
    <MobileShell active="social">
      <ContentScroll>
        <ScreenHeading title={t('followUs')} compact />
        {loading || error ? <LoadingOrError loading={loading} error={error} /> : links.length ? (
          <View style={styles.socialGrid}>
            {links.map((link) => {
              return <Pressable key={link.id} accessibilityRole="link" accessibilityLabel={link.platform} onPress={() => void Linking.openURL(link.url)} style={[styles.socialTile, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <View style={[styles.socialIconWrap, { backgroundColor: theme.backgroundSelected }]}><SocialPlatformIcon platform={link.platform} size={27} color={theme.textSecondary} /></View>
                <Text numberOfLines={2} style={[styles.socialName, { color: theme.text }]}>{link.platform}</Text>
              </Pressable>;
            })}
          </View>
        ) : <View style={styles.empty}><Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noSocialLinks')}</Text></View>}
      </ContentScroll>
    </MobileShell>
  );
}

type TikTokPreview = { title?: string; author?: string; thumbnail?: string };

function isTikTokUrl(value: string) {
  try {
    const url = new URL(value);
    return ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname);
  } catch { return false; }
}

export function DownloadScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<TikTokPreview | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getVideo = async () => {
    const candidate = url.trim();
    setError('');
    setPreview(null);
    setDownloadUrl('');
    if (!isTikTokUrl(candidate)) {
      setError(t('invalidTikTokLink'));
      return;
    }

    setLoading(true);

    try {
      let embedPreview: TikTokPreview | null = null;
      try {
        const embedResponse = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(candidate)}`);
        if (embedResponse.ok) {
          const embedData = await embedResponse.json() as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
          };
          embedPreview = {
            title: embedData.title,
            author: embedData.author_name,
            thumbnail: embedData.thumbnail_url,
          };
          setPreview(embedPreview);
        }
      } catch {
        // The downloader API below supplies preview metadata when TikTok oEmbed is unavailable.
      }

      const endpoint = process.env.EXPO_PUBLIC_TIKTOK_DOWNLOADER_ENDPOINT;
      if (!endpoint) {
        setPreview(embedPreview || {});
        return;
      }

      const result = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: candidate }),
      });

      const payload = await result.json() as {
        downloadUrl?: string;
        videoUrl?: string;
        title?: string;
        author?: string;
        thumbnail?: string;
        error?: string;
      };
      if (!result.ok) throw new Error(payload.error || t('downloadLinkUnavailable'));
      const resolvedUrl = payload.downloadUrl || payload.videoUrl || '';
      if (!/^https?:\/\//i.test(resolvedUrl)) throw new Error(t('downloadLinkUnavailable'));
      setPreview({
        title: embedPreview?.title || payload.title,
        author: embedPreview?.author || payload.author,
        thumbnail: embedPreview?.thumbnail || payload.thumbnail,
      });
      setDownloadUrl(resolvedUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('videoPreviewUnavailable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell active="download">
      <ContentScroll>
        <ScreenHeading title={t('tiktokDownloader')} compact />
        <View style={styles.downloaderContent}>
          <Text style={[styles.downloaderDescription, { color: theme.textSecondary }]}>{t('tiktokDownloaderDescription')}</Text>
          <View style={[styles.downloaderInputWrap, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <TextInput
              accessibilityLabel={t('tiktokLink')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={setUrl}
              onSubmitEditing={() => void getVideo()}
              placeholder={t('tiktokLinkPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              returnKeyType="go"
              style={[styles.downloaderInput, { color: theme.text }]}
              value={url}
            />
            {url ? <Pressable accessibilityLabel={t('clear')} onPress={() => { setUrl(''); setPreview(null); setDownloadUrl(''); setError(''); }}><X size={18} color={theme.textSecondary} /></Pressable> : null}
          </View>
          <Pressable disabled={loading || !url.trim()} onPress={() => void getVideo()} style={[styles.resolveButton, (!url.trim() || loading) && styles.resolveButtonDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resolveButtonText}>{t('getVideo')}</Text>}
          </Pressable>
          {error ? <Text style={styles.downloaderError}>{error}</Text> : null}
          {preview ? <View style={[styles.previewCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            {preview.thumbnail ? <Image source={{ uri: preview.thumbnail }} style={styles.previewImage} contentFit="cover" /> : null}
            <Text style={[styles.previewTitle, { color: theme.text }]}>{preview.title || t('tiktokVideo')}</Text>
            {preview.author ? <Text style={[styles.previewAuthor, { color: theme.textSecondary }]}>{preview.author}</Text> : null}
            {downloadUrl ? <Pressable onPress={() => void Linking.openURL(downloadUrl)} style={styles.resolveButton}><Text style={styles.resolveButtonText}>{t('downloadVideo')}</Text></Pressable> : <Text style={[styles.serviceHint, { color: theme.textSecondary }]}>{t('downloaderServiceRequired')}</Text>}
          </View> : null}
        </View>
      </ContentScroll>
    </MobileShell>
  );
}

export function SavedScreen() {
  const { news, categories, loading, error } = useNews();
  const { savedIds, toggleSaved } = useSavedNews();
  const { t } = useTranslation();
  const { query } = useMobileSearch();
  const saved = useMemo(() => savedIds.map((id) => news.find((item) => item.id === id)).filter((item) => item !== undefined), [savedIds, news]);
  const visibleSaved = useMemo(() => saved.filter((item) => `${item.title} ${item.descriptionText}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [saved, query]);

  return (
    <MobileShell active="saved">
      <ContentScroll>
        <ScreenHeading title={t('saved')} compact />
        {loading || error ? <LoadingOrError loading={loading} error={error} /> : (
          <NewsFeed items={visibleSaved} categories={categories} savedIds={savedIds} onToggleSaved={toggleSaved} emptyMessage={t('emptySaved')} featuredFirst={false} />
        )}
      </ContentScroll>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  categoryFilters: { gap: 7, paddingBottom: 14 },
  categoryLabel: { fontSize: 12, fontWeight: '700' },
  chips: { height: 42, alignItems: 'center', gap: 8, paddingRight: 2 },
  categoryFilter: { height: 36, minHeight: 36, maxHeight: 36, minWidth: 54, flexShrink: 0, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center' },
  categoryFilterText: { maxWidth: 145, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  categoryThumb: { width: 22, height: 22, borderRadius: 11, flexShrink: 0 },
  empty: { flex: 1, minHeight: 240, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center' },
  videoList: { gap: 20, paddingBottom: 12 },
  videoCard: { borderRadius: 17, overflow: 'hidden', paddingBottom: 13 },
  videoImageWrap: { position: 'relative' },
  videoImage: { width: '100%', aspectRatio: 1.72, backgroundColor: '#dce8f4' },
  videoPlay: { position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#132033aa' },
  videoTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', paddingHorizontal: 14, paddingTop: 12 },
  videoMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingTop: 8 },
  videoDate: { fontSize: 12, fontWeight: '500' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  videoScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#07121b99' },
  videoSheet: { height: '88%', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 25 },
  videoSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
  videoSheetTitle: { fontSize: 20, fontWeight: '700' },
  videoDetailImage: { width: '100%', aspectRatio: 1.72, borderRadius: 13, backgroundColor: '#dce8f4' },
  videoDetailTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700', marginTop: 14 },
  watchButton: { minHeight: 45, marginTop: 15, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#147fe8' },
  watchButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  commentsHeading: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  detailsLoading: { paddingVertical: 20 },
  comment: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  commentAuthor: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  commentText: { fontSize: 13, lineHeight: 19 },
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, paddingTop: 12 },
  socialTile: { width: '48%', minHeight: 148, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 14 },
  socialIconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  socialName: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  downloaderContent: { gap: 13 },
  downloaderDescription: { fontSize: 14, lineHeight: 21, marginBottom: 4 },
  downloaderInputWrap: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  downloaderInput: { flex: 1, minHeight: 48, fontSize: 14 },
  resolveButton: { minHeight: 46, borderRadius: 13, backgroundColor: '#147fe8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  resolveButtonDisabled: { opacity: 0.55 },
  resolveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  downloaderError: { color: '#c34242', fontSize: 13, lineHeight: 19 },
  previewCard: { overflow: 'hidden', borderWidth: 1, borderRadius: 15, padding: 12, gap: 9, marginTop: 5 },
  previewImage: { width: '100%', aspectRatio: 1.75, borderRadius: 10, backgroundColor: '#dce8f4' },
  previewTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  previewAuthor: { fontSize: 13 },
  serviceHint: { fontSize: 12, lineHeight: 18 },
});

function formatVideoDate(value: string, language: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', { dateStyle: 'medium' }).format(date);
}
