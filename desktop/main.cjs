const { app, BrowserWindow, session, desktopCapturer } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => resolve(res.statusCode < 500));
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = async () => {
      const isUp = await checkServer(url);
      if (isUp) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(check, 300);
    };
    check();
  });
}

async function ensureBackend() {
  const isRunning = await checkServer('http://localhost:3001/api/health');
  if (!isRunning) {
    console.log('[Desktop] Starting Fivecord Backend on port 3001...');
    const serverPath = path.join(__dirname, '..', 'backend', 'src', 'server.js');
    backendProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'ignore'
    });
  } else {
    console.log('[Desktop] Fivecord Backend already running.');
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 520,
    backgroundColor: '#1e1f22',
    title: 'Fivecord — 5 Kişilik Özel VIP Discord',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Media Permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // Screen share capture handler
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

  await ensureBackend();
  await waitForServer('http://localhost:3001/api/health');

  mainWindow.loadURL('http://localhost:3001');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {}
  }
  app.quit();
});