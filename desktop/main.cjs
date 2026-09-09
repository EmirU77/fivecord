const { app, BrowserWindow, session, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let backendProcess = null;

const SPLASH_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Synapse</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1e1f22;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #dbdee1;
    user-select: none;
    overflow: hidden;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 420px;
    padding: 24px;
  }
  .logo {
    width: 76px;
    height: 76px;
    background: #5865f2;
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 38px;
    font-weight: 800;
    box-shadow: 0 12px 36px rgba(88, 101, 242, 0.45);
    animation: pulse 2s infinite ease-in-out;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 12px 36px rgba(88, 101, 242, 0.45); }
    50% { transform: scale(1.06); box-shadow: 0 16px 44px rgba(88, 101, 242, 0.7); }
  }
  .title {
    margin-top: 22px;
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.3px;
  }
  .status {
    margin-top: 10px;
    font-size: 13px;
    color: #949ba4;
    line-height: 1.5;
    min-height: 20px;
  }
  .spinner {
    margin-top: 24px;
    width: 28px;
    height: 28px;
    border: 3px solid rgba(255, 255, 255, 0.08);
    border-top-color: #5865f2;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .badge {
    margin-top: 28px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #5865f2;
    background: rgba(88, 101, 242, 0.12);
    border: 1px solid rgba(88, 101, 242, 0.3);
    padding: 6px 14px;
    border-radius: 9999px;
  }
  .retry-btn {
    display: none;
    margin-top: 18px;
    padding: 10px 20px;
    background: #5865f2;
    color: white;
    font-weight: 600;
    font-size: 13px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .retry-btn:hover { background: #4752c4; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">S</div>
    <div class="title">Synapse</div>
    <div id="status" class="status">Sunucuya bağlanılıyor...</div>
    <div id="spinner" class="spinner"></div>
    <button id="retryBtn" class="retry-btn" onclick="location.reload()">Tekrar Dene</button>
    <div class="badge">SESLİ & GÖRÜNTÜLÜ İLETİŞİM PLATFORMU</div>
  </div>
</body>
</html>`;

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
  try {
    const res = await fetch('http://localhost:3001/api/health');
    if (res.ok) return;
  } catch (e) {
    console.log('[Desktop] Starting local backend...');
    const serverPath = path.join(__dirname, '..', 'backend', 'src', 'server.js');
    backendProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'ignore'
    });
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