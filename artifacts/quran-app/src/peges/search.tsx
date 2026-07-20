import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Search as SearchIcon, Loader2, ArrowRight, BookMarked, Hash } from 'lucide-react';
import {
  useChapters,
  useSearch,
  parseChapterVerseQuery,
  searchChaptersByName,
  type TranslationLang,
} from '@/hooks/use-quran';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const LANG_OPTIONS: { code: TranslationLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightTerms(text: string, terms: string[]): ReactNode {
  const cleanTerms = terms.map(t => t.trim()).filter(Boolean);
  if (cleanTerms.length === 0) return text;
  const pattern = cleanTerms.map(escapeRegex).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    cleanTerms.some(t => part.toLowerCase() === t.toLowerCase()) ? (
      <span key={i} className="bg-primary/20 text-primary font-medium px-1.5 py-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [langs, setLangs] = useState<TranslationLang[]>(['en', 'ur']);

  const { data: chapters } = useChapters('en');
  const { data: chaptersUr } = useChapters('ur');

  const trimmed = debouncedQuery.trim();
  const searchTerms = useMemo(() => trimmed.toLowerCase().split(/\s+/).filter(Boolean), [trimmed]);

  const chapterVerseMatch = useMemo(
    () => (chapters ? parseChapterVerseQuery(trimmed, chapters) : null),
    [trimmed, chapters],
  );
  const chapterNameMatches = useMemo(
    () => (chapters && trimmed.length > 1 ? searchChaptersByName(trimmed, chapters, chaptersUr) : []),
    [trimmed, chapters, chaptersUr],
  );

  const { data: results, isLoading, error } = useSearch(trimmed, langs);

  const toggleLang = (code: TranslationLang) => {
    setLangs(prev => {
      if (prev.includes(code)) {
        const next = prev.filter(l => l !== code);
        return next.length > 0 ? next : prev; // keep at least one language active
      }
      return [...prev, code];
    });
  };

  const hasChapterVerseMatch = !!chapterVerseMatch;
  const hasChapterNameMatches = chapterNameMatches.length > 0;
  const hasTextResults = (results?.length ?? 0) > 0;
  const nothingFound =
    trimmed.length > 1 && !isLoading && !hasChapterVerseMatch && !hasChapterNameMatches && !hasTextResults;

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-700 space-y-8">
      <div className="text-center space-y-4 mb-4">
        <h1 className="text-3xl font-serif tracking-tight">Search the Quran</h1>
        <p className="text-muted-foreground text-lg">
          چیپٹر، آیت نمبر، انگلش یا اردو ترجمے کے ذریعے تلاش کریں
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="e.g. 2:255, Al-Baqarah, mercy, صبر..."
            className="pl-14 h-14 text-lg bg-background border-border/50 focus-visible:ring-primary rounded-full shadow-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {isLoading && trimmed.length > 1 && (
            <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground pr-1">ترجمہ تلاش کریں:</span>
          {LANG_OPTIONS.map(opt => {
            const active = langs.includes(opt.code);
            return (
              <button
                key={opt.code}
                onClick={() => toggleLang(opt.code)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border/60 hover:border-primary/50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-4 space-y-10">
        {trimmed.length <= 1 ? (
          <div className="text-center py-16 text-muted-foreground bg-accent/20 rounded-3xl border border-border/30 space-y-2 px-6">
            <p>کم از کم 2 حروف لکھیں تلاش شروع کرنے کے لیے۔</p>
            <p className="text-sm">
              مثال کے طور پر: <span className="font-medium text-foreground">2:255</span> (آیت نمبر),{' '}
              <span className="font-medium text-foreground">Al-Baqarah</span> (سورۃ کا نام),{' '}
              <span className="font-medium text-foreground">mercy</span> یا{' '}
              <span className="font-medium text-foreground">صبر</span> (ترجمہ)
            </p>
          </div>
        ) : (
          <>
            {/* Direct chapter/verse reference */}
            {chapterVerseMatch && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 pl-2">
                  <Hash className="h-4 w-4" /> آیت نمبر سے براہ راست
                </h2>
                <Link
                  href={
                    chapterVerseMatch.verseNumber
                      ? `/surah/${chapterVerseMatch.chapter.id}#verse-${chapterVerseMatch.verseNumber}`
                      : `/surah/${chapterVerseMatch.chapter.id}`
                  }
                  className="flex items-center justify-between bg-primary/5 border border-primary/30 rounded-3xl p-6 hover:border-primary/60 hover:bg-primary/10 transition-all group"
                >
                  <div>
                    <p className="font-serif text-xl font-semibold">
                      {chapterVerseMatch.chapter.transliteration}
                      {chapterVerseMatch.verseNumber ? ` : ${chapterVerseMatch.verseNumber}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {chapterVerseMatch.chapter.translation} — {chapterVerseMatch.chapter.total_verses} آیات
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                </Link>
              </section>
            )}

            {/* Chapter name matches */}
            {hasChapterNameMatches && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 pl-2">
                  <BookMarked className="h-4 w-4" /> سورتیں ({chapterNameMatches.length})
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {chapterNameMatches.slice(0, 8).map(chapter => (
                    <Link
                      key={chapter.id}
                      href={`/surah/${chapter.id}`}
                      className="flex items-center justify-between bg-card border border-border/40 rounded-2xl p-4 hover:border-primary/50 hover:shadow-sm transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="font-serif font-semibold truncate">
                          {chapter.id}. {chapter.transliteration}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{chapter.translation}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Translation text matches */}
            <section className="space-y-4">
              {(hasTextResults || isLoading || error) && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 pl-2">
                  ترجمے میں مماثلت {hasTextResults && `(${results!.length})`}
                </h2>
              )}

              {isLoading ? (
                <div className="flex flex-col gap-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-40 bg-muted animate-pulse rounded-3xl" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-20 text-destructive bg-destructive/5 rounded-3xl border border-destructive/20">
                  Failed to load search results. Please check your connection and try again.
                </div>
              ) : hasTextResults ? (
                <div className="space-y-6">
                  {results!.map((ayah, idx) => (
                    <motion.div
                      key={`${ayah.matchedLang}-${ayah.globalId}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.5), duration: 0.3 }}
                      className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 hover:border-primary/50 transition-all shadow-sm hover:shadow-md group cursor-pointer"
                    >
                      <Link
                        href={`/surah/${ayah.surahNumber}#verse-${ayah.verseNumber}`}
                        className="block outline-none focus-visible:ring-2 ring-primary rounded-xl"
                      >
                        <div className="flex items-center justify-between mb-6 gap-3">
                          <span className="text-sm font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                            {ayah.surahName} • Verse {ayah.verseNumber}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide bg-accent text-accent-foreground px-2.5 py-1 rounded-full">
                              {ayah.matchedLang === 'ur' ? 'اردو' : 'EN'}
                            </span>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <p className="font-arabic text-right text-3xl leading-[2.2] text-foreground" dir="rtl">
                            {ayah.text}
                          </p>
                          <p
                            dir={ayah.matchedLang === 'ur' ? 'rtl' : 'ltr'}
                            className={`text-foreground/90 text-lg leading-relaxed ${
                              ayah.matchedLang === 'ur' ? 'font-arabic text-right leading-[2]' : 'font-serif'
                            }`}
                          >
                            {highlightTerms(ayah.translation, searchTerms)}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </section>

            {nothingFound && (
              <div className="text-center py-20 text-muted-foreground bg-accent/20 rounded-3xl border border-border/30">
                "{query}" کے لیے کوئی نتیجہ نہیں ملا
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
