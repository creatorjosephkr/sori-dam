'use strict';

const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 8808;
const SERVER_URL = `http://localhost:${PORT}`;

let pythonProcess = null;
let mainWindow = null;
let loadingWindow = null;

// ── Windows 11 스마트 앱 컨트롤(Smart App Control) 감지 및 안내 ─────────────────
// 스마트 앱 컨트롤이 켜져 있으면 서명되지 않은 .dll/.pyd(PyTorch 등) 로드가 차단되어
// "[WinError 4551] 애플리케이션 제어 정책에서 이 파일을 차단했습니다" 오류가 발생합니다.
let sacBlockGuideShown = false;

function getSacPrefPath() {
  return path.join(app.getPath('userData'), 'sac-guide.json');
}

function isSacStartupGuideDismissed() {
  try {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(getSacPrefPath(), 'utf8')).dismissed === true;
  } catch (_) {
    return false;
  }
}

function setSacStartupGuideDismissed() {
  try {
    const fs = require('fs');
    fs.writeFileSync(getSacPrefPath(), JSON.stringify({ dismissed: true }), 'utf8');
  } catch (_) {}
}

/**
 * 스마트 앱 컨트롤 상태 반환: 'on' | 'eval' | 'off' | 'unsupported' | 'unknown'
 * HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy\VerifiedAndReputablePolicyState
 *   0 = 끔, 1 = 켬(차단 적용), 2 = 평가 모드(차단하지 않음)
 */
function getSmartAppControlState() {
  if (process.platform !== 'win32') return 'unsupported';
  try {
    const os = require('os');
    const build = parseInt(String(os.release()).split('.')[2] || '0', 10);
    if (build < 22000) return 'unsupported'; // Windows 10 이하
    const { execSync } = require('child_process');
    const out = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CI\\Policy" /v VerifiedAndReputablePolicyState',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, timeout: 5000 }
    );
    const m = out.match(/VerifiedAndReputablePolicyState\s+REG_DWORD\s+0x([0-9a-f]+)/i);
    if (!m) return 'unknown';
    const v = parseInt(m[1], 16);
    if (v === 1) return 'on';
    if (v === 2) return 'eval';
    if (v === 0) return 'off';
    return 'unknown';
  } catch (_) {
    return 'unknown';
  }
}

function openSmartAppControlSettings() {
  // Windows 보안 → 앱 및 브라우저 컨트롤 화면
  shell.openExternal('windowsdefender://appbrowser/').catch(() => {
    shell.openExternal('ms-settings:windowsdefender').catch(() => {});
  });
}

/**
 * 스마트 앱 컨트롤 안내창 표시
 * @param {'startup'|'blocked'} reason
 * @returns {Promise<'continue'|'quit'>}
 */
async function showSmartAppControlGuide(reason) {
  const parent = [mainWindow, loadingWindow].find(w => w && !w.isDestroyed()) || undefined;
  const isBlocked = reason === 'blocked';
  const opts = {
    type: 'warning',
    title: '스마트 앱 컨트롤 안내',
    message: isBlocked
      ? 'Windows 스마트 앱 컨트롤이 소리담의 AI 구성 요소를 차단했습니다.'
      : 'Windows 스마트 앱 컨트롤이 켜져 있습니다.',
    detail:
      (isBlocked
        ? '"[WinError 4551] 애플리케이션 제어 정책에서 이 파일을 차단했습니다" 오류는 ' +
          '스마트 앱 컨트롤이 AI 엔진(PyTorch 등) 파일 실행을 막아서 발생합니다.\n\n'
        : '스마트 앱 컨트롤이 켜져 있으면 AI 엔진(PyTorch 등) 파일이 차단되어 ' +
          '음성 생성 중 "[WinError 4551]" 오류가 발생할 수 있습니다.\n\n') +
      '해결 방법:\n' +
      '  1. 아래 [설정 열기]를 누릅니다.\n' +
      '  2. [스마트 앱 컨트롤 설정]에서 [끄기]를 선택합니다.\n' +
      '  3. 소리담을 다시 실행합니다.\n\n' +
      '⚠ 스마트 앱 컨트롤은 Windows 보안 기능입니다. Windows 버전에 따라 한 번 끄면 ' +
      'Windows를 재설치하기 전까지 다시 켤 수 없을 수 있으니, 신중히 결정해 주세요.',
    buttons: ['설정 열기', isBlocked ? '닫기' : '그대로 계속', '앱 종료'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  };
  if (!isBlocked) opts.checkboxLabel = '다시 표시하지 않기';

  const { response, checkboxChecked } = parent
    ? await dialog.showMessageBox(parent, opts)
    : await dialog.showMessageBox(opts);

  if (!isBlocked && checkboxChecked) setSacStartupGuideDismissed();
  if (response === 0) {
    openSmartAppControlSettings();
    return 'continue';
  }
  if (response === 2) return 'quit';
  return 'continue';
}

/** 파이썬 로그에서 WinError 4551 차단을 감지하면 1회 안내 */
function checkSacBlockInLog(logStr) {
  if (sacBlockGuideShown || process.platform !== 'win32') return;
  if (/WinError 4551|애플리케이션 제어 정책|Application Control policy has blocked/i.test(logStr)) {
    sacBlockGuideShown = true;
    showSmartAppControlGuide('blocked').then(r => { if (r === 'quit') app.quit(); });
  }
}

// ── Paths ─────────────────────────────────────────────────────────────────────
function getAppDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..');
}

