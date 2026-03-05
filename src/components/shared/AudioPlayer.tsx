import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  onEnded?: () => void;
  className?: string;
  autoPlay?: boolean;
}

/**
 * Custom audio player using a presigned S3 URL.
 * - Resets fully when src changes (handles clip navigation)
 * - preload="auto" so large files buffer ahead and don't stall
 * - Shows buffering spinner while waiting for data
 * - Shows error state if audio fails to load
 * - Right-click / download disabled
 */
export function AudioPlayer({ src, onEnded, className, autoPlay }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [volume, setVolume]           = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isError, setIsError]         = useState(false);

  // ── Reset when src changes ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);
    setIsError(false);
    audio.load(); // forces browser to re-fetch new src
  }, [src]);

  // ── Event listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate    = () => setCurrentTime(audio.currentTime);
    const onLoadedMeta    = () => { setDuration(audio.duration); setIsBuffering(false); };
    const onPlay          = () => setIsPlaying(true);
    const onPause         = () => setIsPlaying(false);
    const onWaiting       = () => setIsBuffering(true);
    const onCanPlay       = () => setIsBuffering(false);
    const onError         = () => { setIsError(true); setIsPlaying(false); setIsBuffering(false); };
    const onEndedHandler  = () => { setIsPlaying(false); onEnded?.(); };
    const onContextMenu   = (e: MouseEvent) => e.preventDefault();

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('waiting',        onWaiting);
    audio.addEventListener('canplay',        onCanPlay);
    audio.addEventListener('error',          onError);
    audio.addEventListener('ended',          onEndedHandler);
    audio.addEventListener('contextmenu',    onContextMenu);

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('waiting',        onWaiting);
      audio.removeEventListener('canplay',        onCanPlay);
      audio.removeEventListener('error',          onError);
      audio.removeEventListener('ended',          onEndedHandler);
      audio.removeEventListener('contextmenu',    onContextMenu);
    };
  }, [onEnded]);

  // ── Auto-play ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [autoPlay, src]);

  // ── Controls ─────────────────────────────────────────────────────────────
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
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className={cn('flex items-center gap-2 text-error/70 text-sm', className)}>
        <AlertCircle size={15} />
        <span>Audio failed to load.</span>
        <button
          onClick={() => { setIsError(false); audioRef.current?.load(); }}
          className="btn btn-ghost btn-xs"
        >
          Retry
        </button>
        {/* Keep the element so retry can work */}
        <audio ref={audioRef} src={src} preload="auto" style={{ display: 'none' }} />
      </div>
    );
  }

  return (
    <div
      className={cn('audio-player select-none', className)}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Hidden audio — preload=auto buffers full file to prevent stalling */}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
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

        {/* Play / Pause — shows spinner while buffering */}
        <button
          onClick={togglePlay}
          disabled={isBuffering}
          className="btn btn-circle btn-primary btn-md shadow-lg disabled:opacity-80"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isBuffering
            ? <Loader2 size={18} className="animate-spin" />
            : isPlaying
            ? <Pause size={18} />
            : <Play size={18} className="ml-0.5" />
          }
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
            <span>{isBuffering ? 'Buffering…' : formatTime(duration)}</span>
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
