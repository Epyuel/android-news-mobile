import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/constants/firebase-client';
import type { News, NewsCategory } from '@/constants/news-types';

export function useNews() {
  const [news, setNews] = useState<News[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let newsReady = false;
    let categoriesReady = false;
    const finishLoading = () => {
      if (newsReady && categoriesReady) setLoading(false);
    };
    const stopNews = onSnapshot(collection(db, 'news'), (snapshot) => {
      const items = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: String(data.title ?? ''),
          date: String(data.date ?? ''),
          categoryId: String(data.categoryId ?? data.category ?? ''),
          type: data.type === 'breaking' || data.type === 'featured' ? data.type : 'standard',
          image: String(data.image ?? ''),
          description: String(data.description ?? ''),
          descriptionText: String(data.descriptionText ?? ''),
          status: data.status === 'inactive' ? 'inactive' : 'active',
        } satisfies News;
      }).filter((item) => item.status === 'active')
        .sort((a, b) => b.date.localeCompare(a.date));
      setNews(items);
      setError('');
      newsReady = true;
      finishLoading();
    }, (reason) => {
      setError(reason.message);
      newsReady = true;
      finishLoading();
    });
    const stopCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map((item) => ({
        id: item.id,
        name: String(item.data().name ?? ''),
        image: String(item.data().image ?? ''),
      })).filter((item) => item.name));
      categoriesReady = true;
      finishLoading();
    }, (reason) => {
      setError((current) => current || reason.message);
      categoriesReady = true;
      finishLoading();
    });
    return () => { stopNews(); stopCategories(); };
  }, []);

  return { news, categories, loading, error };
}
