const { app, BrowserWindow, session, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let backendProcess = null;

const SPLASH_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Synapse</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #08090d;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
    color: #e2e8f0;
    user-select: none;
    overflow: hidden;
    position: relative;
  }

  /* Ambient Glow Aura */
  .bg-glow-1 {
    position: absolute;
    width: 480px;
    height: 480px;
    background: radial-gradient(circle, rgba(88, 101, 242, 0.24) 0%, rgba(88, 101, 242, 0) 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    filter: blur(50px);
    pointer-events: none;
    animation: breatheGlow 4s ease-in-out infinite alternate;
  }
  .bg-glow-2 {
    position: absolute;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(168, 85, 247, 0) 70%);
    top: 48%;
    left: 52%;
    transform: translate(-50%, -50%);
    filter: blur(60px);
    pointer-events: none;
    animation: breatheGlow 5s ease-in-out infinite alternate-reverse;
  }

  @keyframes breatheGlow {
    0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  }

  /* Main Futuristic Card */
  .card {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 400px;
    padding: 40px 32px;
    background: rgba(15, 17, 26, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.9), 0 0 50px -12px rgba(88, 101, 242, 0.25);
  }

  /* Logo Sphere & Orbitals */
  .logo-wrapper {
    position: relative;
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
  }

  .orbit-ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px dashed rgba(88, 101, 242, 0.35);
    animation: rotateOrbit 14s linear infinite;
  }
  .orbit-ring-inner {
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: #a855f7;
    border-bottom-color: #5865f2;
    animation: rotateOrbitReverse 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes rotateOrbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes rotateOrbitReverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  .logo-core {
    width: 76px;
    height: 76px;
    background: linear-gradient(135deg, #5865f2 0%, #7c3aed 50%, #ec4899 100%);
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 32px rgba(88, 101, 242, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4);
    transform: rotate(-3deg);
    animation: floatLogo 3s ease-in-out infinite alternate;
  }

  @keyframes floatLogo {
    0% { transform: translateY(0) rotate(-3deg); }
    100% { transform: translateY(-4px) rotate(3deg); }
  }

  .logo-svg {
    width: 44px;
    height: 44px;
    fill: none;
    stroke: #ffffff;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
  }

  /* Title & Branding */
  .brand-name {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }

  .tagline {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #818cf8;
    margin-bottom: 26px;
    opacity: 0.9;
  }

  /* High-Tech Glowing Progress Bar */
  .progress-track {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
    overflow: hidden;
    position: relative;
    margin-bottom: 18px;
  }

  .progress-beam {
    position: absolute;
    top: 0;
    left: -40%;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #5865f2, #c084fc, transparent);
    border-radius: 99px;
    animation: beamSlide 1.5s ease-in-out infinite;
    box-shadow: 0 0 14px #818cf8;
  }

  @keyframes beamSlide {
    0% { left: -40%; }
    100% { left: 100%; }
  }

  /* Status Message with Live Beacon */
  .status-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 22px;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
    animation: blinkDot 1.4s infinite ease-in-out;
  }

  @keyframes blinkDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.8); }
  }

  .status-text {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
  }

  /* Retry Button */
  .retry-btn {
    display: none;
    margin-top: 20px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    font-weight: 600;
    font-size: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
    cursor: pointer;
    transition: all 0.2s;
  }
  .retry-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.5);
  }

  /* Footer Minimal Badge */
  .footer-badge {
    margin-top: 26px;
    padding: 4px 14px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>

  <div class="card">
    <div class="logo-wrapper">
      <div class="orbit-ring"></div>
      <div class="orbit-ring-inner"></div>
      <div class="logo-core">
        <svg class="logo-svg" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
    </div>

    <div class="brand-name">SYNAPSE</div>
    <div class="tagline">Next-Gen Voice & Stream</div>

    <div id="spinner" class="progress-track">
      <div class="progress-beam"></div>
    </div>

    <div class="status-wrapper">
      <div class="status-dot"></div>
      <div id="status" class="status-text">Sunucuya bağlanılıyor...</div>
    </div>

    <button id="retryBtn" class="retry-btn" onclick="location.reload()">Tekrar Bağlan</button>

    <div class="footer-badge">VIP ULTRA EDITION • 60 FPS HD</div>
  </div>
</body>
</html>`;

// Suppress uncaught exception alert dialogs on user machines
process.on('uncaughtException', (err) => {
  console.warn('[Desktop] Handled uncaught exception:', err.message);
});

// Prevent Chromium / Windows from auto-adjusting microphone volume (AGC bug)
app.commandLine.appendSwitch('disable-features', 'WebRtcAllowInputVolumeAdjustment');

async function checkCloudServer() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://fivecord.onrender.com/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch (e) {
    return false;
  }
}

async function ensureLocalBackend() {
  const fs = require('fs');
  const serverPath = path.join(__dirname, '..', 'backend', 'src', 'server.js');
  if (!fs.existsSync(serverPath)) {
    // Normal client user distribution without local backend files; connects to cloud
    return;
  }

  try {
    const res = await fetch('http://localhost:3001/api/health');
    if (res.ok) return;
  } catch (e) {
    try {
      console.log('[Desktop] Starting local backend...');
      backendProcess = spawn('node', [serverPath], {
        cwd: path.join(__dirname, '..', 'backend'),
        stdio: 'ignore',
        windowsHide: true
      });
      backendProcess.on('error', (err) => {
        // Silently handle if node is not in system PATH
        console.warn('[Desktop] Local node backend spawn skipped:', err.message);
      });
    } catch (spawnErr) {
      console.warn('[Desktop] Cannot spawn local backend:', spawnErr.message);
    }
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 520,
    backgroundColor: '#1e1f22',
    title: 'Synapse — Sesli & Görüntülü İletişim Platformu',
    icon: path.join(__dirname, 'synapse.ico'),
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Media & Screen Share permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      if (sources.length > 0) {
        callback({ video: sources[0], audio: 'loopback' });
      } else {
        callback({});
      }
    } catch (e) {
      callback({});
    }
  });

  // Identify client as official Synapse Desktop
  const baseUA = mainWindow.webContents.getUserAgent();
  mainWindow.webContents.setUserAgent(`${baseUA} SynapseDesktop/1.0.0`);

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript('window.isSynapseDesktop = true; window.isFivecordDesktop = true;').catch(() => {});
  });

  // Load splash screen immediately
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH_HTML));

  // Try to connect to Cloud server with smart spin-up wait
  let attempts = 0;
  const maxAttempts = 35; // ~70 seconds max for cold Render sleep
  const targetCloudUrl = 'https://fivecord.onrender.com?client=desktop';

  const connectLoop = async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    attempts++;
    const isUp = await checkCloudServer();

    if (isUp) {
      mainWindow.loadURL(targetCloudUrl);
      return;
    }

    if (attempts < maxAttempts) {
      const remainingSeconds = attempts * 2;
      mainWindow.webContents.executeJavaScript(
        `if (document.getElementById('status')) { document.getElementById('status').innerText = 'Bulut sunucusu uyandırılıyor... (${remainingSeconds} sn)'; }`
      ).catch(() => {});
      setTimeout(connectLoop, 2000);
    } else {
      // Cloud timed out, fallback to local or show retry
      try {
        const localCheck = await fetch('http://localhost:3001/api/health');
        if (localCheck.ok) {
          mainWindow.loadURL('http://localhost:3001?client=desktop');
          return;
        }
      } catch (e) {}

      mainWindow.webContents.executeJavaScript(
        `if (document.getElementById('status')) { 
           document.getElementById('status').innerText = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'; 
         }
         if (document.getElementById('spinner')) { document.getElementById('spinner').style.display = 'none'; }
         if (document.getElementById('retryBtn')) { document.getElementById('retryBtn').style.display = 'block'; }`
      ).catch(() => {});
    }
  };

  setTimeout(connectLoop, 600);

  // Error & crash recovery
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith('data:text/html')) return;
    console.error('[Desktop] did-fail-load:', errorCode, errorDescription, validatedURL);
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH_HTML));
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(
        `if (document.getElementById('status')) { 
           document.getElementById('status').innerText = 'Bağlantı kesildi. Yeniden bağlanmaya çalışılıyor...'; 
         }`
      ).catch(() => {});
      setTimeout(connectLoop, 2000);
    }, 500);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Desktop] Renderer crash:', details.reason);
    mainWindow.reload();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureLocalBackend();
  createWindow();

  // Keyboard shortcuts
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) mainWindow.reload();
  });
  globalShortcut.register('F5', () => {
    if (mainWindow) mainWindow.reload();
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {}
  }
  app.quit();
});