function getDataDir() {
  const defaultDir = path.join(app.getPath('userData'), 'data');
  const fs = require('fs');
  const legacyDir = path.join(path.dirname(app.getPath('userData')), 'Sori-Dam', 'data');
  if (!fs.existsSync(defaultDir) && fs.existsSync(legacyDir)) {
    try {
      const targetUserData = app.getPath('userData');
      if (!fs.existsSync(targetUserData)) {
        fs.mkdirSync(targetUserData, { recursive: true });
      }
      fs.cpSync(legacyDir, defaultDir, { recursive: true });
      console.log(`[Migration] 기존 Sori-Dam 데이터(${legacyDir})를 신규 경로(${defaultDir})로 마이그레이션 완료`);
    } catch (e) {
      console.warn(`[Migration] 데이터 복사 실패, 레거시 경로 직접 사용: ${e.message}`);
      return legacyDir;
    }
  }
  return defaultDir;
}

// ── 내장형 포터블 파이썬 및 시스템 파이썬 탐색 경로 해상도 ────────────────────────────
function getPythonExecutablePath() {
  const isWin = process.platform === 'win32';
  
  // 1. 패키징 여부에 따라 내장 포터블 파이썬의 상대/절대 디렉터리 경로 계산
  const baseDir = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '..');

  let relativePath = '';
  if (isWin) {
    relativePath = 'bin/python-win/python.exe';
  } else {
    // macOS의 경우 아키텍처별 분기
    const arch = process.arch;
    if (arch === 'arm64') {
      relativePath = 'bin/python-mac-arm64/bin/python3';
    } else {
      relativePath = 'bin/python-mac-x64/bin/python3';
    }
  }

  const embeddedPath = path.join(baseDir, relativePath);
  const fs = require('fs');

  if (fs.existsSync(embeddedPath)) {
    console.log(`[Sori-Dam] 내장형 포터블 파이썬 발견: ${embeddedPath}`);
    
    // Windows 포터블 파이썬의 경우 패키지 설치 시 egg_info metadata generation CWD 임포트 문제 해결을 위한 패치 적용
    if (isWin) {
      try {
        const pythonDir = path.dirname(embeddedPath);
        
        // 1. python310._pth 파일에서 import site 활성화 및 Lib/site-packages 경로 보장
        const pthFile = path.join(pythonDir, 'python310._pth');
        if (fs.existsSync(pthFile)) {
          let pthContent = fs.readFileSync(pthFile, 'utf8');
          let modified = false;
          if (pthContent.includes('#import site')) {
            pthContent = pthContent.replace('#import site', 'import site');
            modified = true;
          }
          if (!pthContent.includes('Lib/site-packages') && !pthContent.includes('Lib\\site-packages')) {
            pthContent = 'Lib/site-packages\n' + pthContent;
            modified = true;
          }
          if (modified) {
            fs.writeFileSync(pthFile, pthContent, 'utf8');
            console.log(`[CwdPatch] python310._pth 내 site 및 Lib/site-packages 활성화 완료`);
          }
        }
        
        // 2. Lib/site-packages 디렉터리 내 CwdPatch.pth 생성
        const sitePackagesDir = path.join(pythonDir, 'Lib', 'site-packages');
        if (!fs.existsSync(sitePackagesDir)) {
          fs.mkdirSync(sitePackagesDir, { recursive: true });
        }
        const cwdPatchFile = path.join(sitePackagesDir, 'CwdPatch.pth');
        if (!fs.existsSync(cwdPatchFile)) {
          fs.writeFileSync(cwdPatchFile, "import sys; sys.path.insert(0, '')\n", 'utf8');
          console.log(`[CwdPatch] CWD 임포트 패치 파일 생성 완료: ${cwdPatchFile}`);
        }
      } catch (err) {
        console.error(`[CwdPatch] 패치 작업 실패: ${err.message}`);
      }
    }
    
    // macOS일 경우 포터블 파이썬 디렉터리의 격리 속성(Gatekeeper) 제거 및 실행 권한(chmod +x) 부여
    if (process.platform === 'darwin') {
      try {
        const { execSync } = require('child_process');
        // bin/python-mac-arm64 이나 bin/python-mac-x64 디렉터리의 최상위를 잡음
        const pythonDir = path.dirname(path.dirname(embeddedPath));
        if (fs.existsSync(pythonDir)) {
          console.log(`[Gatekeeper Bypass] 격리 해제 및 실행 권한 부여 시도: ${pythonDir}`);
          execSync(`xattr -cr "${pythonDir}"`);
          execSync(`chmod +x "${embeddedPath}"`);
          console.log(`[Gatekeeper Bypass] 해제 및 권한 부여 완료!`);
        }
      } catch (err) {
        console.error(`[Gatekeeper Bypass] 실패: ${err.message}`);
      }
    }
    
    return embeddedPath;
  }

  // 2. 내장 파이썬이 준비되지 않은 개발/테스트 단계 시 글로벌 시스템 파이썬 Fallback
  console.log(`[Sori-Dam] 내장형 포터블 파이썬이 없음. 시스템 파이썬으로 가동 시도.`);
  return isWin ? 'python' : 'python3';
}

