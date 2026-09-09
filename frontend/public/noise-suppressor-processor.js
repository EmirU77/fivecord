/**
 * FiveCord Noise Suppressor AudioWorkletProcessor
 * Spectral Subtraction + Voice Activity Detection
 * 
 * Algorithm:
 *  1. Split audio into overlapping frames (FFT)
 *  2. During silence, continuously update noise floor profile
 *  3. During speech, subtract noise floor from spectrum (Berouti spectral subtraction)
 *  4. IFFT back to time domain with overlap-add reconstruction
 *  5. Hard gate: if frame energy is below threshold after subtraction → silence output
 */

const FRAME_SIZE = 512;      // FFT size
const HOP_SIZE = 256;        // 50% overlap
const ALPHA = 2.0;           // Over-subtraction factor (higher = more aggressive)
const BETA = 0.001;          // Spectral floor (prevents musical noise)
const NOISE_SMOOTH = 0.92;   // Noise profile exponential smoothing (higher = slower update)
const VAD_THRESHOLD = 0.008; // Voice activity detection threshold (RMS)
const HANGOVER_FRAMES = 20;  // Frames to keep gate open after speech detected

class NoiseSuppressorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.enabled = true;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'setEnabled') {
        this.enabled = e.data.enabled;
      }
    };

    // Input ring buffer for overlap-add
    this.inputBuffer = new Float32Array(FRAME_SIZE * 2);
    this.inputWritePos = 0;
    this.samplesInBuffer = 0;

    // Output overlap-add buffer
    this.outputBuffer = new Float32Array(FRAME_SIZE * 2);
    this.outputReadPos = 0;

    // Noise profile (magnitude spectrum)
    this.noiseProfile = new Float32Array(FRAME_SIZE / 2 + 1);
    this.noiseProfileInitialized = false;

    // Hann window
    this.window = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)));
    }

    // DFT arrays
    this.re = new Float32Array(FRAME_SIZE);
    this.im = new Float32Array(FRAME_SIZE);

    this.hangover = 0;
    this.frameCount = 0;
  }

  // Simple iterative FFT (Cooley-Tukey) — works on power-of-2 sizes
  fft(re, im) {
    const n = re.length;
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    // Butterfly operations
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (2 * Math.PI) / len;
      const wre = Math.cos(ang);
      const wim = -Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cur_re = 1, cur_im = 0;
        for (let j = 0; j < len / 2; j++) {
          const u_re = re[i + j];
          const u_im = im[i + j];
          const v_re = re[i + j + len / 2] * cur_re - im[i + j + len / 2] * cur_im;
          const v_im = re[i + j + len / 2] * cur_im + im[i + j + len / 2] * cur_re;
          re[i + j] = u_re + v_re;
          im[i + j] = u_im + v_im;
          re[i + j + len / 2] = u_re - v_re;
          im[i + j + len / 2] = u_im - v_im;
          const new_re = cur_re * wre - cur_im * wim;
          cur_im = cur_re * wim + cur_im * wre;
          cur_re = new_re;
        }
      }
    }
  }

  ifft(re, im) {
    // IFFT = conjugate, FFT, conjugate, divide by N
    for (let i = 0; i < im.length; i++) im[i] = -im[i];
    this.fft(re, im);
    for (let i = 0; i < re.length; i++) {
      re[i] /= re.length;
      im[i] = -im[i] / im.length;
    }
  }

  processFrame(frame) {
    if (!this.enabled) return frame.slice();

    const N = FRAME_SIZE;
    const halfN = N / 2 + 1;

    // Apply Hann window
    const windowed = new Float32Array(N);
    let rms = 0;
    for (let i = 0; i < N; i++) {
      windowed[i] = frame[i] * this.window[i];
      rms += windowed[i] * windowed[i];
    }
    rms = Math.sqrt(rms / N);

    // Copy to re/im arrays
    this.re.set(windowed);
    this.im.fill(0);

    // Forward FFT
    this.fft(this.re, this.im);

    // Compute magnitude spectrum (only positive frequencies)
    const mag = new Float32Array(halfN);
    const phase = new Float32Array(halfN);
    for (let k = 0; k < halfN; k++) {
      mag[k] = Math.sqrt(this.re[k] * this.re[k] + this.im[k] * this.im[k]);
      phase[k] = Math.atan2(this.im[k], this.re[k]);
    }

    // Voice Activity Detection
    const isSpeech = rms > VAD_THRESHOLD;
    if (isSpeech) {
      this.hangover = HANGOVER_FRAMES;
    } else if (this.hangover > 0) {
      this.hangover--;
    }

    // Update noise profile during non-speech frames
    const updateNoise = this.hangover === 0;
    if (!this.noiseProfileInitialized) {
      // First 30 frames: initialize noise profile
      if (this.frameCount < 30) {
        for (let k = 0; k < halfN; k++) {
          this.noiseProfile[k] = this.noiseProfile[k] * NOISE_SMOOTH + mag[k] * (1 - NOISE_SMOOTH);
        }
      } else {
        this.noiseProfileInitialized = true;
      }
    } else if (updateNoise) {
      // Slowly update noise profile during silence
      for (let k = 0; k < halfN; k++) {
        this.noiseProfile[k] = this.noiseProfile[k] * NOISE_SMOOTH + mag[k] * (1 - NOISE_SMOOTH);
      }
    }

    // Spectral Subtraction: S = max(|X| - alpha * |N|, beta * |N|)
    const outMag = new Float32Array(halfN);
    for (let k = 0; k < halfN; k++) {
      const estimated = mag[k] - ALPHA * this.noiseProfile[k];
      const floor = BETA * this.noiseProfile[k];
      outMag[k] = Math.max(estimated, floor);
    }

    // Hard gate: if frame is not speech, silence the output
    if (this.hangover === 0) {
      outMag.fill(0);
    }

    // Reconstruct complex spectrum from magnitude + original phase
    for (let k = 0; k < halfN; k++) {
      this.re[k] = outMag[k] * Math.cos(phase[k]);
      this.im[k] = outMag[k] * Math.sin(phase[k]);
    }
    // Mirror negative frequencies
    for (let k = halfN; k < N; k++) {
      this.re[k] = this.re[N - k];
      this.im[k] = -this.im[N - k];
    }

    // Inverse FFT
    this.ifft(this.re, this.im);

    // Un-window (synthesis window for overlap-add = same Hann window normalized)
    const output = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      output[i] = this.re[i] * this.window[i] * (2 / 0.5); // OLA normalization
    }

    this.frameCount++;
    return output;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    const inData = input[0];    // 128 samples per AudioWorklet block
    const outData = output[0];
    const blockSize = inData.length; // typically 128

    if (!this.enabled) {
      outData.set(inData);
      return true;
    }

    // Fill input ring buffer
    for (let i = 0; i < blockSize; i++) {
      this.inputBuffer[(this.inputWritePos + i) % (FRAME_SIZE * 2)] = inData[i];
    }
    this.inputWritePos = (this.inputWritePos + blockSize) % (FRAME_SIZE * 2);
    this.samplesInBuffer += blockSize;

    // Process complete frames when enough samples are available
    while (this.samplesInBuffer >= FRAME_SIZE) {
      // Extract frame from ring buffer
      const frame = new Float32Array(FRAME_SIZE);
      const startPos = (this.inputWritePos - this.samplesInBuffer + FRAME_SIZE * 2) % (FRAME_SIZE * 2);
      for (let i = 0; i < FRAME_SIZE; i++) {
        frame[i] = this.inputBuffer[(startPos + i) % (FRAME_SIZE * 2)];
      }

      // Process the frame
      const processed = this.processFrame(frame);

      // Overlap-add into output buffer
      for (let i = 0; i < FRAME_SIZE; i++) {
        const pos = (this.outputReadPos + i) % (FRAME_SIZE * 2);
        this.outputBuffer[pos] += processed[i];
      }

      this.samplesInBuffer -= HOP_SIZE;
    }

    // Read processed output
    for (let i = 0; i < blockSize; i++) {
      const pos = (this.outputReadPos + i) % (FRAME_SIZE * 2);
      outData[i] = Math.max(-1, Math.min(1, this.outputBuffer[pos]));
      this.outputBuffer[pos] = 0; // Clear after reading
    }
    this.outputReadPos = (this.outputReadPos + blockSize) % (FRAME_SIZE * 2);

    return true;
  }
}

registerProcessor('noise-suppressor-processor', NoiseSuppressorProcessor);
