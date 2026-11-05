'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');

const TARGETS = {
  win: {
    name: 'Windows x64 Embedded Python',
    url: 'https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip',
    testFile: path.join(BIN_DIR, 'python-win', 'python.exe'),
    destDir: path.join(BIN_DIR, 'python-win'),
    type: 'zip',
  },
  macArm64: {
    name: 'macOS Apple Silicon (arm64) Portable Python',
    url: 'https://github.com/indygreg/python-build-standalone/releases/download/20230507/cpython-3.10.11+20230507-aarch64-apple-darwin-install_only.tar.gz',
    testFile: path.join(BIN_DIR, 'python-mac-arm64', 'bin', 'python3'),
    destDir: path.join(BIN_DIR, 'python-mac-arm64'),
    type: 'tar.gz',
  },
  macX64: {
    name: 'macOS Intel (x64) Portable Python',
    url: 'https://github.com/indygreg/python-build-standalone/releases/download/20230507/cpython-3.10.11+20230507-x86_64-apple-darwin-install_only.tar.gz',
    testFile: path.join(BIN_DIR, 'python-mac-x64', 'bin', 'python3'),
    destDir: path.join(BIN_DIR, 'python-mac-x64'),
    type: 'tar.gz',
  },
};

function setup() {
  console.log('=== [Sori-Dam] 크로스 플랫폼 포터블 파이썬 환경 구축 시작 ===\n');

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
    console.log(`[폴더 생성] ${BIN_DIR}`);
  }

  for (const [key, t] of Object.entries(TARGETS)) {
    console.log(`\n👉 작업 대상: ${t.name}`);

    // 캐싱 확인
    if (fs.existsSync(t.testFile)) {
      console.log(`   [SKIP] 이미 파이썬 바이너리가 준비되어 있습니다: ${t.testFile}`);
      if (key === 'win') {
        console.log('   🔧 Windows 임베디드 파이썬 패치 상태 강제 점검 및 보완...');
        patchWindowsPython(t.destDir);
      }
      continue;
    }

    // 대상 디렉터리가 구 찌꺼기가 있는 경우 정리
    if (fs.existsSync(t.destDir)) {
      console.log(`   [정리] 기존 디렉터리 제거 중: ${t.destDir}`);
      fs.rmSync(t.destDir, { recursive: true, force: true });
    }

    const tempFile = path.join(BIN_DIR, `temp_${key}.${t.type === 'zip' ? 'zip' : 'tar.gz'}`);

    try {
      // 1. 다운로드 (curl)
      console.log(`   [1/3] 다운로드 중... (URL: ${t.url})`);
      execSync(`curl -L "${t.url}" -o "${tempFile}"`, { stdio: 'inherit' });

      // 2. 압축 해제
      console.log(`   [2/3] 압축 해제 중...`);
      if (t.type === 'zip') {
        fs.mkdirSync(t.destDir, { recursive: true });
        execSync(`unzip -q "${tempFile}" -d "${t.destDir}"`);
      } else {
        // tar.gz 해제
        execSync(`tar -xzf "${tempFile}" -C "${BIN_DIR}"`);
        // indygreg 패키지는 압축 해제 시 'python' 이라는 최상위 디렉터리가 생성됨
        const extractedPythonDir = path.join(BIN_DIR, 'python');
        if (fs.existsSync(extractedPythonDir)) {
          fs.renameSync(extractedPythonDir, t.destDir);
        } else {
          throw new Error('압축 파일 내에서 python 디렉터리를 찾을 수 없습니다.');
        }
      }

      // 3. 임시 파일 제거
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      console.log(`   [3/3] 포터블 파이썬 설치 완료: ${t.destDir}`);

      // Windows의 경우 pip 사용을 위한 패치 적용
      if (key === 'win') {
        patchWindowsPython(t.destDir);
      }

    } catch (err) {
      console.error(`❌ [오류 발생] ${t.name} 구축 실패:`, err.message);
      // 복구용 청소
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      process.exit(1);
    }
  }

  console.log('\n✨ [Sori-Dam] 모든 플랫폼의 포터블 파이썬 환경 구축 성공!');
}

