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
    this.isNoiseSuppressionOn = typeof localStorage !== 'undefined' ? localStorage.getItem('fivecord_noise_suppressed') === 'true' : true;
    this.currentGateGain = 0.0;
    this.targetGateGain = 0.0;
    this.hpFilter = null;
    this.notchFilter = null;
    this.lpFilter = null;
    this.compressor = null;

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
    this.isNoiseSuppressionOn = Boolean(enabled);
    if (this.hpFilter && this.lpFilter) {
      if (this.isNoiseSuppressionOn) {
        this.hpFilter.frequency.value = 85;
        this.lpFilter.frequency.value = 10500;
        if (this.notchFilter) this.notchFilter.frequency.value = 50;
      } else {
        this.hpFilter.frequency.value = 10;
        this.lpFilter.frequency.value = 22000;
        if (this.notchFilter) this.notchFilter.frequency.value = 10;
      }
    }
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

      // --- KRISP STUDIO AI DSP FILTER CHAIN ---
      // 1. High-Pass Filter (85Hz) removes desk thumps, mic handling, and fan/AC rumble
      this.hpFilter = this.captureContext.createBiquadFilter();
      this.hpFilter.type = 'highpass';
      this.hpFilter.frequency.value = this.isNoiseSuppressionOn ? 85 : 10;
      this.hpFilter.Q.value = 0.707;

      // 2. Notch Filter (50Hz) removes AC mains electric buzz
      this.notchFilter = this.captureContext.createBiquadFilter();
      this.notchFilter.type = 'notch';
      this.notchFilter.frequency.value = this.isNoiseSuppressionOn ? 50 : 10;
      this.notchFilter.Q.value = 4.0;

      // 3. Low-Pass Filter (10.5kHz) cuts off coil whine, harsh electronic hiss
      this.lpFilter = this.captureContext.createBiquadFilter();
      this.lpFilter.type = 'lowpass';
      this.lpFilter.frequency.value = this.isNoiseSuppressionOn ? 10500 : 22000;
      this.lpFilter.Q.value = 0.707;

      // 4. Dynamics Compressor for broadcast radio vocal clarity
      this.compressor = this.captureContext.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.captureContext.currentTime);
      this.compressor.knee.setValueAtTime(15, this.captureContext.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.captureContext.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.captureContext.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.captureContext.currentTime);

      // 5. ScriptProcessor bufferSize 2048 (~42ms at 48kHz, ~46ms at 44.1kHz)
      this.processor = this.captureContext.createScriptProcessor(2048, 1, 1);
      this.hangover = 0;
      this.currentGateGain = 0.0;
      this.targetGateGain = 0.0;

      // Connect DSP Chain
      this.micSource.connect(this.hpFilter);
      this.hpFilter.connect(this.notchFilter);
      this.notchFilter.connect(this.lpFilter);
      this.lpFilter.connect(this.compressor);
      this.compressor.connect(this.processor);

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

        // Krisp Studio Gate Threshold:
        // When Krisp is enabled, filter background keyboard clicks & fan noise
        const threshold = this.isNoiseSuppressionOn ? 0.0028 : 0.0015;
        if (maxVal > threshold) {
          this.hangover = this.isNoiseSuppressionOn ? 12 : 15;
          this.targetGateGain = 1.0;
        } else if (this.hangover > 0) {
          this.hangover--;
          this.targetGateGain = 1.0;
        } else {
          this.targetGateGain = 0.0;
        }

        // Smooth gate transitions to eliminate pops/clicks
        this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.35;
        if (this.currentGateGain < 0.005) {
          this.currentGateGain = 0.0;
          return; // Dead silent between words, no background noise packets emitted
        }

        // Convert Float32 [-1, 1] to Int16 [-32768, 32767] with mic gain and noise gate
        const micGain = (this.getMicVolume() / 100) * this.currentGateGain;
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

      // Apply individual user volume & master output volume
      const gainNode = ctx.createGain();
      const userVol = this.getUserVolume(senderSocketId);
      const masterVol = this.getMasterOutputVolume() / 100;
      gainNode.gain.value = Math.max(0, userVol * masterVol);

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
    if (this.hpFilter) {
      try { this.hpFilter.disconnect(); } catch (e) {}
      this.hpFilter = null;
    }
    if (this.notchFilter) {
      try { this.notchFilter.disconnect(); } catch (e) {}
      this.notchFilter = null;
    }
    if (this.lpFilter) {
      try { this.lpFilter.disconnect(); } catch (e) {}
      this.lpFilter = null;
    }
    if (this.compressor) {
      try { this.compressor.disconnect(); } catch (e) {}
      this.compressor = null;
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
