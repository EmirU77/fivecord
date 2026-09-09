import React, { useEffect, useRef } from 'react';

// Singleton YouTube Iframe API Loader with Promise caching
let ytApiPromise = null;

export function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    let tag = document.getElementById('yt-iframe-api-script');
    if (!tag) {
      tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') previousOnReady();
      resolve(window.YT);
    };

    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve(window.YT);
      }
    }, 100);
  });

  return ytApiPromise;
}

export default function BackgroundMusicPlayer({
  musicState,
  userVolume = 80,
  onTrackEnd,
  onSyncedStart
}) {
  const containerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const isPlayerReadyRef = useRef(false);
  const audioRef = useRef(null);
  const isSeekingRef = useRef(false);
  const musicStateRef = useRef(musicState);
  const currentVideoIdRef = useRef(null);
  const userVolumeRef = useRef(userVolume);
  const onTrackEndRef = useRef(onTrackEnd);
  const onSyncedStartRef = useRef(onSyncedStart);

  useEffect(() => {
    onTrackEndRef.current = onTrackEnd;
  }, [onTrackEnd]);

  useEffect(() => {
    onSyncedStartRef.current = onSyncedStart;
  }, [onSyncedStart]);

  useEffect(() => {
    musicStateRef.current = musicState;
  }, [musicState]);

  // Apply personal volume immediately whenever user changes it
  useEffect(() => {
    userVolumeRef.current = userVolume;
    if (ytPlayerRef.current && isPlayerReadyRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(userVolume);
        if (userVolume > 0 && typeof ytPlayerRef.current.unMute === 'function') {
          ytPlayerRef.current.unMute();
        } else if (userVolume === 0 && typeof ytPlayerRef.current.mute === 'function') {
          ytPlayerRef.current.mute();
        }
      } catch (e) {}
    }
    if (audioRef.current) {
      audioRef.current.volume = Math.min(Math.max(userVolume / 100, 0), 1);
    }
  }, [userVolume]);

  const currentTrack = musicState?.currentTrack;
  const isYouTube = currentTrack?.source === 'youtube';
  const videoId = isYouTube ? currentTrack.id : null;

  // Global browser interaction autoplay unlocker
  useEffect(() => {
    const unlockAutoplay = () => {
      const curr = musicStateRef.current;
      if (!curr?.isPlaying) return;

      if (curr.currentTrack?.source === 'youtube' && ytPlayerRef.current && isPlayerReadyRef.current) {
        try {
          const st = ytPlayerRef.current.getPlayerState();
          if (st !== 1 && st !== 3 && st !== 0) {
            ytPlayerRef.current.playVideo();
          }
          if (userVolumeRef.current > 0 && typeof ytPlayerRef.current.unMute === 'function') {
            ytPlayerRef.current.unMute();
          }
        } catch (e) {}
      }

      if (curr.currentTrack?.source !== 'youtube' && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('click', unlockAutoplay, { passive: true });
    window.addEventListener('pointerdown', unlockAutoplay, { passive: true });
    window.addEventListener('keydown', unlockAutoplay, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAutoplay);
      window.removeEventListener('pointerdown', unlockAutoplay);
      window.removeEventListener('keydown', unlockAutoplay);
    };
  }, []);

  // 1. YouTube Player Instance Initialization (Keep warm in background)
  useEffect(() => {
    let isSubscribed = true;

    loadYouTubeApi().then((YT) => {
      if (!isSubscribed) return;
      if (ytPlayerRef.current) return;
      if (!containerRef.current) return;

      containerRef.current.innerHTML = '<div id="fivecord-bg-yt-player"></div>';

      ytPlayerRef.current = new YT.Player('fivecord-bg-yt-player', {
        width: '240',
        height: '240',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e) => {
            if (!isSubscribed) return;
            isPlayerReadyRef.current = true;
            const p = e.target;
            try {
              p.setVolume(userVolumeRef.current);
              if (userVolumeRef.current > 0) p.unMute();
            } catch (err) {}

            const curr = musicStateRef.current;
            if (curr?.currentTrack?.source === 'youtube' && curr.currentTrack.id) {
              const isLateJoin = (curr.currentTime || 0) > 15 || (curr.startedAt && (Date.now() - curr.startedAt) > 20000);
              const elapsed = (!curr.isBuffering && curr.isPlaying && curr.startedAt) ? (Date.now() - curr.startedAt) / 1000 : 0;
              const startSeconds = isLateJoin ? Math.max(0, (curr.currentTime || 0) + elapsed) : 0;

              currentVideoIdRef.current = curr.currentTrack.id;
              p.loadVideoById({
                videoId: curr.currentTrack.id,
                startSeconds: Math.floor(startSeconds)
              });

              if (!curr.isPlaying) {
                p.pauseVideo();
              }
            }
          },
          onStateChange: (e) => {
            if (e.data === 1) { // 1 === YT.PlayerState.PLAYING
              if (userVolumeRef.current > 0) {
                try { e.target.unMute(); } catch (err) {}
              }
              // Notify server and room that real audio has begun playing at 0:00
              const curr = musicStateRef.current;
              if (curr?.isBuffering && onSyncedStartRef.current && currentVideoIdRef.current) {
                onSyncedStartRef.current(currentVideoIdRef.current, e.target.getCurrentTime() || 0);
              }
            }
            if (e.data === 0) { // 0 === YT.PlayerState.ENDED
              console.log('[BackgroundMusicPlayer] YouTube video ended');
              if (onTrackEndRef.current && currentVideoIdRef.current) {
                onTrackEndRef.current(currentVideoIdRef.current);
              }
            }
          }
        }
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // 2. Play / Pause / Track Change Reactions
  useEffect(() => {
    const curr = musicState;

    if (!curr || !curr.currentTrack || !curr.isPlaying) {
      if (ytPlayerRef.current && isPlayerReadyRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (!curr?.currentTrack) {
        currentVideoIdRef.current = null;
      }
      return;
    }

    // Zero-delay initial start: If track just started, always start at 0:00!
    const isLateJoin = (curr.currentTime || 0) > 15 || (curr.startedAt && (Date.now() - curr.startedAt) > 20000);
    const elapsed = (!curr.isBuffering && curr.isPlaying && curr.startedAt) ? (Date.now() - curr.startedAt) / 1000 : 0;
    const targetTime = isLateJoin ? Math.max(0, (curr.currentTime || 0) + elapsed) : 0;

    // --- YOUTUBE SOURCE ---
    if (isYouTube && videoId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        const p = ytPlayerRef.current;

        if (currentVideoIdRef.current !== videoId) {
          // New YouTube track: Load immediately starting from 0:00!
          currentVideoIdRef.current = videoId;
          isSeekingRef.current = true;
          p.loadVideoById({
            videoId,
            startSeconds: Math.floor(targetTime)
          });
          try {
            p.setVolume(userVolumeRef.current);
            if (userVolumeRef.current > 0) p.unMute();
          } catch (e) {}

          if (!curr.isPlaying) {
            p.pauseVideo();
          }
          // Prevent any seek during track intro (1.5s)
          setTimeout(() => { isSeekingRef.current = false; }, 1500);
        } else {
          try {
            const st = p.getPlayerState();
            if (curr.isPlaying) {
              if (st !== 1 && st !== 3 && st !== 0) {
                p.playVideo();
              }
            } else {
              if (st === 1 || st === 3) {
                p.pauseVideo();
              }
            }

            // Only seek if difference is large (> 3.5s) and not in song intro
            const localTime = p.getCurrentTime() || 0;
            if (localTime > 15 && targetTime > 15 && Math.abs(localTime - targetTime) > 3.5 && (st === 1 || st === 2)) {
              isSeekingRef.current = true;
              p.seekTo(targetTime, true);
              setTimeout(() => { isSeekingRef.current = false; }, 800);
            }
          } catch (e) {}
        }
      }
    }

    // --- DIRECT AUDIO / RADIO SOURCE ---
    if (!isYouTube && curr.currentTrack?.url) {
      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      }
      currentVideoIdRef.current = null;

      const audio = audioRef.current;
      if (audio) {
        if (audio.src !== curr.currentTrack.url) {
          audio.src = curr.currentTrack.url;
        }
        if (curr.currentTrack.source !== 'station') {
          if (isLateJoin && Math.abs(audio.currentTime - targetTime) > 3.0) {
            audio.currentTime = targetTime;
          }
        }
        audio.volume = Math.min(Math.max(userVolumeRef.current / 100, 0), 1);
        if (curr.isPlaying) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }
    }
  }, [
    musicState?.currentTrack?.id, 
    musicState?.currentTrack?.url, 
    musicState?.isPlaying, 
    musicState?.updatedAt, 
    musicState?.startedAt,
    musicState?.isBuffering,
    isYouTube, 
    videoId
  ]);

  // 3. Smooth Drift Monitoring (Protected Intro: NEVER seek during first 20 seconds!)
  useEffect(() => {
    if (!musicState?.isPlaying) return;

    const driftInterval = setInterval(() => {
      if (isSeekingRef.current) return;
      const curr = musicStateRef.current;
      if (!curr || !curr.isPlaying) return;

      // If song is still in buffering phase, do not drift check
      if (curr.isBuffering || !curr.startedAt) return;

      const elapsed = (Date.now() - (curr.updatedAt || curr.startedAt)) / 1000;
      const targetTime = (curr.currentTime || 0) + elapsed;

      // Check YouTube drift
      if (curr.currentTrack?.source === 'youtube' && ytPlayerRef.current && isPlayerReadyRef.current) {
        try {
          const st = ytPlayerRef.current.getPlayerState();
          const localTime = ytPlayerRef.current.getCurrentTime() || 0;
          const maxDur = curr.currentTrack.durationSec || 0;

          // Track finished (State 0 or reached end of duration)
          if (st === 0 || (maxDur > 0 && localTime >= maxDur - 0.6)) {
            if (onTrackEndRef.current && currentVideoIdRef.current) {
              onTrackEndRef.current(currentVideoIdRef.current);
            }
            return;
          }

          // CRITICAL: NEVER seek during the first 20 seconds of a song!
          // Both users started at 0:00; seeking here resets the buffer and causes 4s skip!
          if (localTime < 20 && targetTime < 25) {
            return;
          }

          if (st === 1) { // Only when actively playing
            const drift = Math.abs(localTime - targetTime);
            // Relaxed drift threshold (3.5s) to avoid buffer flushes
            if (drift > 3.5) {
              isSeekingRef.current = true;
              ytPlayerRef.current.seekTo(targetTime, true);
              setTimeout(() => { isSeekingRef.current = false; }, 800);
            }
          } else if (st === 2 || st === 5 || st === -1) {
            ytPlayerRef.current.playVideo();
          }
        } catch (e) {}
      }

      // Check HTML5 Audio drift
      if (curr.currentTrack?.source !== 'youtube' && curr.currentTrack?.source !== 'station' && audioRef.current) {
        try {
          if (audioRef.current.ended || (audioRef.current.duration > 0 && audioRef.current.currentTime >= audioRef.current.duration - 0.6)) {
            if (onTrackEndRef.current && curr.currentTrack?.id) {
              onTrackEndRef.current(curr.currentTrack.id);
            }
            return;
          }

          const localTime = audioRef.current.currentTime || 0;
          if (localTime < 20 && targetTime < 25) return;

          const drift = Math.abs(localTime - targetTime);
          if (drift > 3.5) {
            audioRef.current.currentTime = targetTime;
          }
          if (audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        } catch (e) {}
      }
    }, 1500);

    return () => clearInterval(driftInterval);
  }, [musicState?.isPlaying, musicState?.isBuffering]);

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        right: 0, 
        width: 240, 
        height: 240, 
        opacity: 0.002, 
        pointerEvents: 'none', 
        zIndex: -9999 
      }}
    >
      <div ref={containerRef} />
      <audio 
        ref={audioRef} 
        playsInline 
        onEnded={() => {
          if (onTrackEndRef.current && currentTrack?.id) {
            onTrackEndRef.current(currentTrack.id);
          }
        }}
      />
    </div>
  );
}
