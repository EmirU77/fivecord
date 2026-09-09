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

    // Polling fallback in case onYouTubeIframeAPIReady fired earlier
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
  userVolume = 80
}) {
  const containerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const isPlayerReadyRef = useRef(false);
  const audioRef = useRef(null);
  const isSeekingRef = useRef(false);
  const musicStateRef = useRef(musicState);
  const currentVideoIdRef = useRef(null);
  const userVolumeRef = useRef(userVolume);

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
          if (st !== 1 && st !== 3) {
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

  // 1. YouTube Player Instance Initialization (Keep warm in background, do not destroy)
  useEffect(() => {
    let isSubscribed = true;

    loadYouTubeApi().then((YT) => {
      if (!isSubscribed) return;
      if (ytPlayerRef.current) return; // Player already created
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

            // If a track was queued before onReady fired:
            const curr = musicStateRef.current;
            if (curr?.currentTrack?.source === 'youtube' && curr.currentTrack.id) {
              const elapsed = curr.isPlaying && curr.updatedAt
                ? (Date.now() - curr.updatedAt) / 1000
                : 0;
              // If song just started (within 5 seconds), start from 0:00 (zero delay!)
              const startSeconds = (curr.currentTime < 5 && elapsed < 6)
                ? 0
                : Math.max(0, (curr.currentTime || 0) + elapsed);

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
            if (e.data === 1 && userVolumeRef.current > 0) {
              try { e.target.unMute(); } catch (err) {}
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

    if (!curr || !curr.currentTrack) {
      if (ytPlayerRef.current && isPlayerReadyRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      currentVideoIdRef.current = null;
      return;
    }

    const elapsed = curr.isPlaying && curr.updatedAt
      ? (Date.now() - curr.updatedAt) / 1000
      : 0;

    // Zero-delay: If track was just started, start directly at 0 without skipping initial seconds
    const isNewTrackStart = (curr.currentTime || 0) < 5 && elapsed < 6;
    const targetTime = isNewTrackStart ? 0 : Math.max(0, (curr.currentTime || 0) + elapsed);

    // --- YOUTUBE SOURCE ---
    if (isYouTube && videoId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        const p = ytPlayerRef.current;

        if (currentVideoIdRef.current !== videoId) {
          // New YouTube track requested
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
          setTimeout(() => { isSeekingRef.current = false; }, 1200);
        } else {
          // Same track: sync play/pause or explicit seek
          try {
            const st = p.getPlayerState();
            if (curr.isPlaying) {
              if (st !== 1 && st !== 3) {
                p.playVideo();
              }
            } else {
              if (st === 1 || st === 3) {
                p.pauseVideo();
              }
            }

            // Only seek if drift/jump is large (> 2.5s) to avoid buffer-killing micro jumps
            const localTime = p.getCurrentTime() || 0;
            if (Math.abs(localTime - targetTime) > 2.5 && (st === 1 || st === 2)) {
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
          if (Math.abs(audio.currentTime - targetTime) > 2.0) {
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
    musicState?.currentTime, 
    isYouTube, 
    videoId
  ]);

  // 3. Smooth Drift Monitoring (Keeps users synchronized without resetting buffers)
  useEffect(() => {
    if (!musicState?.isPlaying) return;

    const driftInterval = setInterval(() => {
      if (isSeekingRef.current) return;
      const curr = musicStateRef.current;
      if (!curr || !curr.isPlaying) return;

      const elapsed = (Date.now() - (curr.updatedAt || curr.startedAt || Date.now())) / 1000;
      const targetTime = (curr.currentTime || 0) + elapsed;

      // Check YouTube drift
      if (curr.currentTrack?.source === 'youtube' && ytPlayerRef.current && isPlayerReadyRef.current) {
        try {
          const st = ytPlayerRef.current.getPlayerState();
          // CRITICAL: NEVER seek while YouTube is buffering (3) or unstarted (-1)!
          if (st === 1) { // Only when actively playing
            const localTime = ytPlayerRef.current.getCurrentTime() || 0;
            const drift = Math.abs(localTime - targetTime);

            // Synchronize if drift exceeds 1.8 seconds
            if (drift > 1.8) {
              isSeekingRef.current = true;
              ytPlayerRef.current.seekTo(targetTime, true);
              setTimeout(() => { isSeekingRef.current = false; }, 800);
            }
          } else if (st === 2 || st === 5 || st === -1) {
            // Player is paused or cued when it should be playing -> resume
            ytPlayerRef.current.playVideo();
          }
        } catch (e) {}
      }

      // Check HTML5 Audio drift
      if (curr.currentTrack?.source !== 'youtube' && curr.currentTrack?.source !== 'station' && audioRef.current) {
        try {
          const localTime = audioRef.current.currentTime || 0;
          const drift = Math.abs(localTime - targetTime);
          if (drift > 2.0) {
            audioRef.current.currentTime = targetTime;
          }
          if (audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        } catch (e) {}
      }
    }, 1500);

    return () => clearInterval(driftInterval);
  }, [musicState?.isPlaying]);

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
      <audio ref={audioRef} playsInline />
    </div>
  );
}
