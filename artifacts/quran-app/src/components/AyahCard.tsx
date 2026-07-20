import { memo, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Bookmark as BookmarkIcon, MoreVertical, Check, Globe, BookOpen, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AudioButton } from '@/components/AudioPlayer';
import {
  type Ayah,
  type TranslationLang,
  type TafseerOption,
  type ActiveMode,
  TRANSLATION_LANGUAGES,
  TAFSEER_LIST,
} from '@/hooks/use-quran';
import { useBookmarks } from '@/hooks/use-bookmarks';

const TAFSEER_BY_LANG = TAFSEER_LIST.reduce<Record<string, TafseerOption[]>>((acc, t) => {
  (acc[t.lang] ??= []).push(t);
  return acc;
}, {});
const TAFSEER_LANG_ORDER = ['English', 'Urdu', 'Bengali', 'Arabic', 'Russian'];
const TAFSEER_PREVIEW_WORDS = 40;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function previewWords(plain: string, limit: number): { preview: string; truncated: boolean } {
  const words = plain.split(' ').filter(Boolean);
  if (words.length <= limit) return { preview: plain, truncated: false };
  return { preview: words.slice(0, limit).join(' ') + '…', truncated: true };
}

// Shared, static menu body — identical for every ayah, memoized so it is
// only rebuilt when the active selection or handler actually changes.
// Rendered inside a centered Dialog (not an anchored dropdown) so its
// position never depends on where the triggering three-dot button sits on
// the page.
const TranslationTafseerMenu = memo(function TranslationTafseerMenu({
  activeMode,
  onSelect,
}: {
  activeMode: ActiveMode;
  onSelect: (mode: ActiveMode) => void;
}) {
  const isLangActive = (lang: TranslationLang) =>
    activeMode.kind === 'translation' && activeMode.lang === lang;
  const isTafsirActive = (id: number) =>
    activeMode.kind === 'tafseer' && activeMode.tafsirId === id;

  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground/70 uppercase tracking-wide pt-2 px-1">
        <Globe className="h-3.5 w-3.5" />
        Quran Translate
      </p>
      <Separator />
      {TRANSLATION_LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => onSelect({ kind: 'translation', lang: lang.code })}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left cursor-pointer hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`font-medium ${lang.dir === 'rtl' ? 'font-arabic' : ''}`}
              dir={lang.dir ?? 'ltr'}
            >
              {lang.nativeLabel}
            </span>
            {lang.nativeLabel !== lang.label && (
              <span className="text-xs text-muted-foreground">{lang.label}</span>
            )}
          </div>
          {isLangActive(lang.code) && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
        </button>
      ))}

      <Separator className="my-2" />
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground/70 uppercase tracking-wide pt-1 px-1">
        <BookOpen className="h-3.5 w-3.5" />
        Tafseer
      </p>
      <Separator />
      {TAFSEER_LANG_ORDER.map(langName => {
        const options = TAFSEER_BY_LANG[langName];
        if (!options) return null;
        return (
          <div key={langName}>
            <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {langName}
            </p>
            {options.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect({ kind: 'tafseer', tafsirId: t.id })}
                className="flex w-full items-start justify-between gap-2 rounded-lg pl-4 pr-2 py-2 text-left cursor-pointer hover:bg-accent transition-colors"
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium leading-tight ${t.dir === 'rtl' ? 'font-arabic text-right' : ''}`}
                    dir={t.dir ?? 'ltr'}
                  >
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{t.author}</p>
                </div>
                {isTafsirActive(t.id) && <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
});

interface AyahCardProps {
  ayah: Ayah;
  index: number;
  surahNumber: number;
  surahName: string;
  isPlaying: boolean;
  activeMode: ActiveMode;
  translationMap: Record<number, string> | undefined;
  tafseerMap: Record<number, string> | undefined;
  contentLoading: boolean;
  onModeChange: (mode: ActiveMode) => void;
  onPlay: (globalId: number) => void;
  onPause: () => void;
  onEnded: (index: number) => void;
}

function AyahCardImpl({
  ayah,
  index,
  surahNumber,
  surahName,
  isPlaying,
  activeMode,
  translationMap,
  tafseerMap,
  contentLoading,
  onModeChange,
  onPlay,
  onPause,
  onEnded,
}: AyahCardProps) {
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(surahNumber, ayah.verseNumber);

  const isTranslationMode = activeMode.kind === 'translation';
  const isTafseerMode = activeMode.kind === 'tafseer';

  const activeLangMeta = isTranslationMode
    ? TRANSLATION_LANGUAGES.find(l => l.code === (activeMode as { kind: 'translation'; lang: TranslationLang }).lang)
    : null;
  const activeTafseerMeta = isTafseerMode
    ? TAFSEER_LIST.find(t => t.id === (activeMode as { kind: 'tafseer'; tafsirId: number }).tafsirId)
    : null;
  const isRtl = isTranslationMode ? activeLangMeta?.dir === 'rtl' : activeTafseerMeta?.dir === 'rtl';

  let displayText: string | null = null;
  if (!contentLoading) {
    displayText = isTranslationMode
      ? translationMap?.[ayah.verseNumber] ?? ayah.translation
      : tafseerMap?.[ayah.verseNumber] ?? null;
  }

  // "Read more" state for long tafseer entries — resets whenever the
  // displayed text changes (new ayah, new tafseer selection, etc.)
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [displayText, activeMode]);

  // Translation/Tafseer picker — a centered dialog rather than an anchored
  // dropdown, so it always opens in the same spot on screen regardless of
  // where this ayah's three-dot button happens to sit on the page.
  const [menuOpen, setMenuOpen] = useState(false);
  const handleSelectMode = (mode: ActiveMode) => {
    onModeChange(mode);
    setMenuOpen(false);
  };

  return (
    <div
      id={`verse-${ayah.verseNumber}`}
      className={`p-6 sm:p-8 rounded-3xl transition-colors duration-300 ${
        isPlaying ? 'bg-primary/5 ring-1 ring-primary/20 shadow-sm' : 'hover:bg-accent/30'
      }`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 gap-4 border-b border-border/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground text-sm font-semibold flex-shrink-0">
            {ayah.verseNumber}
          </div>
          <AudioButton
            ayahId={ayah.globalId}
            isPlaying={isPlaying}
            onPlay={() => onPlay(ayah.globalId)}
            onPause={onPause}
            onEnded={() => onEnded(index)}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full hover:bg-accent ${
              bookmarked ? 'text-primary hover:text-primary' : 'text-muted-foreground'
            }`}
            onClick={() =>
              toggleBookmark({
                surahNumber,
                ayahNumber: ayah.verseNumber,
                text: ayah.text,
                translation: ayah.translation,
                surahName,
              })
            }
          >
            <BookmarkIcon className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-accent text-muted-foreground"
            onClick={() => setMenuOpen(true)}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>

          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ترجمہ اور تفسیر</DialogTitle>
              </DialogHeader>
              <TranslationTafseerMenu activeMode={activeMode} onSelect={handleSelectMode} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Arabic text */}
      <div className="space-y-8">
        <p
          className="font-arabic text-right text-3xl sm:text-4xl leading-[2.5] sm:leading-[2.5] text-foreground"
          dir="rtl"
        >
          {ayah.text}
        </p>

        {/* Translation / Tafseer content */}
        <div className="space-y-3">
          {isTafseerMode && activeTafseerMeta && (
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                {activeTafseerMeta.name} — {activeTafseerMeta.lang}
              </span>
            </div>
          )}

          {contentLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">لوڈ ہو رہا ہے…</span>
            </div>
          ) : isTafseerMode ? (
            displayText ? (
              <TafseerContent html={displayText} isRtl={!!isRtl} expanded={expanded} onExpand={() => setExpanded(true)} />
            ) : (
              <p className="text-sm text-muted-foreground italic">تفسیر دستیاب نہیں</p>
            )
          ) : (
            <p
              dir={isRtl ? 'rtl' : 'ltr'}
              className={`text-lg sm:text-xl text-foreground/90 leading-relaxed ${
                isRtl ? 'font-arabic text-right leading-[2.2]' : 'font-serif'
              }`}
            >
              {displayText}
            </p>
          )}

          <p className="text-sm text-muted-foreground italic">{ayah.transliteration}</p>
        </div>
      </div>
    </div>
  );
}

function TafseerContent({
  html,
  isRtl,
  expanded,
  onExpand,
}: {
  html: string;
  isRtl: boolean;
  expanded: boolean;
  onExpand: () => void;
}) {
  const safeHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  if (expanded) {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed ${
          isRtl ? 'font-arabic text-right text-lg leading-[2]' : 'font-serif text-base'
        }`}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  const { preview, truncated } = previewWords(stripHtml(html), TAFSEER_PREVIEW_WORDS);
  return (
    <div>
      <p
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`text-foreground/90 leading-relaxed ${
          isRtl ? 'font-arabic text-right text-lg leading-[2]' : 'font-serif text-base'
        }`}
      >
        {preview}
      </p>
      {truncated && (
        <button
          onClick={onExpand}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          مزید پڑھیں (Read More)
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Memoized so switching e.g. playback state on one ayah, or opening its
// dropdown (fully local Radix state), never forces a re-render of every
// other ayah card in a long surah.
export const AyahCard = memo(AyahCardImpl);
