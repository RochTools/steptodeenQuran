import { useQuery } from '@tanstack/react-query';

export interface Chapter {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: 'meccan' | 'medinan';
  total_verses: number;
  link: string;
}

// Raw verse shape inside each quran-json chapter file
interface RawVerse {
  id: number; // local verse number (1-based, within surah)
  text: string;
  translation: string;
  transliteration: string;
}

// Raw shape of each quran-json chapter file
interface RawChapterData extends Chapter {
  verses: RawVerse[];
}

// Normalized ayah with all fields the UI needs
export interface Ayah {
  globalId: number;    // global 1-6236 — used in audio URL
  surahNumber: number;
  verseNumber: number; // local verse number within the surah
  text: string;
  translation: string;
  transliteration: string;
}

export interface SearchResult extends Ayah {
  surahName: string;
  matchedLang: TranslationLang;
}

export interface ChapterMatch {
  chapter: Chapter;
  verseNumber?: number;
}

// Detects direct "surah:verse" / "surah verse" / bare surah-number lookups
// so research users can jump straight to a reference like "2:255".
export function parseChapterVerseQuery(query: string, chapters: Chapter[]): ChapterMatch | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cvMatch = trimmed.match(/^(\d{1,3})\s*[:.\-]\s*(\d{1,3})$/);
  if (cvMatch) {
    const surahNum = parseInt(cvMatch[1], 10);
    const verseNum = parseInt(cvMatch[2], 10);
    const chapter = chapters.find(c => c.id === surahNum);
    if (chapter && verseNum >= 1 && verseNum <= chapter.total_verses) {
      return { chapter, verseNumber: verseNum };
    }
    return null;
  }

  if (/^\d{1,3}$/.test(trimmed)) {
    const surahNum = parseInt(trimmed, 10);
    const chapter = chapters.find(c => c.id === surahNum);
    return chapter ? { chapter } : null;
  }

  return null;
}

// Matches a query against chapter names/meanings in English, Arabic, and
// (optionally) Urdu, so users can search "Al-Baqarah", "Cow", or "گائے".
export function searchChaptersByName(query: string, chapters: Chapter[], chaptersUr?: Chapter[]): Chapter[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return chapters.filter((c, idx) => {
    const urTranslation = chaptersUr?.[idx]?.translation?.toLowerCase() ?? '';
    return (
      c.transliteration.toLowerCase().includes(q) ||
      c.translation.toLowerCase().includes(q) ||
      c.name.includes(query.trim()) ||
      urTranslation.includes(q)
    );
  });
}

// Standard verse counts for all 114 surahs (used to compute global ayah IDs)
const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99,
  128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30,
  73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 43, 68, 29, 15,
  21, 26, 9, 14, 14, 14, 8, 13, 28, 23, 91, 3, 55, 27, 26, 20, 32, 20, 100,
  113, 11,
];

// Precomputed offsets: surahOffset[n] = total verses before surah n+1
const SURAH_OFFSETS = SURAH_VERSE_COUNTS.reduce<number[]>((acc, count, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SURAH_VERSE_COUNTS[i - 1]);
  return acc;
}, []);

function getGlobalAyahId(surahNumber: number, verseNumber: number): number {
  const offset = SURAH_OFFSETS[surahNumber - 1] ?? 0;
  return offset + verseNumber;
}

function normalizeVerses(chapterData: RawChapterData): Ayah[] {
  return chapterData.verses.map((verse): Ayah => ({
    globalId: getGlobalAyahId(chapterData.id, verse.id),
    surahNumber: chapterData.id,
    verseNumber: verse.id,
    text: verse.text,
    translation: verse.translation,
    transliteration: verse.transliteration,
  }));
}

async function fetchChapterJson(path: string, lang = 'en') {
  const url = new URL(`quran/${lang}/${path}`, new URL(import.meta.env.BASE_URL, location.href));
  const res = await fetch(url.href);
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return res.json();
}

export function useChapters(lang: 'en' | 'ur' = 'en') {
  return useQuery({
    queryKey: ['chapters', lang],
    queryFn: async () => {
      return fetchChapterJson('index.json', lang) as Promise<Chapter[]>;
    },
    staleTime: Infinity,
  });
}

export function useSurah(id: number) {
  return useQuery({
    queryKey: ['surah', id],
    queryFn: async () => {
      if (!id || id < 1 || id > 114) throw new Error('Invalid surah ID');
      const data: RawChapterData = await fetchChapterJson(`${id}.json`);
      return normalizeVerses(data);
    },
    enabled: !!id && id >= 1 && id <= 114,
    staleTime: Infinity,
  });
}

export type TranslationLang = 'en' | 'ur' | 'bn' | 'es' | 'fr' | 'id' | 'ru' | 'sv' | 'tr' | 'zh';

