export type NewsStatus = 'active' | 'inactive';
export type NewsContentType = 'standard' | 'breaking' | 'featured';

export interface News {
  id: string;
  title: string;
  date: string;
  categoryId: string;
  type: NewsContentType;
  image: string;
  description: string;
  descriptionText: string;
  status: NewsStatus;
}

export interface NewsCategory {
  id: string;
  name: string;
  image: string;
}

export type VideoStatus = 'published' | 'unpublished';

export interface NewsVideo {
  id: string;
  title: string;
  videoUrl: string;
  status: VideoStatus;
  createdAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  status: 'active' | 'inactive';
}

export interface AppLegalSettings {
  privacyPolicy: string;
  privacyPolicyText: string;
  publisherInfo: string;
  publisherInfoText: string;
}