function patchWindowsPython(winDir) {
  // python310._pth 파일 패치하여 pip 사이트 라이브러리 정상 로드 허용
  const pthFile = path.join(winDir, 'python310._pth');
  if (fs.existsSync(pthFile)) {
    console.log('   🔧 Windows 임베디드 파이썬 pip 패치 적용 중...');
    let content = fs.readFileSync(pthFile, 'utf8');
    // #import site -> import site로 주석 해제
    if (content.includes('#import site')) {
      content = content.replace('#import site', 'import site');
      console.log('      [완료] #import site 주석 해제 완료.');
    } else if (!content.includes('import site')) {
      content += '\nimport site\n';
      console.log('      [완료] import site 라인 추가 완료.');
    }
    if (!content.includes('Lib/site-packages') && !content.includes('Lib\\site-packages')) {
      content = 'Lib/site-packages\n' + content;
      console.log('      [완료] Lib/site-packages 경로 추가 완료.');
    }
    fs.writeFileSync(pthFile, content, 'utf8');
  }

  // ── Windows Embedded Python 용 pip 모듈 수동 셋업 (macOS 크로스 컴파일 호환) ────────────────
  console.log('   📦 Windows 임베디드 파이썬 전용 pip 라이브러리 수동 이식 중...');
  const sitePackagesDir = path.join(winDir, 'Lib', 'site-packages');
  if (!fs.existsSync(sitePackagesDir)) {
    fs.mkdirSync(sitePackagesDir, { recursive: true });
  }

  const PIP_WHEELS = {
    pip: 'https://files.pythonhosted.org/packages/py3/p/pip/pip-24.0-py3-none-any.whl',
    setuptools: 'https://files.pythonhosted.org/packages/py3/s/setuptools/setuptools-69.5.1-py3-none-any.whl',
    wheel: 'https://files.pythonhosted.org/packages/py3/w/wheel/wheel-0.43.0-py3-none-any.whl'
  };

  for (const [name, url] of Object.entries(PIP_WHEELS)) {
    const tempWhl = path.join(winDir, `temp_${name}.zip`);
    try {
      console.log(`      [다운로드] ${name} 라이브러리 받는 중...`);
      execSync(`curl -L "${url}" -o "${tempWhl}"`);
      
      console.log(`      [이식] ${name} 패키지 해제 주입 중...`);
      // .whl 파일은 실제 zip 이므로 unzip으로 site-packages에 압축을 풉니다
      execSync(`unzip -q -o "${tempWhl}" -d "${sitePackagesDir}"`);
    } catch (err) {
      console.error(`      ❌ [경고] ${name} 패키지 수동 이식 실패:`, err.message);
    } finally {
      if (fs.existsSync(tempWhl)) {
        fs.unlinkSync(tempWhl);
      }
    }
  }
  
  // 현재 작업 디렉터리(CWD) 임포트 허용 패치 추가
  try {
    const cwdPatchFile = path.join(sitePackagesDir, 'CwdPatch.pth');
    fs.writeFileSync(cwdPatchFile, "import sys; sys.path.insert(0, '')\n", 'utf8');
    console.log('      [완료] 현재 작업 디렉터리(CWD) 임포트 허용 패치 추가 완료.');
  } catch (err) {
    console.error('      ❌ [경고] CwdPatch.pth 생성 실패:', err.message);
  }

  // ── Windows Embedded Python 용 필수 라이브러리(VoxCPM 및 FastAPI 등) 사전 번들링 ──
  const voxcpmMarker = path.join(sitePackagesDir, 'voxcpm');
  if (!fs.existsSync(voxcpmMarker)) {
    console.log('   📦 Windows 환경용 필수 의존성 라이브러리(VoxCPM/FastAPI 등) 사전 번들링 진행 중...');
    const hostPython = path.join(BIN_DIR, 'python-mac-arm64', 'bin', 'python3');
    const pythonCmd = fs.existsSync(hostPython) ? hostPython : 'python3';
    try {
      execSync(
        `"${pythonCmd}" -m pip install --target "${sitePackagesDir}" --platform win_amd64 --python-version 310 --only-binary=:all: ` +
        `fastapi uvicorn python-multipart soundfile numpy deep-translator yt-dlp transformers sentencepiece safetensors einops pydantic tqdm huggingface-hub wetext inflect librosa sympy==1.14.0 mpmath networkx jinja2 MarkupSafe`,
        { stdio: 'inherit' }
      );
      const macVoxcpm = path.join(BIN_DIR, 'python-mac-arm64', 'lib', 'python3.10', 'site-packages', 'voxcpm');
      if (fs.existsSync(macVoxcpm)) {
        console.log('      [이식] 검증된 VoxCPM 패키지 동기화 중...');
        execSync(`cp -R "${macVoxcpm}" "${sitePackagesDir}/"`);
        execSync(`find "${path.join(sitePackagesDir, 'voxcpm')}" -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true`);
      }
      const voxcpm2File = path.join(sitePackagesDir, 'voxcpm', 'model', 'voxcpm2.py');
      if (fs.existsSync(voxcpm2File)) {
        let v2Code = fs.readFileSync(voxcpm2File, 'utf8');
        v2Code = v2Code.replace(/^import librosa$/m, '# import librosa');
        fs.writeFileSync(voxcpm2File, v2Code, 'utf8');
      }
      console.log('      [성공] Windows 필수 의존성 및 VoxCPM 사전 번들링 완료!');
    } catch (e) {
      console.warn('      ⚠️ Windows 사전 번들링 경고 (런타임 설치로 자동 대체됨):', e.message);
    }
  }
  
  console.log('      [성공] 윈도우용 내장 pip/setuptools/wheel 라이브러리 이식 완료!');
}

setup();
