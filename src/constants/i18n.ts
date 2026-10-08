import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

const resources = {
  en: { translation: {
    home: 'Home', category: 'Category', play: 'Video', video: 'Video', social: 'Social', saved: 'Saved', search: 'Search news',
    latestNews: 'Latest news', all: 'All', featured: 'Featured', breaking: 'Breaking',
    readMore: 'Read story', share: 'Share', save: 'Save', savedLabel: 'Saved',
    removeSaved: 'Remove saved story', emptyNews: 'No news available yet.',
    emptySearch: 'No stories match your search.', emptySaved: 'Your saved stories will appear here.',
    categories: 'Categories', noCategories: 'No categories yet.', videos: 'Videos',
    noVideos: 'Videos will appear here when available.', loading: 'Loading news…', retry: 'Try again',
    watchVideo: 'Watch on YouTube', comments: 'Comments', views: 'views', noComments: 'No comments available.', commentsNeedApiKey: 'Configure a YouTube API key to load comments.',
    videoInfoUnavailable: 'Video details are unavailable right now.', categoryNews: 'News in this category', relatedNews: 'Related news',
    followUs: 'Follow us', noSocialLinks: 'Social links will appear here when available.',
    filterByCategory: 'Filter by category',
    tiktokDownloader: 'TikTok downloader', tiktokDownloaderDescription: 'Paste a TikTok video link to preview it and prepare a download.',
    tiktokLink: 'TikTok video link', tiktokLinkPlaceholder: 'https://www.tiktok.com/@.../video/...', getVideo: 'Get video',
    invalidTikTokLink: 'Enter a valid TikTok video link.', videoPreviewUnavailable: 'Could not load this TikTok video preview.',
    tiktokVideo: 'TikTok video', downloadVideo: 'Download video', downloadLinkUnavailable: 'Could not get a download link.',
    downloaderServiceRequired: 'Video downloading needs a downloader service. Configure EXPO_PUBLIC_TIKTOK_DOWNLOADER_ENDPOINT to enable it.', clear: 'Clear link',
    settings: 'Settings', language: 'Language', theme: 'Appearance', system: 'System',
    light: 'Light', dark: 'Dark', english: 'English', amharic: 'አማርኛ', searchTitle: 'Search',
    general: 'General', generalHint: 'Theme, language and notifications', darkMode: 'Dark mode', darkModeHint: 'Better viewing in low light',
    pushNotification: 'Push notifications', pushNotificationHint: 'Enable notifications on this device', pushEnabled: 'Notifications are enabled on this device.', pushPermissionDenied: 'Notification permission was not granted.', pushRegistrationFailed: 'Could not register this device. Android remote push needs a development or production build; Expo Go does not support it.', cache: 'Cache', cacheHint: 'Clear cached images and search',
    clearCache: 'Clear cache', clearCacheHint: 'Remove temporary image files', clearSearchHistory: 'Clear search history',
    privacy: 'Privacy', privacyHint: 'Privacy policy and publisher info', privacyPolicy: 'Privacy policy', publisherInfo: 'Publisher info',
    about: 'About', aboutHint: 'App details, rating and more', aboutUs: 'About us', rateUs: 'Rate us', shareFriends: 'Share to friends', moreApps: 'More apps',
    settingsUnavailable: 'Could not load app information.', noLegalContent: 'Information has not been added yet.', cacheCleared: 'Image cache cleared.', searchHistoryCleared: 'Search history cleared.',
    aboutCopyright: 'Copyright © {{year}} Kana Plus. All rights reserved.', settingsLinkUnavailable: 'Could not open this link.',
    noDescription: 'There is no description for this story.', shareMessage: 'Read this story',
    adLabel: 'Sponsored', back: 'Back', close: 'Close', download: 'Download', downloadComplete: 'Video saved to your gallery.', galleryPermissionRequired: 'Allow access to save the video to your gallery.', downloadFailed: 'The video could not be downloaded.',
  } },
  am: { translation: {
    home: 'መነሻ', category: 'ምድቦች', play: 'ቪዲዮ', video: 'ቪዲዮ', social: 'ማህበራዊ', saved: 'የተቀመጡ', search: 'ዜና ፈልግ',
    latestNews: 'የቅርብ ጊዜ ዜናዎች', all: 'ሁሉም', featured: 'የተመረጠ', breaking: 'አስቸኳይ',
    readMore: 'ዜናውን አንብብ', share: 'አጋራ', save: 'አስቀምጥ', savedLabel: 'ተቀምጧል',
    removeSaved: 'ከተቀመጡት አስወግድ', emptyNews: 'እስካሁን ዜና የለም።',
    emptySearch: 'ከፍለጋዎ ጋር የሚዛመድ ዜና የለም።', emptySaved: 'ያስቀመጧቸው ዜናዎች እዚህ ይታያሉ።',
    categories: 'ምድቦች', noCategories: 'እስካሁን ምድቦች የሉም።', videos: 'ቪዲዮዎች',
    noVideos: 'ቪዲዮዎች ሲገኙ እዚህ ይታያሉ።', loading: 'ዜናዎችን በመጫን ላይ…', retry: 'እንደገና ሞክር',
    watchVideo: 'በYouTube ላይ ይመልከቱ', comments: 'አስተያየቶች', views: 'እይታዎች', noComments: 'አስተያየቶች የሉም።', commentsNeedApiKey: 'አስተያየቶችን ለማሳየት የYouTube API ቁልፍ ያዋቅሩ።',
    videoInfoUnavailable: 'የቪዲዮ መረጃ አሁን አይገኝም።', categoryNews: 'በዚህ ምድብ ያሉ ዜናዎች', relatedNews: 'ተዛማጅ ዜናዎች',
    followUs: 'ይከተሉን', noSocialLinks: 'የማህበራዊ ሚዲያ አገናኞች ሲገኙ እዚህ ይታያሉ።',
    filterByCategory: 'በምድብ ይምረጡ',
    tiktokDownloader: 'የTikTok ማውረጃ', tiktokDownloaderDescription: 'ቪዲዮውን ለማየትና ለማውረድ የTikTok አገናኝ ያስገቡ።',
    tiktokLink: 'የTikTok ቪዲዮ አገናኝ', tiktokLinkPlaceholder: 'https://www.tiktok.com/@.../video/...', getVideo: 'ቪዲዮ አምጣ',
    invalidTikTokLink: 'ትክክለኛ የTikTok ቪዲዮ አገናኝ ያስገቡ።', videoPreviewUnavailable: 'የTikTok ቪዲዮውን ማሳያ መጫን አልተቻለም።',
    tiktokVideo: 'የTikTok ቪዲዮ', downloadVideo: 'ቪዲዮ አውርድ', downloadLinkUnavailable: 'የማውረጃ አገናኙን ማግኘት አልተቻለም።',
    downloaderServiceRequired: 'ቪዲዮ ለማውረድ የማውረጃ አገልግሎት ያስፈልጋል። EXPO_PUBLIC_TIKTOK_DOWNLOADER_ENDPOINT ያዋቅሩ።', clear: 'አገናኙን አጽዳ',
    settings: 'ቅንብሮች', language: 'ቋንቋ', theme: 'ገጽታ', system: 'የስልኩ', light: 'ብርሃን',
    dark: 'ጨለማ', english: 'English', amharic: 'አማርኛ', searchTitle: 'ፍለጋ',
    general: 'አጠቃላይ', generalHint: 'ገጽታ፣ ቋንቋ እና ማሳወቂያዎች', darkMode: 'ጨለማ ገጽታ', darkModeHint: 'በዝቅተኛ ብርሃን ለመመልከት የተሻለ',
    pushNotification: 'የግፋ ማሳወቂያዎች', pushNotificationHint: 'የማሳወቂያ ፈቃዶችን ያስተዳድሩ', cache: 'መሸጎጫ', cacheHint: 'የተቀመጡ ምስሎችንና ፍለጋን ያጽዱ',
    clearCache: 'መሸጎጫን አጽዳ', clearCacheHint: 'ጊዜያዊ የምስል ፋይሎችን ያስወግዱ', clearSearchHistory: 'የፍለጋ ታሪክን አጽዳ',
    privacy: 'ግላዊነት', privacyHint: 'የግላዊነት ፖሊሲ እና የአሳታሚ መረጃ', privacyPolicy: 'የግላዊነት ፖሊሲ', publisherInfo: 'የአሳታሚ መረጃ',
    about: 'ስለ መተግበሪያው', aboutHint: 'የመተግበሪያ ዝርዝር፣ ደረጃ እና ሌሎች', aboutUs: 'ስለ እኛ', rateUs: 'ደረጃ ይስጡ', shareFriends: 'ለጓደኞች አጋራ', moreApps: 'ሌሎች መተግበሪያዎች',
    settingsUnavailable: 'የመተግበሪያ መረጃን መጫን አልተቻለም።', noLegalContent: 'መረጃ ገና አልተጨመረም።', cacheCleared: 'የምስል መሸጎጫ ተጽድቷል።', searchHistoryCleared: 'የፍለጋ ታሪክ ተጽድቷል።',
    aboutCopyright: 'የቅጂ መብት © {{year}} Kana Plus። መብቱ የተጠበቀ ነው።', settingsLinkUnavailable: 'ይህን አገናኝ መክፈት አልተቻለም።',
    noDescription: 'ለዚህ ዜና መግለጫ የለም።', shareMessage: 'ይህን ዜና ያንብቡ',
    adLabel: 'ማስታወቂያ', back: 'ተመለስ', close: 'ዝጋ', download: 'አውርድ',
  } },
} as const;

const deviceLanguage = getLocales()[0]?.languageCode === 'am' ? 'am' : 'en';
void i18n.use(initReactI18next).init({
  resources, lng: deviceLanguage, fallbackLng: 'en',
  interpolation: { escapeValue: false }, compatibilityJSON: 'v4',
});

export default i18n;
