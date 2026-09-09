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
      this.latestFrames.set(senderSocketId, frame);
      this.frameListeners.forEach(cb => {
        try { cb(senderSocketId, frame); } catch (e) {}
      });
    });

    socket.on('screen-relay-stopped', ({ senderSocketId }) => {
      this.latestFrames.delete(senderSocketId);
      this.stopListeners.forEach(cb => {
        try { cb(senderSocketId); } catch (e) {}
      });
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

  startBroadcasting(channelId, displayStream) {
    if (!displayStream || !channelId) return;
    this.stopBroadcasting(channelId);

    try {
      console.log('[ScreenRelay] Starting guaranteed WebSocket frame broadcaster for channel:', channelId);
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = displayStream;
      video.play().catch(() => {});

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      // Target ~15 FPS (every 66ms) with efficient JPEG compression
      let isCapturing = false;
      const interval = setInterval(() => {
        if (isCapturing || !video || video.readyState < 2 || video.videoWidth === 0) return;
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
          }, 'image/jpeg', 0.62);
        } catch (e) {
          isCapturing = false;
        }
      }, 70);

      this.activeBroadcast = { channelId, stream: displayStream, video, canvas, interval };

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
        this.activeBroadcast.video.srcObject = null;
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
