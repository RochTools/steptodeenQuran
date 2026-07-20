import { Link, useLocation } from 'wouter';
import { useTheme } from 'next-themes';
import { Moon, Sun, BookOpen, Bookmark, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <BookOpen className="h-6 w-6" />
            <span className="font-semibold text-lg tracking-wide font-sans">Quran Reader</span>
          </Link>
          
          <nav className="flex items-center gap-1 sm:gap-4">
            <Link href="/" className={`p-2 rounded-md transition-colors ${location === '/' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              <BookOpen className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline-block font-medium text-sm">Read</span>
            </Link>
            <Link href="/search" className={`p-2 rounded-md transition-colors ${location === '/search' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              <Search className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline-block font-medium text-sm">Search</span>
            </Link>
            <Link href="/bookmarks" className={`p-2 rounded-md transition-colors ${location === '/bookmarks' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              <Bookmark className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline-block font-medium text-sm">Bookmarks</span>
            </Link>
            
            <div className="w-px h-6 bg-border mx-1 sm:mx-2" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>
      
      <footer className="border-t border-border/50 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-serif italic">Read, study, and reflect.</p>
        </div>
      </footer>
    </div>
  );
}