// ── Python 서버 시작 ──────────────────────────────────────────────────────────
function spawnPython(appDir, dataDir) {
  return new Promise((resolve, reject) => {
    const pythonBin = getPythonExecutablePath();
    console.log(`[Sori-Dam] 실행할 파이썬 엔진: ${pythonBin}`);

    // PATH에 Homebrew 및 표준 시스템 바이너리 경로 추가
    const currentPath = process.env.PATH || '';
    const extraPaths = process.platform === 'win32'
      ? []
      : ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'];
    const mergedPath = [...extraPaths, currentPath].filter(Boolean).join(path.delimiter);

    const pythonUserBase = path.join(dataDir, 'python-user');
    const pythonUserSite = path.join(pythonUserBase, 'Python310', 'site-packages');
    try {
      if (!fs.existsSync(pythonUserSite)) {
        fs.mkdirSync(pythonUserSite, { recursive: true });
      }
    } catch (e) {
      console.warn('[Sori-Dam] python-user 디렉터리 생성 경고:', e.message);
    }

    const cleanEnv = { ...process.env };
    delete cleanEnv.PYTHONPATH;
    delete cleanEnv.PYTHONHOME;
    delete cleanEnv.PYTHONNOUSERSITE;

    const pythonArgs = ['-u', 'app.py'];
    const proc = spawn(pythonBin, pythonArgs, {
      cwd: appDir,
      env: { 
        ...cleanEnv, 
        PATH: mergedPath,
        VOXCPM_DATA_DIR: dataDir,
        PYTHONUSERBASE: pythonUserBase,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        PYTHONUNBUFFERED: '1',
        PIP_NO_WARN_SCRIPT_LOCATION: '1',
        PIP_DISABLE_PIP_VERSION_CHECK: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.on('error', err => {
      console.error(`[Sori-Dam] 파이썬 스폰 에러: ${err.message}`);
      reject(new Error(
        'Python 3을 시작할 수 없습니다.\n\n' +
        '포터블 환경 바이너리가 손상되었거나 누락되었습니다.\n' +
        'npm run setup:bin 을 먼저 실행했는지 확인하세요.'
      ));
    });

    proc.stdout.on('data', d => {
      const logStr = d.toString();
      process.stdout.write('[server] ' + logStr);
      checkSacBlockInLog(logStr);
      if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('server-log', logStr);
      }
    });
    proc.stderr.on('data', d => {
      const logStr = d.toString();
      process.stderr.write('[server] ' + logStr);
      checkSacBlockInLog(logStr);
      if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('server-log', logStr);
      }
    });

    proc.on('exit', code => {
      if (code && code !== 0 && code !== null) {
        console.error(`Python 프로세스 종료: ${code}`);
      }
    });

    pythonProcess = proc;
    resolve();
  });
}

function waitForServer(timeout = 1800000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let lastActivity = Date.now();

    const onData = () => {
      lastActivity = Date.now();
    };

    if (pythonProcess) {
      if (pythonProcess.stdout) pythonProcess.stdout.on('data', onData);
      if (pythonProcess.stderr) pythonProcess.stderr.on('data', onData);
    }

    const interval = setInterval(() => {
      // 파이썬 프로세스가 예기치 않게 종료되었는지 즉각 체크
      if (pythonProcess && (pythonProcess.exitCode !== null || pythonProcess.signalCode !== null)) {
        clearInterval(interval);
        reject(new Error(
          `파이썬 백엔드 프로세스가 기동 도중 강제 종료되었습니다. (종료 코드: ${pythonProcess.exitCode})\n\n` +
          '인터넷 연결 상태가 오프라인이거나 패키지 설치 도중 에러가 발생했을 수 있습니다.\n' +
          '로그 창의 오류 내용을 복사하여 원인을 확인해 주세요.'
        ));
        return;
      }

      const totalElapsed = Date.now() - start;
      const inactiveElapsed = Date.now() - lastActivity;

      // 전체 30분 초과 또는 활성 출력 없이 10분 이상 완전 멈춤 상태일 때만 타임아웃
      if (totalElapsed > timeout || inactiveElapsed > 600000) {
        clearInterval(interval);
        reject(new Error(
          '서버 시작 시간 초과 (30분).\n\n' +
          '최초 실행 시 필수 AI 가속 모듈(PyTorch)을 자동으로 준비하고 다운로드하는 데 네트워크 속도에 따라 시간이 소요될 수 있습니다.\n\n' +
          '인터넷 연결이 정상적인지 확인하신 후, 앱을 다시 켜주세요.'
        ));
        return;
      }
      http.get(SERVER_URL, () => {
        clearInterval(interval);
        resolve();
      }).on('error', () => {});
    }, 600);
  });
}

