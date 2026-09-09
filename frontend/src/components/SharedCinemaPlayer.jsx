import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, RefreshCw, 
  ExternalLink, X, Film, Check, Sparkles, AlertCircle, Volume2
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
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const isRemoteSyncRef = useRef(false);
  const isInitialSyncRef = useRef(true);
  const lastEmittedActionTimeRef = useRef(0);
  const watchTogetherStateRef = useRef(watchTogetherState);

  useEffect(() => {
    watchTogetherStateRef.current = watchTogetherState;
  }, [watchTogetherState]);

  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [syncToast, setSyncToast] = useState(null);
  const [justSyncedToast, setJustSyncedToast] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [sliderTime, setSliderTime] = useState(0);

  const videoId = watchTogetherState?.videoId;

  // 1. YouTube Player Instance Lifecycle
  useEffect(() => {
    if (!videoId) return;

    let isSubscribed = true;

    loadYouTubeApi().then((YT) => {
      if (!isSubscribed) return;

      const curr = watchTogetherStateRef.current;
      const elapsed = curr?.isPlaying && curr?.updatedAt 
        ? (Date.now() - curr.updatedAt) / 1000 
        : 0;
      const initialTargetTime = Math.max(0, (curr?.currentTime || 0) + elapsed);

      // If player already exists and we just need to change video ID:
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        isRemoteSyncRef.current = true;
        isInitialSyncRef.current = true;
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: initialTargetTime
        });
        if (!curr?.isPlaying) {
          playerRef.current.pauseVideo();
        }
        setTimeout(() => { 
          isRemoteSyncRef.current = false;
          isInitialSyncRef.current = false;
        }, 1200);
        return;
      }

      // Fresh container injection to avoid React DOM unmount conflict with YouTube's iframe replacement
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '<div id="shared-yt-player-elem" style="width:100%;height:100%;"></div>';

      isInitialSyncRef.current = true;
      isRemoteSyncRef.current = true;

      playerRef.current = new YT.Player('shared-yt-player-elem', {
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
          iv_load_policy: 3,
          start: Math.floor(initialTargetTime),
          origin: window.location.origin
        },
        events: {
          onReady: (e) => {
            if (!isSubscribed) return;
            setIsReady(true);
            const p = e.target;
            const d = p.getDuration() || 0;
            setDuration(d);

            // Re-calculate accurate target time upon player ready
            const latestState = watchTogetherStateRef.current;
            const el = latestState?.isPlaying && latestState?.updatedAt 
              ? (Date.now() - latestState.updatedAt) / 1000 
              : 0;
            const targetTime = Math.max(0, (latestState?.currentTime || 0) + el);

            isRemoteSyncRef.current = true;
            isInitialSyncRef.current = true;
            p.seekTo(targetTime, true);

            if (latestState?.isPlaying) {
              p.playVideo();
              // Check if browser blocked unmuted autoplay
              setTimeout(() => {
                try {
                  const state = p.getPlayerState();
                  if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
                    setAutoplayBlocked(true);
                  }
                } catch (e) {}
              }, 1000);
            } else {
              p.pauseVideo();
            }

            // Keep initial sync guard active so buffer transitions don't emit play/pause actions
            setTimeout(() => { 
              isRemoteSyncRef.current = false; 
              isInitialSyncRef.current = false;
            }, 1200);
          },
          onStateChange: (event) => {
            // NEVER emit actions during remote updates or initial player loading/seeking!
            if (isRemoteSyncRef.current || isInitialSyncRef.current) return;
            const p = event.target;
            const time = p.getCurrentTime() || 0;

            const now = Date.now();
            if (now - lastEmittedActionTimeRef.current < 200) return;

            const currentRoomState = watchTogetherStateRef.current;
            // ONLY emit 'play' if the room was currently paused!
            if (event.data === YT.PlayerState.PLAYING && currentRoomState && !currentRoomState.isPlaying) {
              lastEmittedActionTimeRef.current = now;
              setAutoplayBlocked(false);
              onAction && onAction('play', time);
            } 
            // ONLY emit 'pause' if the room was currently playing!
            else if (event.data === YT.PlayerState.PAUSED && currentRoomState && currentRoomState.isPlaying) {
              lastEmittedActionTimeRef.current = now;
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
  }, [videoId]);

  // 2. Incoming Socket State Updates (Zero-Delay Execution)
  useEffect(() => {
    if (!watchTogetherState || !playerRef.current) return;
    const p = playerRef.current;
    if (typeof p.getPlayerState !== 'function') return;

    // If local user initiated this action, skip remote seek to prevent stutter
    if (
      watchTogetherState.lastAction?.by && 
      watchTogetherState.lastAction.by === currentUser?.username &&
      Date.now() - (watchTogetherState.lastAction?.timestamp || 0) < 1500
    ) {
      return;
    }

    const actionType = watchTogetherState.lastAction?.type;
    const elapsed = watchTogetherState.isPlaying && watchTogetherState.updatedAt 
      ? (Date.now() - watchTogetherState.updatedAt) / 1000 
      : 0;
    const targetTime = Math.max(0, (watchTogetherState.currentTime || 0) + elapsed);

    isRemoteSyncRef.current = true;

    if (actionType === 'pause' || !watchTogetherState.isPlaying) {
      p.pauseVideo();
      p.seekTo(watchTogetherState.currentTime, true);
    } else if (actionType === 'play') {
      p.seekTo(targetTime, true);
      p.playVideo();
      setAutoplayBlocked(false);
    } else if (actionType === 'seek') {
      p.seekTo(targetTime, true);
      if (watchTogetherState.isPlaying) {
        p.playVideo();
      } else {
        p.pauseVideo();
      }
    } else {
      // General state sync: snap if drift > 0.3s
      const localTime = p.getCurrentTime() || 0;
      if (Math.abs(localTime - targetTime) > 0.3) {
        p.seekTo(targetTime, true);
      }
      const st = p.getPlayerState();
      if (watchTogetherState.isPlaying && st !== window.YT.PlayerState.PLAYING) {
        p.playVideo();
      } else if (!watchTogetherState.isPlaying && st !== window.YT.PlayerState.PAUSED) {
        p.pauseVideo();
      }
    }

    setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 120);
  }, [
    watchTogetherState?.isPlaying, 
    watchTogetherState?.currentTime, 
    watchTogetherState?.updatedAt,
    watchTogetherState?.lastAction?.timestamp,
    currentUser?.username
  ]);

  // 3. Continuous Sub-Second Precision Monitor (Keep all computers 100% in sync)
  useEffect(() => {
    if (!watchTogetherState?.isPlaying) return;

    const syncInterval = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function' || isRemoteSyncRef.current || isInitialSyncRef.current || isDraggingSlider) return;

      try {
        const elapsed = (Date.now() - watchTogetherState.updatedAt) / 1000;
        const targetTime = (watchTogetherState.currentTime || 0) + elapsed;
        const localTime = p.getCurrentTime() || 0;
        const drift = Math.abs(localTime - targetTime);

        // Sub-second precision threshold (350ms)
        if (drift > 0.35) {
          isRemoteSyncRef.current = true;
          p.seekTo(targetTime, true);
          setTimeout(() => { isRemoteSyncRef.current = false; }, 100);
        }
      } catch (err) {}
    }, 1500);

    return () => clearInterval(syncInterval);
  }, [watchTogetherState?.isPlaying, watchTogetherState?.currentTime, watchTogetherState?.updatedAt, isDraggingSlider]);

  // 4. Progress bar polling (100ms for smooth 60fps tracking)
  useEffect(() => {
    const interval = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function' && !isDraggingSlider) {
        try {
          const t = p.getCurrentTime();
          const d = p.getDuration();
          if (typeof t === 'number') setCurrentTime(t);
          if (typeof d === 'number' && d > 0) setDuration(d);
        } catch (e) {}
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isDraggingSlider]);

  // 5. Toast notification on action
  useEffect(() => {
    if (watchTogetherState?.lastAction) {
      const act = watchTogetherState.lastAction;
      let text = '';
      if (act.type === 'play') text = `${act.by} videoyu başlattı ▶`;
      else if (act.type === 'pause') text = `${act.by} videoyu durdurdu ⏸ (${formatTime(act.time)})`;
      else if (act.type === 'seek') text = `${act.by} videoyu ${formatTime(act.time)} konumuna sardı ⏩`;

      setSyncToast(text);
      const timer = setTimeout(() => setSyncToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [watchTogetherState?.lastAction?.timestamp]);

  // Actions
  const handleTogglePlay = useCallback(() => {
    const curr = watchTogetherStateRef.current;
    if (!curr) return;
    const nextState = !curr.isPlaying;
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === 'function') {
      const t = p.getCurrentTime() || 0;
      isRemoteSyncRef.current = true;
      if (nextState) {
        p.playVideo();
        setAutoplayBlocked(false);
        onAction && onAction('play', t);
      } else {
        p.pauseVideo();
        onAction && onAction('pause', t);
      }
      setTimeout(() => { isRemoteSyncRef.current = false; }, 120);
    }
  }, [onAction]);

  const handleSkip = useCallback((secondsDelta) => {
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === 'function') {
      const current = p.getCurrentTime() || 0;
      let newTime = Math.max(0, current + secondsDelta);
      if (duration > 0) newTime = Math.min(duration, newTime);

      isRemoteSyncRef.current = true;
      p.seekTo(newTime, true);
      setCurrentTime(newTime);
      onAction && onAction('seek', newTime);
      setTimeout(() => { isRemoteSyncRef.current = false; }, 120);
    }
  }, [duration, onAction]);

  const handleForceSync = useCallback(() => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') {
      const curr = watchTogetherStateRef.current;
      const elapsed = curr?.isPlaying && curr?.updatedAt 
        ? (Date.now() - curr.updatedAt) / 1000 
        : 0;
      const targetTime = Math.max(0, (curr?.currentTime || 0) + elapsed);

      isRemoteSyncRef.current = true;
      p.seekTo(targetTime, true);
      if (curr?.isPlaying) {
        p.playVideo();
        setAutoplayBlocked(false);
      } else {
        p.pauseVideo();
      }
      setTimeout(() => { isRemoteSyncRef.current = false; }, 100);
      setJustSyncedToast(true);
      setTimeout(() => setJustSyncedToast(false), 2000);
    }
  }, []);

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setSliderTime(val);
    setCurrentTime(val);
  };

  const handleSliderCommit = (e) => {
    const val = parseFloat(e.target.value);
    setIsDraggingSlider(false);
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') {
      isRemoteSyncRef.current = true;
      p.seekTo(val, true);
      setCurrentTime(val);
      onAction && onAction('seek', val);
      setTimeout(() => { isRemoteSyncRef.current = false; }, 120);
    }
  };

  // Keyboard Spacebar Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#3f4147] shadow-2xl flex flex-col group select-none">
      {/* Top Bar */}
      <div className="bg-[#111214]/90 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex items-center gap-1.5 text-xs font-black bg-[#ea3323] text-white px-2.5 py-0.5 rounded-full shadow-xs animate-pulse shrink-0">
            <Film className="w-3.5 h-3.5 fill-current" />
            BİRLİKTE İZLE
          </span>
          <span className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
            {watchTogetherState.videoTitle || 'YouTube Sineması'}
          </span>
          <span className="text-xs text-[#949ba4] hidden md:inline shrink-0">
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
            🎬 Video Değiştir
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
        <div ref={containerRef} className="w-full h-full" />

        {/* Autoplay blocked overlay (Browser gesture required) */}
        {autoplayBlocked && (
          <div 
            onClick={handleForceSync}
            className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 cursor-pointer z-30 animate-in fade-in duration-200"
          >
            <div className="w-16 h-16 rounded-full bg-[#ea3323] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-current translate-x-0.5" />
            </div>
            <div className="text-center">
              <div className="text-white font-black text-base">Odaya Senkronize Ol & Başlat</div>
              <div className="text-[#949ba4] text-xs mt-1">Tarayıcı ses izni için tıklayın (0 delay ile anında eşleşir)</div>
            </div>
          </div>
        )}

        {/* Action toast banner */}
        {syncToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-[#5865f2] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 z-30">
            <Sparkles className="w-3.5 h-3.5 text-[#5865f2] animate-spin" />
            <span>{syncToast}</span>
          </div>
        )}

        {/* Force sync success toast */}
        {justSyncedToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#23a55a]/90 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in duration-150 z-30">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Oda ile 0 gecikmeyle eşitlendi!</span>
          </div>
        )}
      </div>

      {/* SHARED CONTROLS BAR (ZERO-DELAY BROADCASTS) */}
      <div className="bg-[#111214]/95 backdrop-blur-md px-4 py-2.5 border-t border-white/10 shrink-0 flex flex-col gap-2 z-20">
        
        {/* Scrubber Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#949ba4] min-w-12 text-right select-none">
            {formatTime(isDraggingSlider ? sliderTime : currentTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={isDraggingSlider ? sliderTime : currentTime}
              onMouseDown={() => { setIsDraggingSlider(true); setSliderTime(currentTime); }}
              onTouchStart={() => { setIsDraggingSlider(true); setSliderTime(currentTime); }}
              onChange={handleSliderChange}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              className="w-full h-1.5 bg-[#383a40] hover:bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#ea3323] transition-all"
              title="Videoyu Sar (Tüm odadaki bilgisayarlar aynı anda sarılır)"
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
              <span>0 Delay Canlı Senkron</span>
            </div>

            <button
              onClick={handleForceSync}
              className="px-3 py-1 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-[#949ba4] hover:text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Herhangi bir kayma varsa anında odaya eşitle"
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
