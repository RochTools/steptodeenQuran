import { Link } from 'wouter';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Bookmarks() {
  const { bookmarks, toggleBookmark } = useBookmarks();

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-700 space-y-8">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
        <BookmarkIcon className="h-8 w-8 text-primary fill-primary/10" />
        <h1 className="text-3xl font-serif">Bookmarks</h1>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20 px-4 bg-accent/20 rounded-3xl border border-border/30">
          <BookmarkIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-6" />
          <h2 className="text-2xl font-serif text-foreground mb-3">No bookmarks yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-lg">
            Save verses that inspire you to easily return to them later.
          </p>
          <Link href="/">
            <Button className="rounded-full px-8 h-12 text-base">Read the Quran</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookmarks.map((bookmark, idx) => (
            <motion.div 
              key={`${bookmark.surahNumber}-${bookmark.ayahNumber}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-6">
                <Link href={`/surah/${bookmark.surahNumber}#verse-${bookmark.ayahNumber}`} className="group flex items-center gap-2 outline-none focus-visible:ring-2 ring-primary rounded-full">
                  <span className="text-sm font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {bookmark.surahName} • Verse {bookmark.ayahNumber}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  onClick={() => toggleBookmark(bookmark)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-6">
                <p className="font-arabic text-right text-3xl leading-[2.2] text-foreground" dir="rtl">
                  {bookmark.text}
                </p>
                <p className="text-muted-foreground font-serif text-lg leading-relaxed">
                  {bookmark.translation}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}