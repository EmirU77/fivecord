import { socket } from './socket';

// High reliability ICE servers: Cloudflare STUN + Google STUN + OpenRelay (Metered) Free Public TURN
// Essential for NAT traversal (CGNAT, symmetric NATs, cellular hotspot, Turkish ISPs)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.voip.blackberry.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

export const QUALITY_PRESETS = {
  '4k-60': {
    name: '4K Ultra (2160p @ 60 FPS)',
    tag: 'ULTRA 4K',
    video: {
      width: { ideal: 3840, max: 3840 },
      height: { ideal: 2160, max: 2160 },
      frameRate: { ideal: 60, max: 60 }
    },
    bitrate: 15000000
  },
  '1080p-60': {
    name: 'Pro HD (1080p @ 60 FPS)',
    tag: 'PRO 60FPS',
    video: {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 60, max: 60 }
    },
    bitrate: 8000000
  },
  '720p-60': {
    name: 'Akıcı Oyun (720p @ 60 FPS)',
    tag: 'SMOOTH 60FPS',
    video: {
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 60, max: 60 }
    },
    bitrate: 4500000
  },
  '1080p-30': {
    name: 'Standart (1080p @ 30 FPS)',
    tag: 'FHD 30FPS',
    video: {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 30, max: 30 }
    },
    bitrate: 3500000
  }
};

class WebRTCManager {
  constructor() {
    this.peers = new Map(); // socketId -> RTCPeerConnection
    this.pendingCandidates = new Map(); // socketId -> RTCIceCandidate[]
    this.localStream = null;
    this.cameraTrack = null;
    this.cameraStream = null;
    this.screenStream = null;
    this.remoteStreams = new Map(); // socketId -> MediaStream
    this.remoteScreenStreams = new Map(); // socketId -> MediaStream

    this.audioContext = null;
    this.analyser = null;
    this.micSource = null;
    this.vadInterval = null;
    this.isSpeaking = false;

    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    this.onSpeakingChanged = null;
    this.onConnectionStateChange = null;
    this.isNoiseSuppressionOn = true;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    socket.on('signal', async ({ senderSocketId, signal, streamType }) => {
      await this.handleSignal(senderSocketId, signal, streamType);
    });

    socket.on('user-left-voice', ({ socketId }) => {
      this.removePeer(socketId);
    });
  }

