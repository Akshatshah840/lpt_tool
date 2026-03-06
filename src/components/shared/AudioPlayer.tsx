import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  title?: string;
  onEnded?: () => void;
  className?: string;
  autoPlay?: boolean;
  /** Called when audio fails to load (e.g. expired presigned URL). Parent should re-fetch the URL. */
  onError?: () => void;
}

const WAVEFORM_HEIGHTS = [0.45, 0.75, 1, 0.6, 0.85, 0.5, 0.9, 0.7, 0.45, 0.65, 0.8, 0.55];

export function AudioPlayer({ src, title, onEnded, className, autoPlay, onError: onErrorProp }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [volume, setVolume]           = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isError, setIsError]         = useState(false);

  // ── Reset display state when src changes ─────────────────────────────────
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);
    setIsError(false);
  }, [src]);

  // ── Event listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate   = () => setCurrentTime(audio.currentTime);
    const onLoadedMeta   = () => { setDuration(audio.duration); setIsBuffering(false); };
    const onPlay         = () => { setIsPlaying(true);  setIsBuffering(false); };
    const onPause        = () => setIsPlaying(false);
    const onWaiting      = () => setIsBuffering(true);
    const onCanPlay      = () => setIsBuffering(false);
    const onCanPlayThru  = () => setIsBuffering(false);
    const onSeeked       = () => setIsBuffering(false);
    const onStalled      = () => setIsBuffering(false);
    const onError        = () => { setIsError(true); setIsPlaying(false); setIsBuffering(false); onErrorProp?.(); };
    const onEndedHandler = () => { setIsPlaying(false); onEnded?.(); };
    const blockCtx       = (e: MouseEvent) => e.preventDefault();

    audio.addEventListener('timeupdate',      onTimeUpdate);
    audio.addEventListener('loadedmetadata',  onLoadedMeta);
    audio.addEventListener('play',            onPlay);
    audio.addEventListener('pause',           onPause);
    audio.addEventListener('waiting',         onWaiting);
    audio.addEventListener('canplay',         onCanPlay);
    audio.addEventListener('canplaythrough',  onCanPlayThru);
    audio.addEventListener('seeked',          onSeeked);
    audio.addEventListener('stalled',         onStalled);
    audio.addEventListener('error',           onError);
    audio.addEventListener('ended',           onEndedHandler);
    audio.addEventListener('contextmenu',     blockCtx);

    return () => {
      audio.removeEventListener('timeupdate',      onTimeUpdate);
      audio.removeEventListener('loadedmetadata',  onLoadedMeta);
      audio.removeEventListener('play',            onPlay);
      audio.removeEventListener('pause',           onPause);
      audio.removeEventListener('waiting',         onWaiting);
      audio.removeEventListener('canplay',         onCanPlay);
      audio.removeEventListener('canplaythrough',  onCanPlayThru);
      audio.removeEventListener('seeked',          onSeeked);
      audio.removeEventListener('stalled',         onStalled);
      audio.removeEventListener('error',           onError);
      audio.removeEventListener('ended',           onEndedHandler);
      audio.removeEventListener('contextmenu',     blockCtx);
    };
  }, [onEnded]);

  // ── Auto-play ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [autoPlay, src]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Audio play failed:', e);
        setIsError(true);
      }
    }
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  };

  const handleRestart = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    try { await audio.play(); } catch { /* ignore */ }
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

  if (isError) {
    return (
      <div className={cn('flex items-center gap-2 text-error/70 text-sm', className)}>
        <AlertCircle size={15} />
        <span>Audio failed to load.</span>
        <button
          onClick={() => { setIsError(false); setIsBuffering(false); onErrorProp?.(); }}
          className="btn btn-ghost btn-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn('audio-player select-none', className)}
      onContextMenu={e => e.preventDefault()}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        controlsList="nodownload nofullscreen noremoteplayback"
        style={{ display: 'none' }}
      />

      {/* Optional title + waveform row */}
      {(title || true) && (
        <div className="flex items-center justify-between mb-3">
          {title ? (
            <span className="text-xs font-medium text-base-content/50 truncate max-w-[60%]">{title}</span>
          ) : (
            <span />
          )}
          {/* Waveform indicator */}
          <div className="flex items-end gap-px h-4 flex-shrink-0">
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className={cn(
                  'w-0.5 rounded-full',
                  isPlaying ? 'audio-waveform-bar' : 'opacity-40'
                )}
                style={{
                  height: `${Math.round(h * 16)}px`,
                  background: 'oklch(var(--p))',
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: `${0.65 + (i % 4) * 0.12}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

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
          {isBuffering && !isPlaying
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
            <span>{isBuffering && !duration ? 'Loading…' : formatTime(duration)}</span>
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
