import { socket } from './socket';

class VoiceRelayManager {
  constructor() {
    this.currentChannelId = null;
    this.captureContext = null;
    this.micSource = null;
    this.processor = null;
    this.muteNode = null;
    this.playbackContext = null;
    this.peerPlayTimes = new Map();
    this.isMuted = false;
    this.isDeafened = false;
    this.userVolumes = new Map();
    this.isBroadcasting = false;
    this.sampleRate = 48000;
    this.onPeerSpeaking = null;

    this.setupSocketListeners();
    this.setupGestureUnlock();
  }

  setupGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.resumeContexts();
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  suppressPeer(socketId, shouldSuppress) {
    // No-op: Never suppress voice audio to prevent total silence across CGNAT/firewalls
  }

  setupSocketListeners() {
    socket.on('voice-pcm-chunk', ({ senderSocketId, sampleRate, buffer }) => {
      if (this.isDeafened || !buffer) return;
      this.playChunk(senderSocketId, sampleRate, buffer);
    });

    socket.on('user-left-voice', ({ socketId }) => {
      this.peerPlayTimes.delete(socketId);
      this.userVolumes.delete(socketId);
    });
  }

  setUserVolume(socketId, volume) {
    this.userVolumes.set(socketId, volume);
  }

  getUserVolume(socketId) {
    return this.userVolumes.get(socketId) ?? 1.0;
  }

  setMicVolume(volPercent) {
    this.micVolume = Math.max(0, Math.min(200, Number(volPercent) || 100));
    try {
      localStorage.setItem('fivecord_mic_volume', this.micVolume);
    } catch (e) {}
  }

  getMicVolume() {
    if (this.micVolume !== undefined) return this.micVolume;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fivecord_mic_volume') : null;
    return saved !== null ? Number(saved) : 100;
  }

  setMasterOutputVolume(volPercent) {
    this.masterOutputVolume = Math.max(0, Math.min(100, Number(volPercent) || 100));
    try {
      localStorage.setItem('fivecord_output_volume', this.masterOutputVolume);
    } catch (e) {}
  }

  getMasterOutputVolume() {
    if (this.masterOutputVolume !== undefined) return this.masterOutputVolume;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fivecord_output_volume') : null;
    return saved !== null ? Number(saved) : 100;
  }

  setNoiseSuppression(enabled) {
    // Kept as no-op for UI code compatibility
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
  }

  setDeafened(deafened) {
    this.isDeafened = Boolean(deafened);
    this.isMuted = Boolean(deafened);
  }

  ensurePlaybackContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      try {
        this.playbackContext = new AudioCtx({ latencyHint: 'interactive' });
      } catch (e) {
        this.playbackContext = new AudioCtx();
      }
    }
    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume().catch(() => {});
    }
    return this.playbackContext;
  }

  async resumeContexts() {
    try {
      const pCtx = this.ensurePlaybackContext();
      if (pCtx && pCtx.state === 'suspended') {
        await pCtx.resume().catch(() => {});
      }
      if (this.captureContext && this.captureContext.state === 'suspended') {
        await this.captureContext.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[VoiceRelay] Error resuming audio contexts:', e);
    }
  }

  async startBroadcasting(channelId, mediaStream) {
    if (!mediaStream) return;
    this.currentChannelId = channelId;

    try {
      this.stopCapture();

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.captureContext || this.captureContext.state === 'closed') {
        this.captureContext = new AudioCtx({ latencyHint: 'interactive' });
      }
      if (this.captureContext.state === 'suspended') {
        await this.captureContext.resume().catch(() => {});
      }

      this.sampleRate = this.captureContext.sampleRate || 48000;
      this.micSource = this.captureContext.createMediaStreamSource(mediaStream);

      // Clean, uncompressed high-fidelity voice transmission
      this.processor = this.captureContext.createScriptProcessor(2048, 1, 1);
      this.micSource.connect(this.processor);

      if (typeof window !== 'undefined') {
        window.__fivecordVoiceProcessor = this.processor;
        window.__fivecordVoiceCapture = this.captureContext;
      }

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.currentChannelId) return;

        const input = e.inputBuffer.getChannelData(0);
        const micGain = this.getMicVolume() / 100;
        const pcm16 = new Int16Array(input.length);
        
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i] * micGain));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        socket.emit('voice-pcm-chunk', {
          channelId: this.currentChannelId,
          sampleRate: this.sampleRate,
          buffer: pcm16.buffer
        });
      };

      // Mute local loopback to avoid hearing own voice echo
      this.muteNode = this.captureContext.createGain();
      this.muteNode.gain.value = 0;
      this.processor.connect(this.muteNode);
      this.muteNode.connect(this.captureContext.destination);

      this.isBroadcasting = true;
      console.log(`[VoiceRelay] Clean audio broadcasting started on channel ${channelId} @ ${this.sampleRate}Hz`);
    } catch (err) {
      console.warn('[VoiceRelay] Start broadcasting error:', err);
    }
  }

  playChunk(senderSocketId, sampleRate, buffer) {
    if (this.isDeafened || !buffer) return;

    try {
      const ctx = this.ensurePlaybackContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Safe multi-format binary buffer decoding (immune to unaligned byteOffset RangeErrors)
      let pcm16;
      if (buffer instanceof ArrayBuffer) {
        pcm16 = new Int16Array(buffer);
      } else if (ArrayBuffer.isView(buffer)) {
        if (buffer.byteOffset % 2 === 0) {
          pcm16 = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 2));
        } else {
          const cleanU8 = new Uint8Array(buffer.byteLength);
          cleanU8.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
          pcm16 = new Int16Array(cleanU8.buffer);
        }
      } else if (buffer && typeof buffer === 'object' && Array.isArray(buffer.data)) {
        const cleanU8 = new Uint8Array(buffer.data);
        pcm16 = new Int16Array(cleanU8.buffer);
      } else {
        return;
      }

      if (!pcm16 || pcm16.length === 0) return;

      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Micro-fade (16 samples) at chunk boundaries eliminates square-edge clicks/pops
      const ramp = Math.min(16, Math.floor(float32.length / 4));
      for (let i = 0; i < ramp; i++) {
        const factor = i / ramp;
        float32[i] *= factor;
        float32[float32.length - 1 - i] *= factor;
      }

      const inSampleRate = sampleRate || 48000;
      const audioBuffer = ctx.createBuffer(1, float32.length, inSampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      const userVol = this.getUserVolume(senderSocketId);
      const masterVol = this.getMasterOutputVolume() / 100;
      gainNode.gain.value = Math.max(0, userVol * masterVol);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      let nextPlay = this.peerPlayTimes.get(senderSocketId) || 0;

      // Stable low-latency jitter buffer (35ms): smooth playback without drift or stutter
      if (nextPlay < now || nextPlay > now + 0.35) {
        nextPlay = now + 0.035;
      }

      source.start(nextPlay);
      this.peerPlayTimes.set(senderSocketId, nextPlay + audioBuffer.duration);

      // Real-time speaking indicator trigger when peer audio contains voice energy
      let sumSq = 0;
      for (let i = 0; i < float32.length; i++) {
        sumSq += float32[i] * float32[i];
      }
      const rms = Math.sqrt(sumSq / float32.length);
      if (rms > 0.008 && this.onPeerSpeaking) {
        this.onPeerSpeaking(senderSocketId);
      }
    } catch (err) {
      console.warn('[VoiceRelay] Playback chunk error:', err);
    }
  }

  stopCapture() {
    this.isBroadcasting = false;
    if (this.processor) {
      try { this.processor.disconnect(); } catch (e) {}
      this.processor = null;
    }
    if (this.micSource) {
      try { this.micSource.disconnect(); } catch (e) {}
      this.micSource = null;
    }
    if (this.muteNode) {
      try { this.muteNode.disconnect(); } catch (e) {}
      this.muteNode = null;
    }
    if (this.captureContext && this.captureContext.state !== 'closed') {
      try { this.captureContext.close(); } catch (e) {}
      this.captureContext = null;
    }
    if (typeof window !== 'undefined') {
      delete window.__fivecordVoiceProcessor;
      delete window.__fivecordVoiceCapture;
    }
  }

  stop() {
    this.stopCapture();
    this.currentChannelId = null;
    this.peerPlayTimes.clear();
  }
}

export const voiceRelay = new VoiceRelayManager();