// ── 로딩 창 ──────────────────────────────────────────────────────────────────
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 560,
    height: 400,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
}

// ── 메인 창 ──────────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 16 } : undefined,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: '소리담(Sori-Dam)',
    show: false,
  });

  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false);
  }

  // 캐싱으로 인한 화면 미갱신 방지를 위해 세션 캐시 클리어 후 로드
  mainWindow.webContents.session.clearCache().then(() => {
    mainWindow.loadURL(SERVER_URL);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  // 외부 링크 및 window.open 호출 시 시스템 기본 웹 브라우저로 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('https:') || url.startsWith('http:'))) {
      shell.openExternal(url).catch(err => {
        console.error(`[OpenExternal Handler] 실패: ${err.message}`);
      });
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();

    // 윈도우가 보여진 후 버전 체크 시작 (1초 후 논블로킹 구동)
    setTimeout(() => {
      checkForUpdates(mainWindow);
    }, 1500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── 깃허브 버전 체크 & 소수 변환 알고리즘 ───────────────────────────────────────
function parseVersionToFloat(versionStr) {
  // 'v1.0.0' or '1.2.3-beta' -> '1.2.3'
  let clean = versionStr.replace(/[^0-9\.]/g, '').trim();
  let parts = clean.split('.');
  
  let major = parseInt(parts[0]) || 0;
  let minor = parseInt(parts[1]) || 0;
  let patch = parseInt(parts[2]) || 0;

  // 1.0.0 -> 1.00, 1.2.3 -> 1.23, 2.15.4 -> 2.154 등
  // 소수로 계산하여 값을 안전하게 크기 비교할 수 있도록 소수 포맷 변환
  // patch가 2자리 이상일 때를 대비해 나누기 100을 기본으로 계산
  let decimal = minor * 0.1 + patch * 0.01;
  return major + decimal;
}

function checkForUpdates(win) {
  const currentVersion = app.getVersion(); // package.json의 version (1.1.0)
  console.log(`[Sori-Dam UpdateChecker] 현재 버전: ${currentVersion}`);

  const https = require('https');
  const options = {
    hostname: 'api.github.com',
    path: '/repos/creatorjosephkr/sori-dam/releases/latest',
    method: 'GET',
    headers: {
      'User-Agent': 'Sori-Dam-Electron-App'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        if (res.statusCode === 200) {
          const release = JSON.parse(data);
          const latestTag = release.tag_name || ''; // e.g., 'v1.1.0'
          if (!latestTag) return;

          const currentFloat = parseVersionToFloat(currentVersion);
          const latestFloat = parseVersionToFloat(latestTag);

          console.log(`[Sori-Dam UpdateChecker] 최신 버전: ${latestTag} (Parsed: ${latestFloat} vs Current: ${currentFloat})`);

          if (latestFloat > currentFloat) {
            console.log('[Sori-Dam UpdateChecker] 업데이트 발견!');
            win.webContents.send('update-available', {
              currentVersion,
              latestVersion: latestTag.replace(/^v/, ''),
              htmlUrl: release.html_url || 'https://github.com/creatorjosephkr/sori-dam/releases',
              body: release.body || ''
            });
          }
        }
      } catch (err) {
        console.error('[Sori-Dam UpdateChecker] JSON 파싱 에러:', err.message);
      }
    });
  });

  req.on('error', (err) => {
    console.error('[Sori-Dam UpdateChecker] 요청 실패:', err.message);
  });

  req.end();
}