export const TRANSLATION_LANGUAGES: { code: TranslationLang; label: string; nativeLabel: string; dir?: 'rtl' }[] = [
  { code: 'en', label: 'English',    nativeLabel: 'English' },
  { code: 'ur', label: 'Urdu',       nativeLabel: 'اردو',      dir: 'rtl' },
  { code: 'bn', label: 'Bengali',    nativeLabel: 'বাংলা' },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español' },
  { code: 'fr', label: 'French',     nativeLabel: 'Français' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Indonesia' },
  { code: 'ru', label: 'Russian',    nativeLabel: 'Русский' },
  { code: 'sv', label: 'Swedish',    nativeLabel: 'Svenska' },
  { code: 'tr', label: 'Turkish',    nativeLabel: 'Türkçe' },
  { code: 'zh', label: 'Chinese',    nativeLabel: '中文' },
];

// Returns a map of verseNumber → translation for a given surah + language
export function useChapterTranslation(surahId: number, lang: TranslationLang) {
  return useQuery({
    queryKey: ['chapter-translation', surahId, lang],
    queryFn: async (): Promise<Record<number, string>> => {
      const data: RawChapterData = await fetchChapterJson(`${surahId}.json`, lang);
      const map: Record<number, string> = {};
      for (const v of data.verses) map[v.id] = v.translation;
      return map;
    },
    enabled: !!surahId && surahId >= 1 && surahId <= 114,
    staleTime: Infinity,
  });
}

// ─── Tafseer ────────────────────────────────────────────────────────────────

export interface TafseerOption {
  id: number;
  name: string;
  author: string;
  lang: string;        // display language name
  langCode: string;    // ISO code for grouping
  dir?: 'rtl';
}

export const TAFSEER_LIST: TafseerOption[] = [
  // English
  { id: 169, name: 'Ibn Kathir (Abridged)',    author: 'Hafiz Ibn Kathir',           lang: 'English', langCode: 'en' },
  { id: 168, name: "Ma'arif al-Qur'an",        author: 'Mufti Muhammad Shafi',        lang: 'English', langCode: 'en' },
  { id: 817, name: 'Tazkirul Quran',            author: 'Maulana Wahiduddin Khan',     lang: 'English', langCode: 'en' },
  // Urdu
  { id: 160, name: 'Tafsir Ibn Kathir',         author: 'Hafiz Ibn Kathir',           lang: 'Urdu',    langCode: 'ur', dir: 'rtl' },
  { id: 159, name: 'Bayan ul Quran',            author: 'Dr. Israr Ahmad',            lang: 'Urdu',    langCode: 'ur', dir: 'rtl' },
  { id: 157, name: 'Fi Zilal al-Quran',         author: 'Sayyid Qutb',               lang: 'Urdu',    langCode: 'ur', dir: 'rtl' },
  { id: 818, name: 'Tazkir ul Quran',           author: 'Maulana Wahiduddin Khan',    lang: 'Urdu',    langCode: 'ur', dir: 'rtl' },
  // Bengali
  { id: 164, name: 'Tafseer Ibn Kathir',        author: 'Tawheed Publication',        lang: 'Bengali', langCode: 'bn' },
  { id: 165, name: 'Tafsir Ahsanul Bayaan',     author: 'Bayaan Foundation',          lang: 'Bengali', langCode: 'bn' },
  { id: 166, name: 'Tafsir Abu Bakr Zakaria',   author: 'King Fahd Quran Complex',    lang: 'Bengali', langCode: 'bn' },
  // Arabic
  { id: 16,  name: 'Tafsir Muyassar',           author: 'King Fahad Complex',         lang: 'Arabic',  langCode: 'ar', dir: 'rtl' },
  { id: 14,  name: 'Tafsir Ibn Kathir',          author: 'Hafiz Ibn Kathir',           lang: 'Arabic',  langCode: 'ar', dir: 'rtl' },
  { id: 91,  name: "Al-Sa'di",                  author: 'Al-Sa\'di',                  lang: 'Arabic',  langCode: 'ar', dir: 'rtl' },
  // Russian
  { id: 170, name: "Al-Sa'di",                  author: 'Saddi',                      lang: 'Russian', langCode: 'ru' },
];

export type ActiveMode =
  | { kind: 'translation'; lang: TranslationLang }
  | { kind: 'tafseer'; tafsirId: number };

// Returns a map of verseNumber → tafseer HTML string for a given surah
export function useTafseer(surahId: number, tafsirId: number | null) {
  return useQuery({
    queryKey: ['tafseer', surahId, tafsirId],
    queryFn: async (): Promise<Record<number, string>> => {
      const res = await fetch(
        `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_chapter/${surahId}`
      );
      if (!res.ok) throw new Error(`Tafseer fetch failed (HTTP ${res.status})`);
      const data = await res.json();
      const map: Record<number, string> = {};
      for (const item of (data.tafsirs as { verse_key: string; text: string }[])) {
        const verseNum = parseInt(item.verse_key.split(':')[1], 10);
        map[verseNum] = item.text ?? '';
      }
      return map;
    },
    enabled: tafsirId !== null && !!surahId && surahId >= 1 && surahId <= 114,
    staleTime: 1000 * 60 * 30,
  });
}

// Searches ayah translations across one or more languages at once (e.g.
// English + Urdu together), tagging each hit with which language matched.
export function useSearch(query: string, langs: TranslationLang[] = ['en']) {
  return useQuery({
    queryKey: ['search', query, langs.join(',')],
    queryFn: async () => {
      const trimmed = query.trim();
      if (!trimmed || langs.length === 0) return [] as SearchResult[];
      const searchTerms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
      const results: SearchResult[] = [];
      const MAX_RESULTS = 60;

      const chapters = await fetchChapterJson('index.json') as Chapter[];

      for (const lang of langs) {
        const surahDataList = await Promise.all(
          chapters.map(c => fetchChapterJson(`${c.id}.json`, lang) as Promise<RawChapterData>)
        );

        for (let i = 0; i < surahDataList.length; i++) {
          const chapterData = surahDataList[i];
          for (const verse of chapterData.verses) {
            const translationLower = verse.translation.toLowerCase();
            if (searchTerms.every(term => translationLower.includes(term))) {
              results.push({
                globalId: getGlobalAyahId(chapterData.id, verse.id),
                surahNumber: chapterData.id,
                verseNumber: verse.id,
                text: verse.text,
                translation: verse.translation,
                transliteration: verse.transliteration,
                surahName: chapters[i].transliteration,
                matchedLang: lang,
              });
              if (results.length >= MAX_RESULTS) return results;
            }
          }
        }
      }
      return results;
    },
    enabled: query.trim().length > 1 && langs.length > 0,
    staleTime: Infinity,
  });
}
