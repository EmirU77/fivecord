import { socket } from './socket';

class VoiceRelayManager {
  constructor() {
    this.currentChannelId = null;
    this.captureContext = null;
    this.micSource = null;
    this.processor = null;
    this.muteNode = null;
    this.playbackContext = null;
    this.peerPlayTimes = new Map(); // socketId -> next scheduled playback time
    this.isMuted = false;
    this.isDeafened = false;
    this.userVolumes = new Map(); // socketId -> volume (0..2)
    this.isBroadcasting = false;
    this.sampleRate = 48000;
    this.hangover = 0;
    this.onPeerSpeaking = null; // Callback (senderSocketId, isSpeaking)

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    socket.on('voice-pcm-chunk', ({ senderSocketId, sampleRate, buffer }) => {
      if (this.isDeafened) return;
      this.playChunk(senderSocketId, sampleRate, buffer);
      if (this.onPeerSpeaking) {
        this.onPeerSpeaking(senderSocketId, true);
      }
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

  setMuted(muted) {
    this.isMuted = muted;
  }

  setDeafened(deafened) {
    this.isDeafened = deafened;
    this.isMuted = deafened;
  }

  ensurePlaybackContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new AudioCtx();
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
        await pCtx.resume();
      }
      if (this.captureContext && this.captureContext.state === 'suspended') {
        await this.captureContext.resume();
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
      this.captureContext = new AudioCtx();
      if (this.captureContext.state === 'suspended') {
        await this.captureContext.resume();
      }

      this.sampleRate = this.captureContext.sampleRate || 44100;
      this.micSource = this.captureContext.createMediaStreamSource(mediaStream);

      // ScriptProcessor bufferSize 2048 (~42ms at 48kHz, ~46ms at 44.1kHz)
      this.processor = this.captureContext.createScriptProcessor(2048, 1, 1);
      this.hangover = 0;

      // Retain references on window to prevent Chromium V8 GC from killing processor
      if (typeof window !== 'undefined') {
        window.__fivecordVoiceProcessor = this.processor;
        window.__fivecordVoiceCapture = this.captureContext;
      }

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.currentChannelId) return;

        const input = e.inputBuffer.getChannelData(0);
        let maxVal = 0;
        for (let i = 0; i < input.length; i++) {
          const abs = Math.abs(input[i]);
          if (abs > maxVal) maxVal = abs;
        }

        // Sensitive voice activity threshold (~ -56 dBFS)
        // Picks up quiet laptop mics, built-in headsets, and whispers effortlessly
        if (maxVal > 0.0015) {
          this.hangover = 15; // ~600ms hangover to prevent clipping natural word endings
        }

        if (this.hangover > 0) {
          this.hangover--;

          // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
          const pcm16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          socket.emit('voice-pcm-chunk', {
            channelId: this.currentChannelId,
            sampleRate: this.sampleRate,
            buffer: pcm16.buffer
          });
        }
      };

      // Mute local loopback to avoid hearing own voice echo
      this.muteNode = this.captureContext.createGain();
      this.muteNode.gain.value = 0;

      this.micSource.connect(this.processor);
      this.processor.connect(this.muteNode);
      this.muteNode.connect(this.captureContext.destination);

      this.isBroadcasting = true;
      console.log(`[VoiceRelay] Broadcasting audio on channel ${channelId} (${this.sampleRate}Hz PCM relay)`);
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

      // Handle any incoming binary buffer format safely (ArrayBuffer, Buffer, TypedArray)
      let pcm16;
      if (buffer instanceof ArrayBuffer) {
        pcm16 = new Int16Array(buffer);
      } else if (ArrayBuffer.isView(buffer)) {
        pcm16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      } else {
        pcm16 = new Int16Array(buffer);
      }

      if (pcm16.length === 0) return;

      // Convert Int16 -> Float32
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      const inSampleRate = sampleRate || 48000;
      const audioBuffer = ctx.createBuffer(1, float32.length, inSampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Apply individual user volume
      const gainNode = ctx.createGain();
      const userVol = this.getUserVolume(senderSocketId);
      gainNode.gain.value = Math.max(0, userVol);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      let nextPlay = this.peerPlayTimes.get(senderSocketId) || 0;

      // If next scheduled playback has fallen behind or drifted > 150ms, resync smoothly
      if (nextPlay < now || nextPlay > now + 0.15) {
        nextPlay = now + 0.025; // 25ms small jitter buffer
      }

      source.start(nextPlay);
      this.peerPlayTimes.set(senderSocketId, nextPlay + audioBuffer.duration);
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
    if (this.captureContext) {
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
