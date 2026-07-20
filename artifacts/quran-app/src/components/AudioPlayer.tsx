import { useRef, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioButtonProps {
  ayahId: number; // global ayah ID (1–6236)
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
}

export function AudioButton({ ayahId, isPlaying, onPlay, onPause, onEnded }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef(onEnded);
  const onPauseRef = useRef(onPause);

  // Keep callbacks fresh without re-triggering the audio effect
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);

  useEffect(() => {
    // Tear down any existing audio element whenever ayahId or isPlaying changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (!isPlaying) return;

    const audio = new Audio(
      `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahId}.mp3`
    );

    const handleEnded = () => onEndedRef.current();
    const handleError = () => onPauseRef.current();

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audioRef.current = audio;

    audio.play().catch(() => onPauseRef.current());

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [isPlaying, ayahId]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
      className={`rounded-full h-8 w-8 ${
        isPlaying
          ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary'
          : 'text-muted-foreground hover:bg-accent'
      }`}
      onClick={isPlaying ? onPause : onPlay}
    >
      {isPlaying ? (
        <Square className="h-4 w-4 fill-current" />
      ) : (
        <Play className="h-4 w-4 fill-current ml-0.5" />
      )}
    </Button>
  );
}
