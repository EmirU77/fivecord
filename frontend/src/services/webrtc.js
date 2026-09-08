import { socket } from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
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
    this.peers = new Map();
    this.localStream = null;
    this.cameraTrack = null;
    this.cameraStream = null;
    this.screenStream = null;
    this.remoteStreams = new Map();
    this.remoteScreenStreams = new Map();

    this.audioContext = null;
    this.analyser = null;
    this.micSource = null;
    this.vadInterval = null;
    this.isSpeaking = false;

    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    this.onSpeakingChanged = null;
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
    if (this.localStream) return this.localStream;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        },
        video: false
      });

      this.startVAD(this.localStream);
      return this.localStream;
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      return null;
    }
  }

  startVAD(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      this.micSource = this.audioContext.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speakingCounter = 0;

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
      console.warn('VAD initialization error:', e);
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
    this.isNoiseSuppressionOn = !!enabled;
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

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(targetSocketId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    if (this.cameraTrack && this.cameraStream) {
      pc.addTrack(this.cameraTrack, this.cameraStream);
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        pc.addTrack(track, this.screenStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          targetSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      const isScreen = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].label?.toLowerCase().includes('screen');

      if (isScreen) {
        this.remoteScreenStreams.set(targetSocketId, stream);
      } else {
        this.remoteStreams.set(targetSocketId, stream);
      }

      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(targetSocketId, stream, isScreen);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', {
            targetSocketId,
            signal: { sdp: pc.localDescription }
          });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      };
    }

    return pc;
  }

  async handleSignal(senderSocketId, signal) {
    let pc = this.peers.get(senderSocketId);
    if (!pc) {
      pc = this.createPeerConnection(senderSocketId, false);
    }

    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            targetSocketId: senderSocketId,
            signal: { sdp: pc.localDescription }
          });
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  }

  connectToRoom(peers) {
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

      this.peers.forEach((pc) => {
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

    this.peers.forEach(pc => {
      const senders = pc.getSenders();
      senders.forEach(sender => {
        if (sender.track && this.screenStream.getTracks().includes(sender.track)) {
          pc.removeTrack(sender);
        }
      });
    });

    this.screenStream = null;
    socket.emit('update-voice-state', { isScreenSharing: false });
  }

  // Camera Toggle - reliably turns ON and turns OFF the camera device hardware
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

        this.peers.forEach(pc => {
          pc.addTrack(videoTrack, this.localStream);
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
          // Hardware track stop turns off the camera webcam LED instantly!
          this.cameraTrack.stop();

          this.peers.forEach(pc => {
            const senders = pc.getSenders();
            senders.forEach(sender => {
              if (sender.track === this.cameraTrack) {
                pc.removeTrack(sender);
              }
            });
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
      pc.close();
      this.peers.delete(socketId);
    }
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

    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    this.remoteScreenStreams.clear();
  }
}

export const webrtc = new WebRTCManager();