// ── 앱 생명주기 ───────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createLoadingWindow();

  // Windows 11 스마트 앱 컨트롤이 켜져 있으면 기동 전에 안내
  if (getSmartAppControlState() === 'on' && !isSacStartupGuideDismissed()) {
    const choice = await showSmartAppControlGuide('startup');
    if (choice === 'quit') {
      app.quit();
      return;
    }
  }

  try {
    const appDir = getAppDir();
    const dataDir = getDataDir();

    await spawnPython(appDir, dataDir);
    await waitForServer();
    createMainWindow();
  } catch (err) {
    console.error(`[Sori-Dam] 시작 에러 발생: ${err.message}`);
    // Native 모달 대화상자 대신, 로딩 창 내부에 오류를 스트리밍해 주어 
    // 사용자가 백그라운드 스레드 차단 없이 편안하게 로그를 복사 및 탐색할 수 있도록 처리합니다.
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.send('server-error', err.message);
    } else {
      dialog.showErrorBox('VoxCPM2 시작 오류', err.message);
      app.quit();
    }
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (!mainWindow && pythonProcess) createMainWindow();
});

ipcMain.on('app-quit', () => app.quit());

ipcMain.on('open-external', (_, url) => {
  if (url && typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    console.log(`[OpenExternal] 기본 브라우저에서 열기: ${url}`);
    shell.openExternal(url).catch(err => {
      console.error(`[OpenExternal] 실패: ${err.message}`);
    });
  }
});

ipcMain.on('set-height', (_, contentH) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized() || mainWindow.isFullScreen()) return;
  const bounds = mainWindow.getBounds();
  const workH = screen.getDisplayMatching(bounds).workArea.height;
  const newH = Math.max(480, Math.min(Math.ceil(contentH), Math.floor(workH * 0.92)));
  const [, currentContentH] = mainWindow.getContentSize();
  if (Math.abs(currentContentH - newH) <= 1) return;
  const frameH = Math.max(0, bounds.height - currentContentH);
  mainWindow.setBounds({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: newH + frameH,
  });
});

app.on('before-quit', () => {
  if (pythonProcess) {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /PID ${pythonProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        pythonProcess.kill('SIGKILL');
      }
    } catch (_) {}
    pythonProcess = null;
  }
});
