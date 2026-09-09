import { socket } from './socket';

class ScreenRelayManager {
  constructor() {
    this.activeBroadcast = null; // { channelId, stream, video, canvas, interval }
    this.frameListeners = new Set(); // callback(senderSocketId, frameBlob)
    this.stopListeners = new Set(); // callback(senderSocketId)
    this.latestFrames = new Map(); // socketId -> frameBlob

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    socket.on('screen-relay-frame', ({ senderSocketId, frame }) => {
      // Normalize to Blob if frame is ArrayBuffer or Buffer
      let blob = frame;
      if (frame instanceof ArrayBuffer || ArrayBuffer.isView(frame)) {
        blob = new Blob([frame], { type: 'image/jpeg' });
      }
      this.latestFrames.set(senderSocketId, blob);
      this.frameListeners.forEach(cb => {
        try { cb(senderSocketId, blob); } catch (e) {}
      });
    });

    socket.on('screen-relay-stopped', ({ senderSocketId }) => {
      this.latestFrames.delete(senderSocketId);
      this.stopListeners.forEach(cb => {
        try { cb(senderSocketId); } catch (e) {}
      });
    });

    socket.on('request-screen-frame', () => {
      this.captureAndSendNow();
    });

    socket.on('user-left-voice', ({ socketId }) => {
      this.latestFrames.delete(socketId);
      this.stopListeners.forEach(cb => {
        try { cb(socketId); } catch (e) {}
      });
    });
  }

  onFrame(cb) {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  onStopped(cb) {
    this.stopListeners.add(cb);
    return () => this.stopListeners.delete(cb);
  }

  getLatestFrame(socketId) {
    return this.latestFrames.get(socketId);
  }

  captureAndSendNow() {
    if (!this.activeBroadcast) return;
    const { channelId, video, canvas, ctx } = this.activeBroadcast;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    try {
      const maxW = 1280;
      const maxH = 720;
      let w = video.videoWidth;
      let h = video.videoHeight;
      const ratio = Math.min(maxW / w, maxH / h, 1.0);
      const targetW = Math.floor(w * ratio);
      const targetH = Math.floor(h * ratio);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.drawImage(video, 0, 0, targetW, targetH);
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          socket.emit('screen-relay-frame', { channelId, frame: blob });
        }
      }, 'image/jpeg', 0.65);
    } catch (e) {}
  }

  startBroadcasting(channelId, displayStream) {
    if (!displayStream || !channelId) return;
    this.stopBroadcasting(channelId);

    try {
      console.log('[ScreenRelay] Starting guaranteed screen broadcaster for channel:', channelId);
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      // In Chromium, video elements with 0x0 or top:-9999px suspend hardware decode.
      // Keeping in viewport with 640x360 at opacity 0.001 behind everything guarantees full-speed decoding.
      video.style.cssText = 'position:fixed;top:0;left:0;width:640px;height:360px;opacity:0.001;pointer-events:none;z-index:-9999;';
      document.body.appendChild(video);

      video.srcObject = displayStream;
      video.play().catch(e => console.warn('[ScreenRelay] Video play err:', e));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      // Immediate first frame upon metadata / playback
      video.addEventListener('loadedmetadata', () => {
        setTimeout(() => this.captureAndSendNow(), 50);
      }, { once: true });
      video.addEventListener('playing', () => {
        setTimeout(() => this.captureAndSendNow(), 50);
      }, { once: true });

      // Target ~15 FPS (every 66ms) with efficient JPEG compression
      let isCapturing = false;
      const interval = setInterval(() => {
        if (isCapturing || !video || video.readyState < 2 || video.videoWidth === 0) {
          if (video && video.paused) {
            video.play().catch(() => {});
          }
          return;
        }
        isCapturing = true;

        try {
          const maxW = 1280;
          const maxH = 720;
          let w = video.videoWidth || 1280;
          let h = video.videoHeight || 720;
          const ratio = Math.min(maxW / w, maxH / h, 1.0);
          const targetW = Math.floor(w * ratio);
          const targetH = Math.floor(h * ratio);

          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          ctx.drawImage(video, 0, 0, targetW, targetH);
          canvas.toBlob((blob) => {
            isCapturing = false;
            if (blob && blob.size > 0) {
              socket.emit('screen-relay-frame', { channelId, frame: blob });
            }
          }, 'image/jpeg', 0.65);
        } catch (e) {
          isCapturing = false;
        }
      }, 66);

      this.activeBroadcast = { channelId, stream: displayStream, video, canvas, ctx, interval };

      const vTrack = displayStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.addEventListener('ended', () => {
          this.stopBroadcasting(channelId);
        }, { once: true });
      }
    } catch (err) {
      console.warn('[ScreenRelay] Error initializing screen broadcast:', err);
    }
  }

  stopBroadcasting(channelId) {
    if (this.activeBroadcast) {
      console.log('[ScreenRelay] Stopping screen broadcast for channel:', channelId);
      clearInterval(this.activeBroadcast.interval);
      if (this.activeBroadcast.video) {
        try {
          this.activeBroadcast.video.pause();
          this.activeBroadcast.video.srcObject = null;
          if (this.activeBroadcast.video.parentNode) {
            this.activeBroadcast.video.parentNode.removeChild(this.activeBroadcast.video);
          }
        } catch (e) {}
      }
      this.activeBroadcast = null;
    }
    socket.emit('screen-relay-stopped', { channelId });
  }

  stopAll() {
    if (this.activeBroadcast) {
      this.stopBroadcasting(this.activeBroadcast.channelId);
    }
  }
}

export const screenRelay = new ScreenRelayManager();
