import { useState } from 'react';
import { Link } from 'wouter';
import { Search } from 'lucide-react';
import { useChapters } from '@/hooks/use-quran';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Home() {
  const { data: chapters, isLoading, error } = useChapters();
  const [search, setSearch] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg max-w-md mx-auto w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-12">Failed to load surahs.</div>;
  }

  const filtered = chapters?.filter(c => 
    c.transliteration.toLowerCase().includes(search.toLowerCase()) ||
    c.translation.toLowerCase().includes(search.toLowerCase()) ||
    c.name.includes(search)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4 mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight">The Noble Quran</h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-lg">
          Read, study, and reflect on the words of Allah.
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          type="search"
          placeholder="Search Surah (e.g. Al-Fatihah, The Opener)" 
          className="pl-12 h-14 bg-background border-border/50 focus-visible:ring-primary rounded-2xl text-base shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
        {filtered?.map((chapter, index) => (
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.5) }}
          >
            <Link href={`/surah/${chapter.id}`} className="block h-full outline-none focus-visible:ring-2 ring-primary rounded-xl">
              <Card className="p-5 h-full hover:border-primary/50 transition-all duration-300 bg-card hover:bg-accent/30 cursor-pointer group flex items-center gap-4 rounded-xl border-border/40 shadow-sm hover:shadow-md">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-lg">
                  {chapter.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg truncate">{chapter.transliteration}</h3>
                    <span className="font-arabic text-2xl text-primary flex-shrink-0">{chapter.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
                    <span className="truncate mr-2 font-serif italic">{chapter.translation}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                      {chapter.type === 'meccan' ? 'Meccan' : 'Medinan'} • {chapter.total_verses}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
        {filtered?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No surahs found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}