import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, RefreshCw, Volume2, VolumeX, 
  ExternalLink, X, Film, Check, Sparkles
} from 'lucide-react';

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const existing = document.getElementById('yt-iframe-api-script');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') previousOnReady();
      resolve(window.YT);
    };
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function SharedCinemaPlayer({
  watchTogetherState,
  onAction,
  onOpenModal,
  onClose,
  currentUser
}) {
  const playerRef = useRef(null);
  const videoRef = useRef(null);
  const isRemoteSyncRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [syncToast, setSyncToast] = useState(null);
  const [justSyncedToast, setJustSyncedToast] = useState(false);

  const isDirectVideo = watchTogetherState?.url && (
    watchTogetherState.url.endsWith('.mp4') || 
    watchTogetherState.url.endsWith('.webm') || 
    watchTogetherState.url.endsWith('.ogg')
  );

  // 1. YouTube Player Setup
  useEffect(() => {
    if (isDirectVideo || !watchTogetherState?.videoId) return;

    let isSubscribed = true;
    const videoId = watchTogetherState.videoId;

    loadYouTubeApi().then((YT) => {
      if (!isSubscribed) return;

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        const elapsed = watchTogetherState.isPlaying && watchTogetherState.updatedAt 
          ? (Date.now() - watchTogetherState.updatedAt) / 1000 
          : 0;
        const startTime = (watchTogetherState.currentTime || 0) + elapsed;
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: Math.max(0, startTime)
        });
        if (!watchTogetherState.isPlaying) {
          playerRef.current.pauseVideo();
        }
        return;
      }

      const container = document.getElementById('shared-youtube-iframe');
      if (!container) return;

      playerRef.current = new YT.Player('shared-youtube-iframe', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e) => {
            if (!isSubscribed) return;
            setIsReady(true);
            const p = e.target;
            const d = p.getDuration() || 0;
            setDuration(d);

            const elapsed = watchTogetherState.isPlaying && watchTogetherState.updatedAt 
              ? (Date.now() - watchTogetherState.updatedAt) / 1000 
              : 0;
            const targetTime = (watchTogetherState.currentTime || 0) + elapsed;
            
            isRemoteSyncRef.current = true;
            p.seekTo(targetTime, true);
            if (watchTogetherState.isPlaying) {
              p.playVideo();
            } else {
              p.pauseVideo();
            }
            setTimeout(() => { isRemoteSyncRef.current = false; }, 600);
          },
          onStateChange: (event) => {
            if (isRemoteSyncRef.current) return;
            const p = event.target;
            const time = p.getCurrentTime() || 0;

            if (event.data === YT.PlayerState.PLAYING) {
              onAction && onAction('play', time);
            } else if (event.data === YT.PlayerState.PAUSED) {
              onAction && onAction('pause', time);
            }
          }
        }
      });
    });

    return () => {
      isSubscribed = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy(); } catch (err) {}
        playerRef.current = null;
      }
    };
  }, [watchTogetherState?.videoId, isDirectVideo]);

  // 2. Incoming Remote State Synchronization (Play/Pause & Seek Drift)
  useEffect(() => {
    if (!watchTogetherState) return;

    if (isDirectVideo && videoRef.current) {
      const v = videoRef.current;
      const elapsed = watchTogetherState.isPlaying && watchTogetherState.updatedAt 
        ? (Date.now() - watchTogetherState.updatedAt) / 1000 
        : 0;
      const targetTime = (watchTogetherState.currentTime || 0) + elapsed;
      
      isRemoteSyncRef.current = true;
      if (Math.abs(v.currentTime - targetTime) > 1.2) {
        v.currentTime = targetTime;
      }
      if (watchTogetherState.isPlaying && v.paused) {
        v.play().catch(() => {});
      } else if (!watchTogetherState.isPlaying && !v.paused) {
        v.pause();
      }
      setTimeout(() => { isRemoteSyncRef.current = false; }, 500);
      return;
    }

    const p = playerRef.current;
    if (!p || typeof p.getPlayerState !== 'function') return;

    const elapsed = watchTogetherState.isPlaying && watchTogetherState.updatedAt 
      ? (Date.now() - watchTogetherState.updatedAt) / 1000 
      : 0;
    const targetTime = watchTogetherState.isPlaying 
      ? (watchTogetherState.currentTime + elapsed) 
      : watchTogetherState.currentTime;

    isRemoteSyncRef.current = true;

    const localTime = p.getCurrentTime() || 0;
    const drift = Math.abs(localTime - targetTime);
    if (drift > 1.4) {
      p.seekTo(targetTime, true);
    }

    const state = p.getPlayerState();
    if (watchTogetherState.isPlaying && state !== window.YT.PlayerState.PLAYING) {
      p.playVideo();
    } else if (!watchTogetherState.isPlaying && state !== window.YT.PlayerState.PAUSED) {
      p.pauseVideo();
    }

    setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 600);
  }, [
    watchTogetherState?.isPlaying, 
    watchTogetherState?.currentTime, 
    watchTogetherState?.updatedAt, 
    isDirectVideo
  ]);

  // 3. Last Action Toast Banner
  useEffect(() => {
    if (watchTogetherState?.lastAction) {
      const act = watchTogetherState.lastAction;
      let text = '';
      if (act.type === 'play') text = `${act.by} videoyu başlattı ▶`;
      else if (act.type === 'pause') text = `${act.by} videoyu durdurdu ⏸ (${formatTime(act.time)})`;
      else if (act.type === 'seek') text = `${act.by} videoyu ${formatTime(act.time)} konumuna sardı ⏩`;

      setSyncToast(text);
      const timer = setTimeout(() => setSyncToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [watchTogetherState?.lastAction?.timestamp]);

  // 4. Progress bar polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirectVideo && videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        if (videoRef.current.duration) setDuration(videoRef.current.duration);
      } else if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const t = playerRef.current.getCurrentTime();
          const d = playerRef.current.getDuration();
          if (typeof t === 'number') setCurrentTime(t);
          if (typeof d === 'number' && d > 0) setDuration(d);
        } catch (e) {}
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isDirectVideo]);

  // User Actions (Broadcasted to whole room)
  const handleTogglePlay = () => {
    const nextState = !watchTogetherState.isPlaying;
    if (isDirectVideo && videoRef.current) {
      const t = videoRef.current.currentTime;
      if (nextState) {
        videoRef.current.play().catch(() => {});
        onAction && onAction('play', t);
      } else {
        videoRef.current.pause();
        onAction && onAction('pause', t);
      }
    } else if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const t = playerRef.current.getCurrentTime();
      if (nextState) {
        playerRef.current.playVideo();
        onAction && onAction('play', t);
      } else {
        playerRef.current.pauseVideo();
        onAction && onAction('pause', t);
      }
    }
  };

  const handleSkip = (secondsDelta) => {
    let newTime = Math.max(0, currentTime + secondsDelta);
    if (duration > 0) newTime = Math.min(duration, newTime);

    if (isDirectVideo && videoRef.current) {
      videoRef.current.currentTime = newTime;
      onAction && onAction('seek', newTime);
    } else if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(newTime, true);
      onAction && onAction('seek', newTime);
    }
  };

  const handleSeekSlider = (e) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (isDirectVideo && videoRef.current) {
      videoRef.current.currentTime = target;
      onAction && onAction('seek', target);
    } else if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(target, true);
      onAction && onAction('seek', target);
    }
  };

  const handleForceSync = () => {
    const elapsed = watchTogetherState.isPlaying && watchTogetherState.updatedAt 
      ? (Date.now() - watchTogetherState.updatedAt) / 1000 
      : 0;
    const targetTime = (watchTogetherState.currentTime || 0) + elapsed;

    if (isDirectVideo && videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (watchTogetherState.isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    } else if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetTime, true);
      if (watchTogetherState.isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
    setJustSyncedToast(true);
    setTimeout(() => setJustSyncedToast(false), 2000);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#3f4147] shadow-2xl flex flex-col group select-none">
      {/* Top Bar */}
      <div className="bg-[#111214]/90 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex items-center gap-1 text-xs font-black bg-[#ea3323] text-white px-2.5 py-0.5 rounded-full shadow-xs animate-pulse shrink-0">
            🍿 BİRLİKTE İZLE
          </span>
          <span className="text-sm font-bold text-white truncate">
            {watchTogetherState.videoTitle || 'Ortak Video'}
          </span>
          <span className="text-xs text-[#949ba4] hidden sm:inline shrink-0">
            (Başlatan: {watchTogetherState.startedBy || 'Arkadaşın'})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {watchTogetherState.videoId && (
            <button
              onClick={() => window.open(`https://www.youtube.com/watch?v=${watchTogetherState.videoId}`, '_blank')}
              className="p-1.5 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white transition-all cursor-pointer"
              title="YouTube'da Aç"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenModal}
            className="px-3 py-1 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all cursor-pointer"
          >
            🎬 Değiştir
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#f23f43]/20 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isDirectVideo ? (
          <video
            ref={videoRef}
            src={watchTogetherState.url}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
          />
        ) : (
          <div className="w-full h-full">
            <div id="shared-youtube-iframe" className="w-full h-full pointer-events-auto" />
          </div>
        )}

        {/* Sync notification toast */}
        {syncToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-[#5865f2] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 z-30">
            <Sparkles className="w-3.5 h-3.5 text-[#5865f2] animate-spin" />
            <span>{syncToast}</span>
          </div>
        )}

        {justSyncedToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#23a55a]/90 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in duration-150 z-30">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Oda ile kusursuz senkronize edildi!</span>
          </div>
        )}
      </div>

      {/* SHARED CONTROLS BAR (BROADCASTS ACTIONS ACROSS ROOM) */}
      <div className="bg-[#111214]/95 backdrop-blur-md px-4 py-2.5 border-t border-white/10 shrink-0 flex flex-col gap-2 z-20">
        
        {/* Scrubber Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#949ba4] min-w-12 text-right select-none">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={currentTime}
              onChange={handleSeekSlider}
              className="w-full h-1.5 bg-[#383a40] hover:bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#ea3323] transition-all"
              title="Videoyu Sar (Tüm odayla senkronize olur)"
            />
          </div>

          <span className="text-xs font-mono text-[#949ba4] min-w-12 select-none">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="px-4 py-1.5 rounded-xl bg-[#ea3323] hover:bg-[#c9281a] text-white text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              title={watchTogetherState.isPlaying ? 'Odadaki Herkes İçin Durdur (Space)' : 'Odadaki Herkes İçin Başlat (Space)'}
            >
              {watchTogetherState.isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Durdur</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Başlat</span>
                </>
              )}
            </button>

            {/* -10s Skip Back */}
            <button
              onClick={() => handleSkip(-10)}
              className="px-3 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="10 Saniye Geri Sar (Odadaki herkes için)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-10s</span>
            </button>

            {/* +10s Skip Forward */}
            <button
              onClick={() => handleSkip(10)}
              className="px-3 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="10 Saniye İleri Sar (Odadaki herkes için)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+10s</span>
            </button>
          </div>

          {/* Sync status & Force Sync Button */}
          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-[#23a55a] font-bold bg-[#23a55a]/10 px-2.5 py-1 rounded-lg border border-[#23a55a]/20">
              <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
              <span>Canlı Senkronize</span>
            </div>

            <button
              onClick={handleForceSync}
              className="px-3 py-1 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-[#949ba4] hover:text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Herhangi bir kayma varsa videoyu odanın tam saniyesine eşitle"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Eşitle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
