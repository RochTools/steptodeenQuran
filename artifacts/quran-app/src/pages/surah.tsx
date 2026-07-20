import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useParams, Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  useSurah,
  useChapters,
  useChapterTranslation,
  useTafseer,
  type ActiveMode,
} from '@/hooks/use-quran';
import { AyahCard } from '@/components/AyahCard';

export default function Surah() {
  const params = useParams();
  const surahNumber = parseInt(params.number || '1', 10);
  const { data: surah, isLoading, error } = useSurah(surahNumber);
  const { data: chapters } = useChapters();

  const [playingAyahId, setPlayingAyahId] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<ActiveMode>({ kind: 'translation', lang: 'en' });

  const chapter = chapters?.find(c => c.id === surahNumber);

  // Fetch translation when mode is translation
  const { data: translationMap, isLoading: translationLoading } = useChapterTranslation(
    surahNumber,
    activeMode.kind === 'translation' ? activeMode.lang : 'en',
  );
  // Fetch tafseer when mode is tafseer
  const { data: tafseerMap, isLoading: tafseerLoading } = useTafseer(
    surahNumber,
    activeMode.kind === 'tafseer' ? activeMode.tafsirId : null,
  );
  const contentLoading = activeMode.kind === 'translation' ? translationLoading : tafseerLoading;

  // ── Virtualized list setup ──────────────────────────────────────────────
  // Long surahs (up to 286 ayahs) previously rendered every AyahCard's full
  // DOM subtree at once, which made opening the three-dot dropdown feel like
  // a hang (Radix has to measure a huge page). Only the visible window is
  // mounted now.
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setScrollMargin(listRef.current?.offsetTop ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [surahNumber, surah?.length]);

  const virtualizer = useWindowVirtualizer({
    count: surah?.length ?? 0,
    estimateSize: () => 320,
    overscan: 6,
    scrollMargin,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPlayingAyahId(null);
  }, [surahNumber]);

  // Jump to a specific verse when arriving via a #verse-N link (e.g. from
  // search) — handles both the initial load and hash changes while already
  // on this surah's page (virtualized rows aren't in the DOM for native
  // anchor scrolling to work, so this is done manually via the virtualizer).
  useEffect(() => {
    if (!surah) return;
    const jumpToHash = () => {
      const hash = window.location.hash;
      if (hash?.startsWith('#verse-')) {
        const verseNum = parseInt(hash.slice('#verse-'.length), 10);
        const idx = surah.findIndex(a => a.verseNumber === verseNum);
        if (idx >= 0) {
          requestAnimationFrame(() => virtualizer.scrollToIndex(idx, { align: 'start' }));
        }
      }
    };
    jumpToHash();
    window.addEventListener('hashchange', jumpToHash);
    return () => window.removeEventListener('hashchange', jumpToHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, surahNumber]);

  // Stable callbacks (referentially unchanged across renders) so AyahCard's
  // memoization actually prevents unrelated re-renders.
  const handlePlay = useCallback((globalId: number) => setPlayingAyahId(globalId), []);
  const handlePause = useCallback(() => setPlayingAyahId(null), []);
  const handleEnded = useCallback(
    (index: number) => {
      setPlayingAyahId(() => {
        if (!surah) return null;
        const next = index < surah.length - 1 ? surah[index + 1] : null;
        return next ? next.globalId : null;
      });
    },
    [surah],
  );

  // Keep the currently playing ayah in view as playback advances
  useEffect(() => {
    if (playingAyahId == null || !surah) return;
    const idx = surah.findIndex(a => a.globalId === playingAyahId);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingAyahId, surah]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse max-w-3xl mx-auto">
        <div className="h-24 bg-muted rounded-2xl w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted rounded-xl w-full" />
        ))}
      </div>
    );
  }

  if (error || !surah || !chapter) {
    return <div className="text-center py-12 text-destructive">Failed to load Surah.</div>;
  }

  const prevSurah = surahNumber > 1 ? surahNumber - 1 : null;
  const nextSurah = surahNumber < 114 ? surahNumber + 1 : null;
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="pb-24 animate-in fade-in duration-700">
      {/* Sticky header */}
      <div className="sticky top-16 z-40 bg-background/90 backdrop-blur-md py-4 border-b border-border/50 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {prevSurah ? (
            <Link
              href={`/surah/${prevSurah}`}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </Link>
          ) : (
            <div className="w-10" />
          )}

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold font-serif">{chapter.transliteration}</h1>
            <p className="text-sm text-muted-foreground font-serif italic">{chapter.translation}</p>
          </div>

          {nextSurah ? (
            <Link
              href={`/surah/${nextSurah}`}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </Link>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {surahNumber !== 9 && (
          <div className="text-center py-10">
            <h2 className="font-arabic text-4xl sm:text-5xl text-primary leading-loose">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </h2>
          </div>
        )}

        {/* Virtualized ayah list */}
        <div ref={listRef} style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
          {virtualItems.map(virtualRow => {
            const ayah = surah[virtualRow.index];
            const isPlaying = playingAyahId === ayah.globalId;
            return (
              <div
                key={ayah.globalId}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <div className="pb-12">
                  <AyahCard
                    ayah={ayah}
                    index={virtualRow.index}
                    surahNumber={surahNumber}
                    surahName={chapter.transliteration}
                    isPlaying={isPlaying}
                    activeMode={activeMode}
                    translationMap={activeMode.kind === 'translation' ? translationMap : undefined}
                    tafseerMap={activeMode.kind === 'tafseer' ? tafseerMap : undefined}
                    contentLoading={contentLoading}
                    onModeChange={setActiveMode}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onEnded={handleEnded}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
