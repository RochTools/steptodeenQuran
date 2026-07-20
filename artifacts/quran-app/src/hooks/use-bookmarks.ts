import { useState, useEffect } from 'react';

export interface Bookmark {
  surahNumber: number;
  ayahNumber: number;
  text: string;
  translation: string;
  surahName: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('quran_bookmarks');
    if (stored) {
      try {
        setBookmarks(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const toggleBookmark = (bookmark: Bookmark) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber);
      let next;
      if (exists) {
        next = prev.filter(b => !(b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber));
      } else {
        next = [...prev, bookmark];
      }
      localStorage.setItem('quran_bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (surahNumber: number, ayahNumber: number) => {
    return bookmarks.some(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
  };

  return { bookmarks, toggleBookmark, isBookmarked };
}