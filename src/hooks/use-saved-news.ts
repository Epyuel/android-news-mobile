import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'saved-news-v1';

export function useSavedNews() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(KEY).then((value) => {
      if (!mounted || !value) return;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) setSavedIds(parsed.filter((item): item is string => typeof item === 'string'));
      } catch {
        void AsyncStorage.removeItem(KEY);
      }
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const toggleSaved = (id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveNews = (id: string) => {
    setSavedIds((current) => {
      if (current.includes(id)) return current;
      const next = [id, ...current];
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return { savedIds, toggleSaved, saveNews };
}
