import React, { useEffect, useRef } from 'react';

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

export default function BackgroundMusicPlayer({
  musicState,
  userVolume = 80
}) {
  const containerRef = useRef(null);
  const ytPlayerRef = useRef(null);
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
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(userVolume);
      } catch (e) {}
    }
    if (audioRef.current) {
      audioRef.current.volume = Math.min(Math.max(userVolume / 100, 0), 1);
    }
  }, [userVolume]);

  const currentTrack = musicState?.currentTrack;
  const isYouTube = currentTrack?.source === 'youtube';
  const videoId = isYouTube ? currentTrack.id : null;

  // 1. YouTube Player Instance Management
  useEffect(() => {
    if (!videoId) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
        ytPlayerRef.current = null;
      }
      currentVideoIdRef.current = null;
      return;
    }

    let isSubscribed = true;

    loadYouTubeApi().then((YT) => {
      if (!isSubscribed) return;

      const curr = musicStateRef.current;
      const elapsed = curr?.isPlaying && curr?.updatedAt
        ? (Date.now() - curr.updatedAt) / 1000
        : 0;
      const initialTargetTime = Math.max(0, (curr?.currentTime || 0) + elapsed);

      // If player already exists and we just change the video ID:
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        if (currentVideoIdRef.current !== videoId) {
          currentVideoIdRef.current = videoId;
          isSeekingRef.current = true;
          ytPlayerRef.current.loadVideoById({
            videoId,
            startSeconds: initialTargetTime
          });
          try { ytPlayerRef.current.setVolume(userVolumeRef.current); } catch (e) {}
          if (!curr?.isPlaying) {
            ytPlayerRef.current.pauseVideo();
          }
          setTimeout(() => { isSeekingRef.current = false; }, 1200);
        }
        return;
      }

      currentVideoIdRef.current = videoId;
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '<div id="fivecord-bg-yt-player"></div>';

      ytPlayerRef.current = new YT.Player('fivecord-bg-yt-player', {
        videoId,
        width: '200',
        height: '200',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          start: Math.floor(initialTargetTime),
          origin: window.location.origin
        },
        events: {
          onReady: (e) => {
            if (!isSubscribed) return;
            const p = e.target;
            try { p.setVolume(userVolumeRef.current); } catch (err) {}

            // Re-calculate target time accurately upon player ready
            const latest = musicStateRef.current;
            const el = latest?.isPlaying && latest?.updatedAt
              ? (Date.now() - latest.updatedAt) / 1000
              : 0;
            const targetTime = Math.max(0, (latest?.currentTime || 0) + el);

            isSeekingRef.current = true;
            p.seekTo(targetTime, true);
            if (latest?.isPlaying) {
              p.playVideo();
            } else {
              p.pauseVideo();
            }
            setTimeout(() => { isSeekingRef.current = false; }, 1200);
          }
        }
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [videoId]);

  // 2. Play / Pause / Seek Remote State Reactions
  useEffect(() => {
    if (!musicState) return;

    const curr = musicState;
    const elapsed = curr.isPlaying && curr.updatedAt
      ? (Date.now() - curr.updatedAt) / 1000
      : 0;
    const targetTime = Math.max(0, (curr.currentTime || 0) + elapsed);

    // YouTube playback control
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
      const p = ytPlayerRef.current;
      isSeekingRef.current = true;
      p.seekTo(targetTime, true);
      if (curr.isPlaying) {
        p.playVideo();
      } else {
        p.pauseVideo();
      }
      setTimeout(() => { isSeekingRef.current = false; }, 600);
    }

    // Direct HTML5 Audio playback control (Radio / MP3)
    if (!isYouTube && audioRef.current && curr.currentTrack?.url) {
      const audio = audioRef.current;
      if (audio.src !== curr.currentTrack.url) {
        audio.src = curr.currentTrack.url;
      }
      if (curr.currentTrack.source !== 'station') {
        if (Math.abs(audio.currentTime - targetTime) > 0.4) {
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
  }, [musicState?.isPlaying, musicState?.updatedAt, musicState?.currentTime, isYouTube]);

  // 3. Continuous Sub-Second Precision Monitor (Keeps all listeners within 0.4s of each other)
  useEffect(() => {
    if (!musicState?.isPlaying) return;

    const driftInterval = setInterval(() => {
      if (isSeekingRef.current) return;
      const curr = musicStateRef.current;
      if (!curr || !curr.isPlaying) return;

      const elapsed = (Date.now() - (curr.updatedAt || curr.startedAt || Date.now())) / 1000;
      const targetTime = (curr.currentTime || 0) + elapsed;

      // Check YouTube drift
      if (curr.currentTrack?.source === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const localTime = ytPlayerRef.current.getCurrentTime() || 0;
          const drift = Math.abs(localTime - targetTime);

          // Sub-second precision threshold (0.4s)
          if (drift > 0.4) {
            isSeekingRef.current = true;
            ytPlayerRef.current.seekTo(targetTime, true);
            setTimeout(() => { isSeekingRef.current = false; }, 300);
          }
          const st = ytPlayerRef.current.getPlayerState();
          if (st !== 1 && st !== 3) { // Not PLAYING (1) or BUFFERING (3)
            ytPlayerRef.current.playVideo();
          }
        } catch (e) {}
      }

      // Check HTML5 Audio drift
      if (curr.currentTrack?.source !== 'youtube' && curr.currentTrack?.source !== 'station' && audioRef.current) {
        try {
          const localTime = audioRef.current.currentTime || 0;
          const drift = Math.abs(localTime - targetTime);
          if (drift > 0.4) {
            audioRef.current.currentTime = targetTime;
          }
          if (audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        } catch (e) {}
      }
    }, 1200);

    return () => clearInterval(driftInterval);
  }, [musicState?.isPlaying]);

  return (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}>
      <div ref={containerRef} />
      <audio ref={audioRef} playsInline />
    </div>
  );
}
