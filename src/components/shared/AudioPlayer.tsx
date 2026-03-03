import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  onEnded?: () => void;
  className?: string;
  autoPlay?: boolean;
}

/**
 * Custom audio player using a presigned S3 URL.
 * - Right-click and keyboard download disabled
 * - No native download controls exposed
 * - Calls onEnded when clip finishes
 */
export function AudioPlayer({ src, onEnded, className, autoPlay }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEndedHandler = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEndedHandler);

    // Block context menu to prevent "Save Audio As"
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    audio.addEventListener('contextmenu', onContextMenu);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEndedHandler);
      audio.removeEventListener('contextmenu', onContextMenu);
    };
  }, [onEnded]);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [autoPlay, src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn('audio-player select-none', className)}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Hidden audio element — controlsList blocks native download */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        controlsList="nodownload nofullscreen noremoteplayback"
        style={{ display: 'none' }}
      />

      <div className="flex items-center gap-3">
        {/* Restart */}
        <button
          onClick={handleRestart}
          className="btn btn-ghost btn-xs btn-circle text-base-content/60"
          title="Restart"
        >
          <RotateCcw size={16} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="btn btn-circle btn-primary btn-md shadow-lg"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        {/* Progress */}
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="range range-xs range-primary cursor-pointer"
          />
          <div className="flex justify-between text-xs text-base-content/40">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <Volume2 size={14} className="text-base-content/40" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolume}
            className="range range-xs range-primary w-16 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
