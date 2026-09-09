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
    this.noiseWorkletNode = null;
    this.workletLoaded = false;

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
    // Update live worklet node if running
    if (this.noiseWorkletNode) {
      this.noiseWorkletNode.port.postMessage({ type: 'setEnabled', enabled: this.isNoiseSuppressionOn });
    }
    // Update legacy BiquadFilters if still in use (fallback path)
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
      this.captureContext = new AudioCtx({ sampleRate: 48000 });
      if (this.captureContext.state === 'suspended') {
        await this.captureContext.resume();
      }

      this.sampleRate = this.captureContext.sampleRate || 48000;
      this.micSource = this.captureContext.createMediaStreamSource(mediaStream);

      // ---- HIGH-PASS + NOTCH BASE FILTER (removes DC, mains hum) ----
      this.hpFilter = this.captureContext.createBiquadFilter();
      this.hpFilter.type = 'highpass';
      this.hpFilter.frequency.value = this.isNoiseSuppressionOn ? 80 : 10;
      this.hpFilter.Q.value = 0.707;

      this.notchFilter = this.captureContext.createBiquadFilter();
      this.notchFilter.type = 'notch';
      this.notchFilter.frequency.value = this.isNoiseSuppressionOn ? 50 : 10;
      this.notchFilter.Q.value = 5.0;

      this.lpFilter = this.captureContext.createBiquadFilter();
      this.lpFilter.type = 'lowpass';
      this.lpFilter.frequency.value = this.isNoiseSuppressionOn ? 10500 : 22000;
      this.lpFilter.Q.value = 0.707;

      // ---- DYNAMICS COMPRESSOR for vocal clarity ----
      this.compressor = this.captureContext.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-28, this.captureContext.currentTime);
      this.compressor.knee.setValueAtTime(10, this.captureContext.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.captureContext.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.captureContext.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.captureContext.currentTime);

      // ---- Try to load AudioWorklet for spectral subtraction ----
      let useWorklet = false;
      if (this.captureContext.audioWorklet && !this.workletLoaded) {
        try {
          await this.captureContext.audioWorklet.addModule('/noise-suppressor-processor.js');
          this.workletLoaded = true;
          useWorklet = true;
          console.log('[VoiceRelay] Spectral subtraction AudioWorklet loaded ✓');
        } catch (workletErr) {
          console.warn('[VoiceRelay] AudioWorklet load failed, using ScriptProcessor fallback:', workletErr);
        }
      } else if (this.workletLoaded) {
        useWorklet = true;
      }

      // ---- BUILD PROCESSING CHAIN ----
      // Base path: micSource → hpFilter → notchFilter → lpFilter → compressor → [worklet or fallback] → pcmEncoder
      this.micSource.connect(this.hpFilter);
      this.hpFilter.connect(this.notchFilter);
      this.notchFilter.connect(this.lpFilter);
      this.lpFilter.connect(this.compressor);

      let chainOutput; // The last node before pcmEncoder

      if (useWorklet) {
        // ---- SPECTRAL SUBTRACTION WORKLET ----
        this.noiseWorkletNode = new AudioWorkletNode(this.captureContext, 'noise-suppressor-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
          channelCountMode: 'explicit'
        });
        this.noiseWorkletNode.port.postMessage({ type: 'setEnabled', enabled: this.isNoiseSuppressionOn });
        this.compressor.connect(this.noiseWorkletNode);
        chainOutput = this.noiseWorkletNode;
      } else {
        // Fallback: compressor output feeds directly to PCM encoder
        chainOutput = this.compressor;
      }

      // ---- PCM ENCODER (ScriptProcessor) ----
      this.processor = this.captureContext.createScriptProcessor(2048, 1, 1);
      this.hangover = 0;
      this.currentGateGain = 0.0;
      this.targetGateGain = 0.0;

      chainOutput.connect(this.processor);

      // Retain references on window to prevent Chromium V8 GC
      if (typeof window !== 'undefined') {
        window.__fivecordVoiceProcessor = this.processor;
        window.__fivecordVoiceCapture = this.captureContext;
        window.__fivecordWorklet = this.noiseWorkletNode;
      }

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.currentChannelId) return;

        const input = e.inputBuffer.getChannelData(0);
        let maxVal = 0;
        let sumSq = 0;
        for (let i = 0; i < input.length; i++) {
          const abs = Math.abs(input[i]);
          if (abs > maxVal) maxVal = abs;
          sumSq += input[i] * input[i];
        }
        const rms = Math.sqrt(sumSq / input.length);

        // Gate thresholds: when worklet is active, it already suppresses noise,
        // so we use a tighter gate (only let through clear speech).
        // Without worklet, use a looser gate to catch softer speech.
        const rmsThreshold = useWorklet
          ? (this.isNoiseSuppressionOn ? 0.004 : 0.0015)
          : (this.isNoiseSuppressionOn ? 0.0028 : 0.0015);
        const peakThreshold = useWorklet
          ? (this.isNoiseSuppressionOn ? 0.012 : 0.004)
          : (this.isNoiseSuppressionOn ? 0.008 : 0.004);

        const voiceDetected = rms > rmsThreshold || maxVal > peakThreshold;

        if (voiceDetected) {
          this.hangover = this.isNoiseSuppressionOn ? 10 : 15;
          this.targetGateGain = 1.0;
        } else if (this.hangover > 0) {
          this.hangover--;
          this.targetGateGain = 1.0;
        } else {
          this.targetGateGain = 0.0;
        }

        // Smooth gate transitions
        this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.35;
        if (this.currentGateGain < 0.005) {
          this.currentGateGain = 0.0;
          return;
        }

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

      // Mute local loopback
      this.muteNode = this.captureContext.createGain();
      this.muteNode.gain.value = 0;
      this.processor.connect(this.muteNode);
      this.muteNode.connect(this.captureContext.destination);

      this.isBroadcasting = true;
      const mode = useWorklet ? 'Spectral Subtraction (AudioWorklet)' : 'Biquad DSP (fallback)';
      console.log(`[VoiceRelay] Broadcasting on channel ${channelId} — Noise mode: ${mode} @ ${this.sampleRate}Hz`);
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
    if (this.noiseWorkletNode) {
      try { this.noiseWorkletNode.disconnect(); } catch (e) {}
      this.noiseWorkletNode = null;
    }
    if (this.muteNode) {
      try { this.muteNode.disconnect(); } catch (e) {}
      this.muteNode = null;
    }
    if (this.captureContext) {
      try { this.captureContext.close(); } catch (e) {}
      this.captureContext = null;
      this.workletLoaded = false; // Reset so worklet reloads in new context
    }
    if (typeof window !== 'undefined') {
      delete window.__fivecordVoiceProcessor;
      delete window.__fivecordVoiceCapture;
      delete window.__fivecordWorklet;
    }
  }

  stop() {
    this.stopCapture();
    this.currentChannelId = null;
    this.peerPlayTimes.clear();
  }
}

export const voiceRelay = new VoiceRelayManager();