  async initLocalAudio() {
    if (this.localStream && this.localStream.getAudioTracks().length > 0) {
      const track = this.localStream.getAudioTracks()[0];
      if (track.readyState === 'live') {
        return this.localStream;
      }
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: this.isNoiseSuppressionOn,
          autoGainControl: true
        },
        video: false
      });
      console.log('[WebRTC] Microphone accessed successfully (high fidelity)');
    } catch (err) {
      console.warn('[WebRTC] High quality mic constraints failed, falling back to basic audio:', err);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('[WebRTC] Microphone accessed with basic fallback');
      } catch (err2) {
        console.error('[WebRTC] Microphone access denied completely:', err2);
        return null;
      }
    }

    if (this.localStream) {
      this.startVAD(this.localStream);

      // If we already have peer connections open, update their audio tracks and renegotiate
      this.peers.forEach((pc, targetSocketId) => {
        const senders = pc.getSenders();
        const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');
        if (!hasAudio && this.localStream) {
          this.localStream.getAudioTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
          });
          this.renegotiate(targetSocketId, pc);
        }
      });
    }

    return this.localStream;
  }

  startVAD(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      if (this.micSource) {
        try { this.micSource.disconnect(); } catch (e) {}
      }
      this.micSource = this.audioContext.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speakingCounter = 0;

      if (this.vadInterval) {
        clearInterval(this.vadInterval);
      }

      this.vadInterval = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const threshold = this.isNoiseSuppressionOn ? 22 : 14;
        const nowSpeaking = average > threshold;

        if (nowSpeaking) {
          speakingCounter = 4;
        } else if (speakingCounter > 0) {
          speakingCounter--;
        }

        const isCurrentlySpeaking = speakingCounter > 0;
        if (isCurrentlySpeaking !== this.isSpeaking) {
          this.isSpeaking = isCurrentlySpeaking;
          socket.emit('update-voice-state', { isSpeaking: this.isSpeaking });
          if (this.onSpeakingChanged) {
            this.onSpeakingChanged(this.isSpeaking);
          }
        }
      }, 80);
    } catch (e) {
      console.warn('[WebRTC] VAD initialization error:', e);
    }
  }

  stopVAD() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.isSpeaking = false;
  }

  setNoiseSuppression(enabled) {
    this.isNoiseSuppressionOn = enabled;
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack && audioTrack.applyConstraints) {
        audioTrack.applyConstraints({
          noiseSuppression: this.isNoiseSuppressionOn,
          echoCancellation: true,
          autoGainControl: true
        }).catch(() => {});
      }
    }
    return this.isNoiseSuppressionOn;
  }

  createPeerConnection(targetSocketId, isInitiator) {
    if (this.peers.has(targetSocketId)) {
      return this.peers.get(targetSocketId);
    }

    console.log(`[WebRTC] Creating RTCPeerConnection for ${targetSocketId} (isInitiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(targetSocketId, pc);
    this.pendingCandidates.set(targetSocketId, []);

    // 1. Add existing local audio track
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('[WebRTC] Error adding local track:', e);
        }
      });
    }

    // 2. Add camera track if active
    if (this.cameraTrack && this.cameraStream) {
      try {
        pc.addTrack(this.cameraTrack, this.cameraStream);
      } catch (e) {}
    }

    // 3. Add screen track if active
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.screenStream);
        } catch (e) {}
      });
    }

    // 4. Ensure transceiver for audio exists with direction sendrecv
    const senders = pc.getSenders();
    const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');
    if (!hasAudio) {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (e) {}
    }

    // 5. ICE Candidate emitter
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          targetSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // 6. Remote track receiver
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received from ${targetSocketId}:`, {
        kind: event.track.kind,
        streamsCount: event.streams.length
      });

      let stream = event.streams && event.streams[0];
      if (!stream) {
        // Fallback: create or retrieve existing stream for this peer
        let existing = this.remoteStreams.get(targetSocketId);
        if (!existing) {
          existing = new MediaStream();
          this.remoteStreams.set(targetSocketId, existing);
        }
        existing.addTrack(event.track);
        stream = existing;
      }

      const isScreen = stream && stream.getVideoTracks().length > 0 && 
        (stream.getVideoTracks()[0].label?.toLowerCase().includes('screen') || 
         stream.getVideoTracks()[0].label?.toLowerCase().includes('display'));

      if (isScreen) {
        this.remoteScreenStreams.set(targetSocketId, stream);
      } else {
        this.remoteStreams.set(targetSocketId, stream);
      }

      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(targetSocketId, stream, isScreen, event.track);
      }
    };

    // 7. Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${targetSocketId} connectionState -> ${pc.connectionState}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(targetSocketId, pc.connectionState);
      }
      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC] Peer ${targetSocketId} failed, restarting ICE...`);
        this.restartIce(targetSocketId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${targetSocketId} iceConnectionState -> ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        this.restartIce(targetSocketId);
      }
    };

    // 8. Explicitly initiate offer if initiator!
    if (isInitiator) {
      this.initiateOffer(targetSocketId, pc);
    }

    return pc;
  }

  async initiateOffer(targetSocketId, pc) {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      socket.emit('signal', {
        targetSocketId,
        signal: { sdp: pc.localDescription }
      });
      console.log(`[WebRTC] Initiator sent SDP offer to ${targetSocketId}`);
    } catch (err) {
      console.error(`[WebRTC] Error initiating offer to ${targetSocketId}:`, err);
    }
  }

  async handleSignal(senderSocketId, signal) {
    let pc = this.peers.get(senderSocketId);
    if (!pc) {
      pc = this.createPeerConnection(senderSocketId, false);
    }

    try {
      if (signal.sdp) {
        console.log(`[WebRTC] Received SDP ${signal.sdp.type} from ${senderSocketId}`);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        // Drain buffered ICE candidates now that remote description is set!
        const pending = this.pendingCandidates.get(senderSocketId) || [];
        if (pending.length > 0) {
          console.log(`[WebRTC] Adding ${pending.length} buffered candidates for ${senderSocketId}`);
          for (const cand of pending) {
            try {
              await pc.addIceCandidate(cand);
            } catch (candErr) {
              console.warn('[WebRTC] Error adding buffered candidate:', candErr);
            }
          }
          this.pendingCandidates.set(senderSocketId, []);
        }

        if (signal.sdp.type === 'offer') {
          // Make sure local tracks are added before creating answer
          if (this.localStream) {
            const senders = pc.getSenders();
            this.localStream.getTracks().forEach(track => {
              if (!senders.some(s => s.track === track)) {
                pc.addTrack(track, this.localStream);
              }
            });
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            targetSocketId: senderSocketId,
            signal: { sdp: pc.localDescription }
          });
          console.log(`[WebRTC] Sent SDP answer to ${senderSocketId}`);
        }
      } else if (signal.candidate) {
        const iceCandidate = new RTCIceCandidate(signal.candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(iceCandidate);
        } else {
          // Buffer candidate until remote description arrives
          const pending = this.pendingCandidates.get(senderSocketId) || [];
          pending.push(iceCandidate);
          this.pendingCandidates.set(senderSocketId, pending);
        }
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling signal from ${senderSocketId}:`, err);
    }
  }

  async restartIce(targetSocketId) {
    const pc = this.peers.get(targetSocketId);
    if (!pc) return;
    try {
      console.log(`[WebRTC] Restarting ICE for ${targetSocketId}...`);
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.emit('signal', {
        targetSocketId,
        signal: { sdp: pc.localDescription }
      });
    } catch (e) {
      console.warn(`[WebRTC] Error restarting ICE for ${targetSocketId}:`, e);
    }
  }

  async renegotiate(targetSocketId, pc) {
    try {
      if (pc.signalingState !== 'stable') {
        console.log(`[WebRTC] Delaying renegotiate for ${targetSocketId} (state: ${pc.signalingState})`);
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', {
        targetSocketId,
        signal: { sdp: pc.localDescription }
      });
      console.log(`[WebRTC] Renegotiation offer sent to ${targetSocketId}`);
    } catch (err) {
      console.warn(`[WebRTC] Renegotiation error for ${targetSocketId}:`, err);
    }
  }

  connectToRoom(peers) {
    console.log(`[WebRTC] Connecting to voice room peers:`, peers);
    peers.forEach(peer => {
      this.createPeerConnection(peer.socketId, true);
    });
  }

  async startScreenShare(presetKey = '1080p-60', withAudio = true) {
    const preset = QUALITY_PRESETS[presetKey] || QUALITY_PRESETS['1080p-60'];

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          ...preset.video,
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: withAudio ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2
        } : false
      });

      if (!withAudio) {
        displayStream.getAudioTracks().forEach(track => {
          track.stop();
          displayStream.removeTrack(track);
        });
      }

      this.screenStream = displayStream;

      this.peers.forEach((pc, targetSocketId) => {
        displayStream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, displayStream);

          if (track.kind === 'video') {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = preset.bitrate;
            params.encodings[0].degradationPreference = 'maintain-framerate';
            sender.setParameters(params).catch(e => console.warn('Bitrate adjust notice:', e));
          }
        });
        this.renegotiate(targetSocketId, pc);
      });

      displayStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      socket.emit('update-voice-state', { isScreenSharing: true });
      return { success: true, stream: displayStream, preset };
    } catch (err) {
      console.error('Screen sharing error:', err);
      return { success: false, error: err.message };
    }
  }

  stopScreenShare() {
    if (!this.screenStream) return;

    this.screenStream.getTracks().forEach(track => {
      track.stop();
    });

    this.peers.forEach((pc, targetSocketId) => {
      const senders = pc.getSenders();
      senders.forEach(sender => {
        if (sender.track && this.screenStream.getTracks().includes(sender.track)) {
          pc.removeTrack(sender);
        }
      });
      this.renegotiate(targetSocketId, pc);
    });

    this.screenStream = null;
    socket.emit('update-voice-state', { isScreenSharing: false });
  }

  async toggleCamera(enable) {
    if (enable) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 }
        });
        const videoTrack = camStream.getVideoTracks()[0];
        this.cameraTrack = videoTrack;
        this.cameraStream = camStream;

        if (!this.localStream) {
          this.localStream = new MediaStream();
        }
        this.localStream.addTrack(videoTrack);

        this.peers.forEach((pc, targetSocketId) => {
          pc.addTrack(videoTrack, this.localStream);
          this.renegotiate(targetSocketId, pc);
        });

        videoTrack.onended = () => {
          this.toggleCamera(false);
        };

        socket.emit('update-voice-state', { isCameraOn: true });
        return { success: true, enabled: true, stream: camStream };
      } catch (err) {
        console.warn('Camera toggle error', err);
        return { success: false, enabled: false, error: err.message };
      }
    } else {
      try {
        if (this.cameraTrack) {
          this.cameraTrack.stop();

          this.peers.forEach((pc, targetSocketId) => {
            const senders = pc.getSenders();
            senders.forEach(sender => {
              if (sender.track === this.cameraTrack) {
                pc.removeTrack(sender);
              }
            });
            this.renegotiate(targetSocketId, pc);
          });

          if (this.localStream) {
            this.localStream.removeTrack(this.cameraTrack);
          }

          this.cameraTrack = null;
          this.cameraStream = null;
        }

        socket.emit('update-voice-state', { isCameraOn: false });
        return { success: true, enabled: false };
      } catch (err) {
        console.warn('Camera disable error', err);
        return { success: false, enabled: false };
      }
    }
  }

  setMicrophoneMuted(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    socket.emit('update-voice-state', { isMuted: muted });
  }

  setDeafened(deafened) {
    this.remoteStreams.forEach((stream) => {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !deafened;
      });
    });
    this.setMicrophoneMuted(deafened);
    socket.emit('update-voice-state', { isDeafened: deafened, isMuted: deafened });
  }

  removePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      try { pc.close(); } catch (e) {}
      this.peers.delete(socketId);
    }
    this.pendingCandidates.delete(socketId);
    this.remoteStreams.delete(socketId);
    this.remoteScreenStreams.delete(socketId);

    if (this.onRemoteStreamRemoved) {
      this.onRemoteStreamRemoved(socketId);
    }
  }

  leaveVoice() {
    this.stopScreenShare();
    if (this.cameraTrack) {
      this.cameraTrack.stop();
      this.cameraTrack = null;
      this.cameraStream = null;
    }
    this.stopVAD();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.peers.forEach(pc => {
      try { pc.close(); } catch (e) {}
    });
    this.peers.clear();
    this.pendingCandidates.clear();
    this.remoteStreams.clear();
    this.remoteScreenStreams.clear();
  }
}

export const webrtc = new WebRTCManager();
