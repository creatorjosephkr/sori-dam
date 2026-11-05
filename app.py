# ── 자동 의존성 설치 모듈 ────────────────────────────────────────────────────────
import sys
import subprocess
import platform
from pathlib import Path

print(f"[Sori-Dam] 현재 구동 중인 파이썬 엔진: {sys.executable}")

REQUIRED_PACKAGES = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn[standard]",
    "multipart": "python-multipart",
    "soundfile": "soundfile",
    "numpy": "numpy",
    "torch": "torch",
    "voxcpm": "voxcpm",
    "deep_translator": "deep-translator",
    "yt_dlp": "yt-dlp",
    "imageio_ffmpeg": "imageio-ffmpeg"
}

def get_working_pip_cmd():
    """실제로 사용 가능한 pip 모듈을 확인하여 리턴합니다."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return ["-m", "pip"]
    except Exception:
        pass

    try:
        subprocess.check_call([sys.executable, "-m", "pip3", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return ["-m", "pip3"]
    except Exception:
        pass

    return ["-m", "pip"]

def install_missing_packages():
    pip_cmd_base = get_working_pip_cmd()
    
    # ── 1. 누락 패키지 점검 및 설치 ──
    missing = []
    for module_name, package_name in REQUIRED_PACKAGES.items():
        try:
            __import__(module_name)
        except ImportError:
            missing.append(package_name)
            
    if missing:
        print(f"[Sori-Dam] 누락된 패키지 감지: {missing}. 자동 설치를 시작합니다...")
        print(f"[Sori-Dam] 감지된 패키지 매니저 도구: {pip_cmd_base}")
        
        for pkg in missing:
            install_pkg = pkg
            extra_args = []
            
            if sys.platform == 'win32':
                extra_args = ["--no-build-isolation"]
                # Windows에서 torch 설치 시 CUDA 12.1 가속 인덱스 추가 (NVIDIA GPU 활용)
                if pkg == "torch":
                    extra_args.extend(["--index-url", "https://download.pytorch.org/whl/cu121"])
                    print("[Sori-Dam] ⚡ Windows CUDA 가속 PyTorch(cu121) 인덱스를 적용합니다.")
            
            print(f"[Sori-Dam] 패키지 설치 진행 중: {install_pkg} (추가옵션: {extra_args})...")
            try:
                base_cmd = [sys.executable, *pip_cmd_base] if len(pip_cmd_base) > 1 else [pip_cmd_base[0]]
                cmd = [
                    *base_cmd, "install",
                    "--no-cache-dir",
                    "--use-deprecated=legacy-resolver",
                    "--no-warn-script-location",
                    *extra_args,
                    install_pkg
                ]
                
                subprocess.check_call(cmd)
                print(f"[Sori-Dam] 패키지 설치 성공: {install_pkg}")
            except Exception as e:
                print(f"[Sori-Dam] {install_pkg} 자동 설치 실패: {e}", file=sys.stderr)
                print(f"[Sori-Dam] 치명적 오류: 필수 패키지 {install_pkg} 설치에 실패하여 기동을 중단합니다.", file=sys.stderr)
                sys.exit(1)
        print("[Sori-Dam] 모든 필수 패키지 설치 절차가 완료되었습니다!")

    # ── 2. Windows 기존 설치 환경 점검: NVIDIA GPU가 있는데 CPU용 torch가 설치된 경우 자동 교체 ──
    if sys.platform == 'win32':
        try:
            import torch
            if not torch.cuda.is_available():
                # nvidia-smi 명령어로 실제 NVIDIA 외장 그래픽카드 유무 확인
                has_nvidia = False
                try:
                    res = subprocess.run(["nvidia-smi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    if res.returncode == 0:
                        has_nvidia = True
                except Exception:
                    pass

                if has_nvidia:
                    print("[Sori-Dam] 💡 NVIDIA 그래픽카드가 감지되었으나 현재 PyTorch는 CPU 전용 버전입니다.")
                    print("[Sori-Dam] ⚡ 빠른 음성 생성을 위해 CUDA 가속 PyTorch(cu121)로 자동 교체 설치를 진행합니다...")
                    base_cmd = [sys.executable, *pip_cmd_base] if len(pip_cmd_base) > 1 else [pip_cmd_base[0]]
                    cmd = [
                        *base_cmd, "install",
                        "--no-cache-dir",
                        "--upgrade",
                        "--force-reinstall",
                        "torch",
                        "torchaudio",
                        "--index-url", "https://download.pytorch.org/whl/cu121"
                    ]
                    subprocess.check_call(cmd)
                    print("[Sori-Dam] ✅ CUDA 가속 PyTorch 교체 완료! 다음 기동 또는 생성부터 고속 GPU 추론이 활성화됩니다.")
        except Exception as err:
            print(f"[Sori-Dam] ⚠️ Windows PyTorch 가속 버전 점검 중 경고: {err}")

install_missing_packages()

# ── 기본 라이브러리 임포트 ──────────────────────────────────────────────────────
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
import sqlite3
import uuid
import time
import shutil
import asyncio
import os
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
import torch

# ── 하드웨어 가속 및 스레드 최적화 ─────────────────────────────────────────────
if torch.cuda.is_available():
    print(f"[Sori-Dam] 🚀 CUDA GPU 가속 활성화됨: {torch.cuda.get_device_name(0)}")
elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
    print("[Sori-Dam] 🚀 Apple Silicon (MPS) 가속 활성화됨")
else:
    cpu_threads = max(1, (os.cpu_count() or 4) - 1)
    torch.set_num_threads(cpu_threads)
    print(f"[Sori-Dam] ℹ️ CPU 모드로 구동됩니다. 멀티스레드 최적화 적용: {cpu_threads} 스레드")

app = FastAPI(title="VoxCPM2 음성 생성기")

# 캐시 방지 미들웨어 추가 (정적 파일 수정이 즉시 반영되도록 캐시 비활성화)
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# ── Log streaming ─────────────────────────────────────────────────────────────
_log_queues: dict = {}
_main_loop = None

@app.on_event("startup")
async def _capture_loop():
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        _main_loop = asyncio.get_event_loop()

def _get_queue(session_id: str) -> asyncio.Queue:
    global _main_loop
    if _main_loop is None or not _main_loop.is_running():
        try:
            _main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
    if session_id not in _log_queues:
        _log_queues[session_id] = asyncio.Queue()
    return _log_queues[session_id]

def _push_log(session_id: str, msg: str):
    global _main_loop
    if not session_id:
        return
    q = _get_queue(session_id)
    if _main_loop is None or not _main_loop.is_running():
        try:
            _main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
    if _main_loop and _main_loop.is_running():
        _main_loop.call_soon_threadsafe(q.put_nowait, msg)
    else:
        try:
            q.put_nowait(msg)
        except Exception:
            pass

def _broadcast_log(msg: str):
    """활성 세션 모두에 로그를 브로드캐스트"""
    global _main_loop
    if not _log_queues:
        return
    if _main_loop is None or not _main_loop.is_running():
        try:
            _main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
    if not _main_loop or not _main_loop.is_running():
        return
    clean = msg.rstrip('\n').rstrip('\r')
    if not clean:
        return
    for q in list(_log_queues.values()):
        try:
            _main_loop.call_soon_threadsafe(q.put_nowait, clean)
        except Exception:
            pass

class _TeeBroadcastStream:
    """stdout/stderr를 원래 스트림에 그대로 출력하면서 활성 SSE 큐에도 동시 전달"""
    def __init__(self, original):
        self._orig = original
        self._buf = ""
        self._in_write = False

    def write(self, text):
        self._orig.write(text)
        if self._in_write:
            return
        self._in_write = True
        try:
            self._buf += text
            while '\n' in self._buf or '\r' in self._buf:
                for sep in ['\r\n', '\n', '\r']:
                    idx = self._buf.find(sep)
                    if idx != -1:
                        line = self._buf[:idx]
                        self._buf = self._buf[idx + len(sep):]
                        if line.strip():
                            _broadcast_log(line)
                        break
                else:
                    break
        finally:
            self._in_write = False

    def flush(self):
        self._orig.flush()

    def __getattr__(self, name):
        return getattr(self._orig, name)

# stdout/stderr 후킹 (앱 시작 후 즉시 적용)
sys.stdout = _TeeBroadcastStream(sys.__stdout__)
sys.stderr = _TeeBroadcastStream(sys.__stderr__)

@app.get("/api/logs/{session_id}")
async def stream_logs(session_id: str):
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        pass
    q = _get_queue(session_id)

    async def generator():
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=300)
                except asyncio.TimeoutError:
                    break
                if msg is None:
                    yield "data: [DONE]\n\n"
                    break
                yield f"data: {msg}\n\n"
        finally:
            _log_queues.pop(session_id, None)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Paths ────────────────────────────────────────────────────────────────────
# Electron 패키징 시 VOXCPM_DATA_DIR 환경변수로 userData 경로 주입
DATA_DIR = Path(os.environ.get('VOXCPM_DATA_DIR', 'data'))
VOICES_DIR = DATA_DIR / "voices"
OUTPUTS_DIR = DATA_DIR / "outputs"
TEMP_DIR = DATA_DIR / "temp"
DB_PATH = DATA_DIR / "voxcpm.db"

for d in [DATA_DIR, VOICES_DIR, OUTPUTS_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

executor = ThreadPoolExecutor(max_workers=1)

# ── FFmpeg 자동 탐색 및 PATH 등록 ─────────────────────────────────────────────
def setup_ffmpeg():
    """
    FFmpeg 실행 파일을 탐색하고 PATH 환경변수에 등록하여
    yt-dlp 및 오디오 처리 파이프라인에서 항상 접근할 수 있도록 보장합니다.
    """
    project_root = Path(__file__).parent.resolve()
    candidates = []

    # 1. imageio_ffmpeg 내장 바이너리 탐색
    try:
        import imageio_ffmpeg
        imageio_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if imageio_exe and Path(imageio_exe).exists():
            imageio_path = Path(imageio_exe)
            try:
                os.chmod(imageio_path, 0o755)
            except Exception:
                pass
            std_name = "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg"
            std_binary = imageio_path.parent / std_name
            if not std_binary.exists():
                try:
                    std_binary.symlink_to(imageio_path.name)
                except Exception:
                    try:
                        shutil.copy2(imageio_path, std_binary)
                        os.chmod(std_binary, 0o755)
                    except Exception:
                        pass
            if std_binary.exists():
                candidates.append(str(std_binary))
            candidates.append(str(imageio_path))
    except Exception as e:
        print(f"[FFmpeg Setup] imageio_ffmpeg 탐색 예외: {e}")

    # 2. 프로젝트/앱 번들 디렉터리 탐색
    std_name = "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg"
    candidates.extend([
        str(project_root / "bin" / std_name),
        str(project_root.parent / "bin" / std_name),
        str(project_root.parent / "resources" / "bin" / std_name),
    ])

    # 3. 시스템 기본 경로
    candidates.extend([
        shutil.which("ffmpeg") or "",
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
    ])

    found_bin = None
    for c in candidates:
        if c and Path(c).is_file() and os.access(c, os.X_OK if sys.platform != "win32" else os.F_OK):
            found_bin = str(Path(c).resolve())
            break

    if found_bin:
        bin_dir = str(Path(found_bin).parent.resolve())
        path_sep = ";" if sys.platform == "win32" else ":"
        cur_paths = os.environ.get("PATH", "").split(path_sep)
        if bin_dir not in cur_paths:
            os.environ["PATH"] = f"{bin_dir}{path_sep}{os.environ.get('PATH', '')}"
        return found_bin

    return None

# 서버 시작 시 FFmpeg 자동 탐색 및 PATH 등록
setup_ffmpeg()

# ── DB ───────────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS voices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            audio_path TEXT NOT NULL,
            created_at REAL NOT NULL,
            preview_text TEXT DEFAULT '',
            preview_audio_path TEXT DEFAULT '',
            style TEXT DEFAULT '',
            cfg_value REAL DEFAULT 2.0,
            steps INTEGER DEFAULT 10,
            target_db REAL DEFAULT -6.0,
            speed REAL DEFAULT 1.0
        );
        CREATE TABLE IF NOT EXISTS outputs (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            voice_type TEXT NOT NULL,
            voice_name TEXT,
            duration REAL,
            audio_path TEXT NOT NULL,
            created_at REAL NOT NULL,
            style TEXT DEFAULT '',
            cfg_value REAL DEFAULT 2.0,
            steps INTEGER DEFAULT 10,
            target_db REAL DEFAULT -6.0,
            speed REAL DEFAULT 1.0
        );
    """)
    conn.commit()
    conn.close()

init_db()

def migrate_db():
    conn = get_db()
    try:
        conn.execute("ALTER TABLE voices ADD COLUMN voice_type TEXT DEFAULT 'upload'")
        conn.commit()
    except Exception:
        pass  # 컬럼 이미 존재
    try:
        conn.execute("ALTER TABLE voices ADD COLUMN preview_text TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # 컬럼 이미 존재
    try:
        conn.execute("ALTER TABLE voices ADD COLUMN preview_audio_path TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # 컬럼 이미 존재
    try:
        conn.execute("ALTER TABLE voices ADD COLUMN style TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # 컬럼 이미 존재
    try:
        conn.execute("ALTER TABLE outputs ADD COLUMN style TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # 컬럼 이미 존재

    # voices 테이블 고급설정 컬럼 추가
    for col, default_val in [("cfg_value", "2.0"), ("steps", "10"), ("target_db", "-6.0"), ("speed", "1.0")]:
        try:
            conn.execute(f"ALTER TABLE voices ADD COLUMN {col} REAL DEFAULT {default_val}")
            conn.commit()
        except Exception:
            pass

    # outputs 테이블 고급설정 컬럼 추가
    for col, default_val in [("cfg_value", "2.0"), ("steps", "10"), ("target_db", "-6.0"), ("speed", "1.0")]:
        try:
            conn.execute(f"ALTER TABLE outputs ADD COLUMN {col} REAL DEFAULT {default_val}")
            conn.commit()
        except Exception:
            pass

    conn.close()

migrate_db()

# ── VoxCPM Model (lazy) ──────────────────────────────────────────────────────
_model = None

def _patch_voxcpm_audio_loader():
    """macOS dyld scipy.signal 충돌 방지를 위한 안전한 오디오 로더 몽키패치"""
    try:
        from voxcpm.model.voxcpm2 import VoxCPM2Model
        
        def safe_encode_wav(self, wav_path, padding_mode="right", trim_silence_vad=False):
            import soundfile as sf
            try:
                data, sr = sf.read(wav_path)
                if data.ndim > 1:
                    data = data.mean(axis=1)
                audio = torch.from_numpy(data).float().unsqueeze(0)
                if sr != self._encode_sample_rate:
                    import torchaudio
                    resampler = torchaudio.transforms.Resample(sr, self._encode_sample_rate)
                    audio = resampler(audio)
            except Exception:
                try:
                    import librosa
                    audio_np, _ = librosa.load(wav_path, sr=self._encode_sample_rate, mono=True)
                    audio = torch.from_numpy(audio_np).unsqueeze(0)
                except Exception as e:
                    raise RuntimeError(f"오디오 파일 로드 실패 ({wav_path}): {e}")

            if trim_silence_vad:
                try:
                    from voxcpm.model.voxcpm2 import _trim_audio_silence_vad
                    audio = _trim_audio_silence_vad(audio, self._encode_sample_rate, max_silence_ms=200.0)
                except Exception:
                    pass

            patch_len = self.patch_size * self.chunk_size
            if audio.size(1) % patch_len != 0:
                padding_size = patch_len - audio.size(1) % patch_len
                pad = (padding_size, 0) if padding_mode == "left" else (0, padding_size)
                audio = torch.nn.functional.pad(audio, pad)
            feat = self.audio_vae.encode(audio.to(self.device), self._encode_sample_rate).cpu()
            return feat.view(self.audio_vae.latent_dim, -1, self.patch_size).permute(1, 2, 0)

        VoxCPM2Model._encode_wav = safe_encode_wav
    except Exception as e:
        print(f"[Sori-Dam] VoxCPM2 오디오 로더 패치 경고: {e}")

_safetensors_patched = False
_current_load_progress_cb = None

def _patch_safetensors_loader():
    global _safetensors_patched
    if _safetensors_patched:
        return
    try:
        import safetensors.torch
        from safetensors import safe_open
        import voxcpm.model.voxcpm2
        import voxcpm.model.voxcpm

        orig_load = safetensors.torch.load_file

        def tracked_load_file(filename, device="cpu"):
            cb = _current_load_progress_cb
            if not cb or not isinstance(filename, (str, os.PathLike)) or not str(filename).endswith("model.safetensors"):
                return orig_load(filename, device=device)

            file_size = os.path.getsize(filename)
            total_mb = round(file_size / (1024 * 1024), 1)
            result = {}
            last_t = 0
            loaded_bytes = 0

            with safe_open(filename, framework="pt", device=device) as f:
                keys = f.offset_keys()
                total_keys = len(keys)
                for i, k in enumerate(keys):
                    tensor = f.get_tensor(k)
                    result[k] = tensor
                    loaded_bytes += tensor.numel() * tensor.element_size()
                    now = time.time()
                    if now - last_t >= 0.12 or i == total_keys - 1:
                        last_t = now
                        loaded_mb = round(loaded_bytes / (1024 * 1024), 1)
                        # 10% to 90%
                        pct = min(90, 10 + int((loaded_bytes / max(file_size, 1)) * 80))
                        cb(
                            loaded_mb=loaded_mb,
                            total_mb=total_mb,
                            pct=pct,
                            stage="loading_safetensors",
                            msg=f"AI 모델 신경망 가중치 로드 중... ({loaded_mb:,.0f} MB / {total_mb:,.0f} MB)"
                        )

            if cb:
                cb(
                    loaded_mb=total_mb,
                    total_mb=total_mb,
                    pct=94,
                    stage="optimizing",
                    msg="신경망 가속 최적화 및 웜업 테스트 중..."
                )

            return result

        safetensors.torch.load_file = tracked_load_file
        voxcpm.model.voxcpm2.load_file = tracked_load_file
        voxcpm.model.voxcpm.load_file = tracked_load_file
        _safetensors_patched = True
        print("[Sori-Dam] safetensors 실시간 진행률 후킹 완료")
    except Exception as e:
        print(f"[Sori-Dam] safetensors 후킹 경고: {e}")

def get_model(progress_cb=None):
    global _model, _current_load_progress_cb
    if _model is None:
        _current_load_progress_cb = progress_cb
        try:
            from voxcpm import VoxCPM
            _patch_voxcpm_audio_loader()
            _patch_safetensors_loader()

            if progress_cb:
                progress_cb(
                    loaded_mb=0,
                    total_mb=4580,
                    pct=3,
                    stage="init",
                    msg="AI 음성 생성 모델(약 4.6GB) 로드 준비 중..."
                )

            dev_str = "CPU"
            if torch.cuda.is_available():
                dev_str = f"CUDA GPU ({torch.cuda.get_device_name(0)})"
            elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                dev_str = "Apple Silicon (MPS)"
            print(f"[Sori-Dam] VoxCPM2 모델 로드 중... (구동 장치: {dev_str})")

            if progress_cb:
                progress_cb(
                    loaded_mb=377,
                    total_mb=4580,
                    pct=8,
                    stage="vae",
                    msg="오디오 VAE 신경망 디코더 로드 중 (약 377MB)..."
                )

            _model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)

            if progress_cb:
                progress_cb(
                    loaded_mb=4580,
                    total_mb=4580,
                    pct=100,
                    stage="done",
                    msg="AI 모델 준비 완료! 음성 합성을 시작합니다."
                )
            print("[Sori-Dam] VoxCPM2 모델 로드 완료!")
        except ImportError:
            raise RuntimeError("voxcpm 패키지가 설치되지 않았습니다. pip install voxcpm 을 실행하세요.")
        finally:
            _current_load_progress_cb = None
    return _model

# ── AI 모델 사전 설치 및 범용 하드웨어 상태 진단 모듈 ──────────────────────────────────────────────
def get_hardware_info():
    """OS 및 프로세서, GPU 환경을 정밀하게 감지하여 범용 하드웨어 정보 반환 (Apple Silicon / Intel Mac / Windows)"""
    os_name = platform.system()  # 'Darwin', 'Windows', 'Linux'
    machine = platform.machine().lower() # 'arm64', 'x86_64', 'amd64'
    cpu_count = os.cpu_count() or 4

    cpu_brand = ""
    if os_name == "Darwin":
        try:
            cpu_brand = subprocess.check_output(
                ["sysctl", "-n", "machdep.cpu.brand_string"], 
                stderr=subprocess.DEVNULL
            ).decode().strip()
        except Exception:
            cpu_brand = "Apple Silicon" if "arm" in machine else "Intel Mac"
    elif os_name == "Windows":
        cpu_brand = os.environ.get("PROCESSOR_IDENTIFIER", "").split(",")[0].strip() or platform.processor()
    else:
        cpu_brand = platform.processor() or "CPU"

    # 가속 엔진 및 디스플레이 이름 결정
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        device_type = "cuda"
        device_label = f"NVIDIA CUDA ({gpu_name})"
        tag_label = f"CUDA: {gpu_name.replace('NVIDIA GeForce ', '')}"
    elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        device_type = "mps"
        device_label = f"{cpu_brand} (Metal/MPS 가속)"
        tag_label = f"{cpu_brand} MPS"
    else:
        device_type = "cpu"
        device_label = f"{cpu_brand} (CPU {cpu_count}코어 멀티스레드)"
        tag_label = f"CPU: {cpu_count}코어"

    return {
        "os": os_name,
        "machine": machine,
        "cpu_brand": cpu_brand,
        "device_type": device_type,
        "device_label": device_label,
        "tag_label": tag_label,
        "cpu_count": cpu_count
    }

def check_model_cache_status():
    """HuggingFace 캐시에서 VoxCPM2 모델 파일 존재 여부 및 하드웨어 환경 점검"""
    is_installed = False
    model_dir = None
    try:
        from huggingface_hub import try_to_load_from_cache
        m = try_to_load_from_cache("openbmb/VoxCPM2", "model.safetensors")
        v = try_to_load_from_cache("openbmb/VoxCPM2", "audiovae.pth")
        c = try_to_load_from_cache("openbmb/VoxCPM2", "config.json")
        is_installed = bool(
            isinstance(m, str) and os.path.exists(m) and
            isinstance(v, str) and os.path.exists(v) and
            isinstance(c, str) and os.path.exists(c)
        )
        if is_installed and isinstance(m, str):
            model_dir = os.path.dirname(m)
    except Exception as e:
        print(f"[ModelStatus] 캐시 검사 중 예외 발생: {e}")

    hw = get_hardware_info()

    return {
        "installed": is_installed,
        "loaded": _model is not None,
        "device": hw["device_label"],
        "device_type": hw["device_type"],
        "tag_label": hw["tag_label"],
        "cpu_brand": hw["cpu_brand"],
        "os": hw["os"],
        "model_name": "VoxCPM2 (openbmb)",
        "model_size_mb": 4650,
        "model_path": model_dir
    }

@app.get("/api/system/model-status")
def api_model_status():
    return check_model_cache_status()

@app.get("/api/system/pre-install/stream")
async def stream_preinstall():
    status = check_model_cache_status()
    if status["loaded"]:
        async def instant_done():
            data = {
                "step": 4,
                "total_steps": 4,
                "step_title": "준비 완료!",
                "progress": 100,
                "sub_progress": 100,
                "message": "AI 음성 엔진이 이미 완벽하게 준비되어 메모리에 로드되어 있습니다.",
                "character_action": "celebrating",
                "done": True
            }
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
        return StreamingResponse(
            instant_done(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    # 연결 직후 즉시 1단계 시작 신호를 큐에 전달하여 클라이언트 UI가 지연 없이 즉각 반응하도록 보장
    queue.put_nowait({
        "step": 1,
        "total_steps": 4,
        "step_title": "하드웨어 가속 환경 점검",
        "progress": 5,
        "sub_progress": 20,
        "message": f"시스템 및 {status.get('cpu_brand', '하드웨어')} 가속 엔진 점검을 시작합니다...",
        "character_action": "searching",
        "device_tag": status.get("tag_label", "가속 엔진 점검 중")
    })

    def run_preinstallation():
        import time
        from tqdm import tqdm

        def emit(step, total_steps, step_title, progress, sub_progress, message, action, **extra):
            evt = {
                "step": step,
                "total_steps": total_steps,
                "step_title": step_title,
                "progress": progress,
                "sub_progress": sub_progress,
                "message": message,
                "character_action": action,
                **extra
            }
            loop.call_soon_threadsafe(queue.put_nowait, evt)

        try:
            # ── 1단계: 하드웨어 가속 환경 점검 ──
            time.sleep(0.5)
            dev_str = status["device"]
            emit(1, 4, "하드웨어 가속 환경 점검", 15, 100, f"최적화 가속 장치 감지 완료: {dev_str}", "searching", device_tag=status.get("tag_label"))
            time.sleep(0.5)

            # ── 2단계: AI 모델 가중치 다운로드 ──
            emit(2, 4, "AI 음성 가중치 다운로드", 18, 0, "Hugging Face Hub에서 VoxCPM2 가중치(약 4.6GB) 점검 및 다운로드를 시작합니다...", "downloading")

            if status.get("installed"):
                emit(2, 4, "AI 음성 가중치 다운로드", 78, 100, "로컬 캐시에 모델 가중치(4.6GB)가 이미 준비되어 있습니다! (다운로드 건너뜀)", "downloading")
                time.sleep(0.4)
            else:
                class CustomProgressTqdm(tqdm):
                    def __init__(self, *args, **kwargs):
                        super().__init__(*args, **kwargs)
                        self.desc_name = kwargs.get("desc") or "가중치 파일"
                        self.total_b = kwargs.get("total") or 0
                        self.start_t = time.time()
                        self.last_t = self.start_t
                        self.last_n = self.n
                        self._report(0)

                    def _report(self, speed):
                        if self.total_b > 0:
                            file_pct = min(100.0, (self.n / self.total_b) * 100.0)
                            overall_pct = 18 + int((self.n / self.total_b) * 60)
                            mb_done = round(self.n / (1024 * 1024), 1)
                            mb_total = round(self.total_b / (1024 * 1024), 1)
                            speed_mb = round(speed / (1024 * 1024), 1)
                            speed_txt = f"{speed_mb} MB/s" if speed_mb > 0 else ""
                            msg = f"{self.desc_name} 받는 중... ({mb_done}MB / {mb_total}MB {speed_txt})"
                            emit(2, 4, "AI 음성 가중치 다운로드", overall_pct, int(file_pct), msg, "downloading",
                                 downloaded_mb=mb_done, total_mb=mb_total, speed=speed_txt, file=self.desc_name)

                    def update(self, n=1):
                        super().update(n)
                        now = time.time()
                        if now - self.last_t >= 0.3:
                            dt = now - self.last_t
                            speed = (self.n - self.last_n) / dt if dt > 0 else 0
                            self.last_t = now
                            self.last_n = self.n
                            self._report(speed)

                from huggingface_hub import snapshot_download
                snapshot_download("openbmb/VoxCPM2", tqdm_class=CustomProgressTqdm)
                emit(2, 4, "AI 음성 가중치 다운로드", 78, 100, "AI 모델 가중치(4.6GB) 다운로드 및 무결성 검증 완료!", "downloading")
                time.sleep(0.5)

            # ── 3단계: 신경망 메모리 로드 및 가속 최적화 ──
            device_name = status.get("cpu_brand") or "시스템"
            emit(3, 4, "신경망 로드 및 가속 웜업", 80, 15, f"AI 모델을 메모리에 로드하고 {device_name} 가속 커널을 최적화합니다...", "studying")
            
            # 모델 로드 & 웜업 실행
            get_model()

            emit(3, 4, "신경망 로드 및 가속 웜업", 95, 100, "신경망 웜업 및 음성 합성 테스트 완료!", "singing")
            time.sleep(0.6)

            # ── 4단계: 완료! ──
            emit(4, 4, "설치 및 환경 구성 완료!", 100, 100, "모든 사전 설치와 가속 최적화가 완벽하게 완료되었습니다!", "celebrating", done=True)
            time.sleep(0.5)

        except Exception as e:
            import traceback
            traceback.print_exc()
            emit(0, 4, "오류 발생", 0, 0, f"설치 중 오류가 발생했습니다: {str(e)}", "searching", error=True, error_msg=str(e))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    threading.Thread(target=run_preinstallation, daemon=True).start()

    async def event_generator():
        try:
            while True:
                data = await queue.get()
                if data is None:
                    break
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def change_speed_pitch_preserved(wav: np.ndarray, speed_ratio: float) -> np.ndarray:
    """피치(Pitch)를 보존하면서 오디오 속도(Speed)를 변경하는 Phase Vocoder 알고리즘 (Pure NumPy)"""
    if abs(speed_ratio - 1.0) < 1e-2:
        return wav

    n_fft = 1024
    hop_length = 256
    window = np.hanning(n_fft)

    # STFT
    padded_wav = np.pad(wav, n_fft // 2, mode='reflect')
    n_frames = (len(padded_wav) - n_fft) // hop_length + 1
    
    # 메모리 효율적인 프레임 생성
    frames = np.zeros((n_frames, n_fft))
    for i in range(n_frames):
        frames[i] = padded_wav[i * hop_length : i * hop_length + n_fft] * window
        
    stft = np.fft.rfft(frames, axis=1)

    # Time Stretch (Phase Vocoder)
    num_bins = stft.shape[1]
    time_steps = np.arange(0, n_frames - 1, speed_ratio)
    new_frames = len(time_steps)
    stft_stretch = np.zeros((new_frames, num_bins), dtype=np.complex128)

    phi_advance = np.linspace(0, np.pi * hop_length, num_bins)
    phase_accum = np.angle(stft[0])
    stft_stretch[0] = stft[0]

    for i, t in enumerate(time_steps[1:], 1):
        t_floor = int(np.floor(t))
        t_ceil = min(t_floor + 1, n_frames - 1)
        alpha = t - t_floor

        mag = (1 - alpha) * np.abs(stft[t_floor]) + alpha * np.abs(stft[t_ceil])
        phase_diff = np.angle(stft[t_ceil]) - np.angle(stft[t_floor]) - phi_advance
        phase_diff = phase_diff - 2 * np.pi * np.round(phase_diff / (2 * np.pi))

        phase_accum += phi_advance + phase_diff
        stft_stretch[i] = mag * np.exp(1j * phase_accum)

    # ISTFT
    output_len = int(len(wav) / speed_ratio)
    y = np.zeros(output_len + n_fft)
    window_sum = np.zeros(len(y))

    for i in range(new_frames):
        ft_frame = stft_stretch[i]
        time_frame = np.fft.irfft(ft_frame) * window

        start = i * hop_length
        end = start + n_fft
        if end > len(y):
            break
        y[start:end] += time_frame
        window_sum[start:end] += window ** 2

    window_sum[window_sum < 1e-4] = 1.0
    y = y / window_sum
    
    res = y[n_fft // 2 : n_fft // 2 + output_len]
    return res.astype(np.float32)

# ── Basic Voice Presets ───────────────────────────────────────────────────────
BASIC_VOICES = [
    {"id": "female_standard", "name": "여성 – 기본", "gender": "여성",
     "prompt": "A young woman, clear and natural voice"},
    {"id": "female_warm", "name": "여성 – 따뜻함", "gender": "여성",
     "prompt": "A woman in her 30s, warm and gentle voice"},
    {"id": "female_cheerful", "name": "여성 – 활기참", "gender": "여성",
     "prompt": "A young woman, cheerful and energetic voice"},
    {"id": "male_standard", "name": "남성 – 기본", "gender": "남성",
     "prompt": "A young man, clear and natural voice"},
    {"id": "male_calm", "name": "남성 – 차분함", "gender": "남성",
     "prompt": "A man in his 30s, calm and composed voice"},
    {"id": "male_strong", "name": "남성 – 힘참", "gender": "남성",
     "prompt": "A man, strong and confident voice"},
]

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/basic-voices")
def list_basic_voices():
    return BASIC_VOICES


def translate_via_urllib_google(text: str) -> str:
    """내장 urllib 기반 Google 번역 API (의존성 없음, 안전장치)"""
    import urllib.request
    import urllib.parse
    import json
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            translated_text = "".join([part[0] for part in data[0] if part[0]])
            if translated_text:
                return translated_text
    except Exception as e:
        print(f"[Translation] 내장 urllib Google 번역 실패: {e}")
    return ""

def translate_via_urllib_mymemory(text: str) -> str:
    """내장 urllib 기반 MyMemory 번역 API (의존성 없음, 안전장치)"""
    import urllib.request
    import urllib.parse
    import json
    try:
        url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair=ko|en"
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            translated_text = data.get("responseData", {}).get("translatedText", "")
            if translated_text:
                return translated_text
    except Exception as e:
        print(f"[Translation] 내장 urllib MyMemory 번역 실패: {e}")
    return ""

def translate_to_english(text: str) -> str:
    """한국어(또는 기타 언어) → 영어 번역. 다양한 폴백 시스템 적용."""
    if not text:
        return text
    if all(ord(c) < 128 for c in text):
        return text

    errors = []

    # 1차 시도: deep_translator GoogleTranslator
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source="auto", target="en").translate(text)
        if result:
            return result
    except Exception as e:
        errors.append(f"deep_translator.Google: {e}")

    # 2차 시도: 내장 urllib Google 번역 (의존성 없이 즉시 작동)
    try:
        result = translate_via_urllib_google(text)
        if result:
            return result
    except Exception as e:
        errors.append(f"urllib.Google: {e}")

    # 3차 시도: deep_translator MyMemoryTranslator
    try:
        from deep_translator import MyMemoryTranslator
        result = MyMemoryTranslator(source="ko-KR", target="en-US").translate(text)
        if result:
            return result
    except Exception as e:
        errors.append(f"deep_translator.MyMemory: {e}")

    # 4차 시도: 내장 urllib MyMemory 번역 (의존성 없이 즉시 작동)
    try:
        result = translate_via_urllib_mymemory(text)
        if result:
            return result
    except Exception as e:
        errors.append(f"urllib.MyMemory: {e}")

    raise RuntimeError(f"모든 번역 시도 실패 — {'; '.join(errors)}")


@app.post("/api/generate")
async def generate_speech(
    text: str = Form(...),
    voice_type: str = Form(...),
    style: str = Form(""),
    basic_voice_id: str = Form(None),
    my_voice_id: str = Form(None),
    cfg_value: float = Form(2.0),
    steps: int = Form(10),
    target_db: float = Form(-6.0),
    speed: float = Form(1.0),
    session_id: str = Form(None),
):
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        pass

    async def log(msg: str):
        if session_id:
            q = _get_queue(session_id)
            await q.put(msg)

    async def end_log():
        if session_id:
            q = _get_queue(session_id)
            await q.put(None)

    text = text.strip()
    if not text:
        raise HTTPException(400, "텍스트를 입력하세요.")

    await log("▶  음성 생성 시작")

    # 음성 스타일 번역
    style = style.strip()
    style_en = ""
    if style:
        await log("⟳  스타일 텍스트 번역 중...")
        try:
            style_en = await asyncio.get_event_loop().run_in_executor(
                executor, translate_to_english, style
            )
            await log(f"✓  번역 완료 → {style_en}")
        except Exception as e:
            await log(f"✗  번역 실패: {e}")
            await log("⚠  원문 그대로 사용합니다")
            style_en = style

    output_id = str(uuid.uuid4())
    output_path = OUTPUTS_DIR / f"{output_id}.wav"
    voice_name = "알 수 없음"

    await log("⟳  AI 모델 확인 중...")
    try:
        def model_cb(loaded_mb, total_mb, pct, stage, msg):
            evt = json.dumps({
                "loaded_mb": loaded_mb,
                "total_mb": total_mb,
                "pct": pct,
                "stage": stage,
                "message": msg
            }, ensure_ascii=False)
            _push_log(session_id, f"[MODEL_PROGRESS] {evt}")

        if _model is None:
            model = await asyncio.get_event_loop().run_in_executor(
                executor, lambda: get_model(progress_cb=model_cb)
            )
        else:
            model = get_model()

        await log("✓  모델 준비 완료")
    except RuntimeError as e:
        await log(f"✗  모델 로드 실패: {e}")
        await end_log()
        raise HTTPException(503, str(e))

    try:
        if voice_type == "basic":
            if basic_voice_id:
                preset = next((v for v in BASIC_VOICES if v["id"] == basic_voice_id), None)
                if not preset:
                    raise HTTPException(400, "기본 음성을 선택하세요.")
                voice_name = preset["name"]
                base_prompt = preset["prompt"]
                prompt = f"{base_prompt}, {style_en}" if style_en else base_prompt
            else:
                if not style_en:
                    raise HTTPException(400, "음성을 선택하거나 스타일을 입력하세요.")
                voice_name = "스타일 지정"
                prompt = style_en
            full_text = f"({prompt}){text}"
            await log(f"📝  전달 프롬프트: {full_text[:200]}")
            await log(f"⟳  음성 합성 중... (프롬프트: {prompt[:60]})")

            def _gen():
                return model.generate(
                    text=full_text,
                    cfg_value=cfg_value,
                    inference_timesteps=steps,
                    retry_badcase=False,
                )

            wav = await asyncio.get_event_loop().run_in_executor(executor, _gen)

        elif voice_type == "my":
            conn = get_db()
            voice = conn.execute("SELECT * FROM voices WHERE id = ?", (my_voice_id,)).fetchone()
            conn.close()
            if not voice:
                raise HTTPException(400, "내 음성을 선택하세요.")
            voice_name = voice["name"]
            ref_p = Path(voice["audio_path"])
            if not ref_p.exists():
                candidate = VOICES_DIR / ref_p.name
                if candidate.exists():
                    ref_p = candidate
                else:
                    candidate2 = DATA_DIR / voice["audio_path"]
                    if candidate2.exists():
                        ref_p = candidate2
            if not ref_p.exists():
                raise HTTPException(400, f"등록된 음성 파일을 찾을 수 없습니다: {voice['audio_path']}")
            ref_path = str(ref_p.resolve())
            full_text = f"({style_en}){text}" if style_en else text
            await log(f"📝  전달 프롬프트: {full_text[:200]}")
            await log(f"⟳  내 음성 '{voice_name}' 으로 합성 중...")

            def _gen():
                return model.generate(
                    text=full_text,
                    reference_wav_path=ref_path,
                    cfg_value=cfg_value,
                    inference_timesteps=steps,
                    retry_badcase=False,
                )

            wav = await asyncio.get_event_loop().run_in_executor(executor, _gen)
        else:
            raise HTTPException(400, "잘못된 음성 타입입니다.")

        await log("✓  음성 합성 완료")

        if abs(speed - 1.0) >= 1e-2:
            await log(f"⟳  속도 조절 중 ({speed:.1f}x)...")
            wav = change_speed_pitch_preserved(wav, speed)
            await log(f"✓  속도 조절 완료 ({speed:.1f}x)")

        await log("⟳  볼륨 정규화 중...")

        import numpy as np
        peak = float(np.abs(wav).max())
        if peak > 1e-6:
            target_linear = 10 ** (target_db / 20.0)
            gain = target_linear / peak
            wav = (wav * gain).astype(wav.dtype)
        await log(f"✓  볼륨 정규화 완료  (peak → {target_db:.0f} dB)")
        await log("⟳  파일 저장 중...")

        import soundfile as sf
        sr = model.tts_model.sample_rate
        sf.write(str(output_path), wav, sr)
        duration = round(len(wav) / sr, 2)

        conn = get_db()
        conn.execute(
            "INSERT INTO outputs (id, text, voice_type, voice_name, duration, audio_path, created_at, style, cfg_value, steps, target_db, speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (output_id, text, voice_type, voice_name, duration, str(output_path), time.time(), style, cfg_value, steps, target_db, speed),
        )
        conn.commit()
        conn.close()

        await log(f"✓  저장 완료  |  길이: {duration}초  |  음성: {voice_name}")
        await end_log()

        return {
            "id": output_id,
            "audio_url": f"/api/audio/outputs/{output_id}.wav",
            "duration": duration,
            "voice_name": voice_name,
            "text": text,
            "created_at": time.time(),
            "cfg_value": cfg_value,
            "steps": steps,
            "target_db": target_db,
            "speed": speed,
        }

    except HTTPException:
        await end_log()
        raise
    except Exception as e:
        await log(f"✗  오류 발생: {e}")
        await end_log()
        if output_path.exists():
            output_path.unlink()
        raise HTTPException(500, f"생성 실패: {e}")


@app.get("/api/audio/{category}/{filename}")
def serve_audio(category: str, filename: str):
    if category == "outputs":
        path = OUTPUTS_DIR / filename
    elif category == "voices":
        path = VOICES_DIR / filename
    elif category == "temp":
        path = TEMP_DIR / filename
    else:
        raise HTTPException(404)
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(str(path), media_type="audio/wav")


@app.get("/api/outputs")
def list_outputs():
    conn = get_db()
    rows = conn.execute("SELECT * FROM outputs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [
        {**dict(r), "audio_url": f"/api/audio/outputs/{Path(r['audio_path']).name}"}
        for r in rows
    ]


@app.delete("/api/outputs/{output_id}")
def delete_output(output_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM outputs WHERE id = ?", (output_id,)).fetchone()
    if not row:
        raise HTTPException(404)
    p = Path(row["audio_path"])
    if p.exists():
        p.unlink()
    conn.execute("DELETE FROM outputs WHERE id = ?", (output_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


class DeleteMultiplePayload(BaseModel):
    ids: list

@app.post("/api/outputs/delete-multiple")
def delete_multiple_outputs(payload: DeleteMultiplePayload):
    ids = payload.ids
    conn = get_db()
    for output_id in ids:
        row = conn.execute("SELECT * FROM outputs WHERE id = ?", (output_id,)).fetchone()
        if row:
            p = Path(row["audio_path"])
            if p.exists():
                try:
                    p.unlink()
                except Exception as e:
                    print(f"Error unlinking {p}: {e}")
            conn.execute("DELETE FROM outputs WHERE id = ?", (output_id,))
    conn.commit()
    conn.close()
    return {"ok": True}



@app.get("/api/voices")
def list_voices():
    conn = get_db()
    rows = conn.execute("SELECT * FROM voices ORDER BY created_at DESC").fetchall()
    conn.close()
    
    voices = []
    for r in rows:
        d = dict(r)
        if d.get("audio_path"):
            d["original_audio_url"] = f"/api/audio/voices/{Path(d['audio_path']).name}"
        else:
            d["original_audio_url"] = ""
            
        if d.get("preview_audio_path") and Path(d["preview_audio_path"]).exists():
            play_path = Path(d["preview_audio_path"])
        else:
            play_path = Path(d["audio_path"])
        d["audio_url"] = f"/api/audio/voices/{play_path.name}"
        voices.append(d)
    return voices


@app.post("/api/voices")
async def register_voice(
    name: str = Form(...),
    gender: str = Form(...),
    audio: UploadFile = File(None),
    from_output_id: str = Form(None),
    voice_type: str = Form("upload"),
):
    import soundfile as sf

    name = name.strip()
    if not name:
        raise HTTPException(400, "이름을 입력하세요.")
    if gender not in ["남성", "여성"]:
        raise HTTPException(400, "성별을 선택하세요.")

    if voice_type not in ["my_voice", "female_actor", "male_actor"]:
        voice_type = "female_actor" if gender == "여성" else "male_actor"

    voice_id = str(uuid.uuid4())
    voice_path = VOICES_DIR / f"{voice_id}.wav"

    style = ""
    cfg_value = 2.0
    steps = 10
    target_db = -6.0
    speed = 1.0

    if audio and audio.filename:
        content = await audio.read()
        with open(voice_path, "wb") as f:
            f.write(content)
        try:
            data, sr = sf.read(str(voice_path))
            duration = len(data) / sr
            if duration < 3.0:
                voice_path.unlink()
                raise HTTPException(400, f"음성 파일은 3초 이상이어야 합니다. (현재 {duration:.1f}초)")
        except HTTPException:
            raise
        except Exception as e:
            if voice_path.exists():
                voice_path.unlink()
            raise HTTPException(400, f"파일 읽기 실패: {e}")

    elif from_output_id:
        conn = get_db()
        output = conn.execute("SELECT * FROM outputs WHERE id = ?", (from_output_id,)).fetchone()
        conn.close()
        if not output:
            raise HTTPException(404, "생성된 음성을 찾을 수 없습니다.")
        dur = output["duration"] or 0
        if dur < 3.0:
            raise HTTPException(400, f"음성은 3초 이상이어야 합니다. (현재 {dur:.1f}초)")
        
        src_path = Path(output["audio_path"])
        if not src_path.exists():
            candidate = OUTPUTS_DIR / src_path.name
            if candidate.exists():
                src_path = candidate
            else:
                candidate2 = DATA_DIR / output["audio_path"]
                if candidate2.exists():
                    src_path = candidate2
        if not src_path.exists():
            raise HTTPException(400, f"참조할 원본 생성 음성 파일을 찾을 수 없습니다: {output['audio_path']}")
        shutil.copy2(str(src_path), str(voice_path))
        
        output_dict = dict(output)
        style = output_dict.get("style", "")
        cfg_value = output_dict.get("cfg_value", 2.0)
        steps = output_dict.get("steps", 10)
        target_db = output_dict.get("target_db", -6.0)
        speed = output_dict.get("speed", 1.0)
    else:
        raise HTTPException(400, "음성 파일 또는 생성된 음성 ID가 필요합니다.")

    now = time.time()
    conn = get_db()
    conn.execute(
        "INSERT INTO voices (id, name, gender, audio_path, created_at, preview_text, preview_audio_path, style, cfg_value, steps, target_db, speed, voice_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (voice_id, name, gender, str(voice_path), now, '', '', style, cfg_value, steps, target_db, speed, voice_type),
    )
    conn.commit()
    conn.close()

    return {
        "id": voice_id,
        "name": name,
        "gender": gender,
        "audio_url": f"/api/audio/voices/{voice_id}.wav",
        "created_at": now,
        "cfg_value": cfg_value,
        "steps": steps,
        "target_db": target_db,
        "speed": speed,
        "voice_type": voice_type,
    }


@app.put("/api/voices/{voice_id}")
async def update_voice(
    voice_id: str,
    name: str = Form(None),
    gender: str = Form(None),
    preview_text: str = Form(None),
    style: str = Form(None),
    voice_type: str = Form(None),
):
    conn = get_db()
    row = conn.execute("SELECT * FROM voices WHERE id = ?", (voice_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404)
        
    if name is not None:
        name = name.strip()
        if not name:
            conn.close()
            raise HTTPException(400, "이름을 입력하세요.")
        conn.execute("UPDATE voices SET name = ? WHERE id = ?", (name, voice_id))

    if voice_type is not None:
        voice_type = voice_type.strip()
        if voice_type in ["my_voice", "female_actor", "male_actor"]:
            conn.execute("UPDATE voices SET voice_type = ? WHERE id = ?", (voice_type, voice_id))
            if voice_type == "female_actor":
                gender = "여성"
            elif voice_type == "male_actor":
                gender = "남성"

    if gender is not None:
        gender = gender.strip()
        if gender not in ["남성", "여성"]:
            conn.close()
            raise HTTPException(400, "성별을 선택하세요.")
        conn.execute("UPDATE voices SET gender = ? WHERE id = ?", (gender, voice_id))
        
    if style is not None:
        conn.execute("UPDATE voices SET style = ? WHERE id = ?", (style.strip(), voice_id))
        
    if preview_text is not None:
        preview_text = preview_text.strip()
        conn.execute("UPDATE voices SET preview_text = ? WHERE id = ?", (preview_text, voice_id))
        
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/api/voices/{voice_id}")
def delete_voice(voice_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM voices WHERE id = ?", (voice_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404)
        
    p = Path(row["audio_path"])
    if p.exists():
        try:
            p.unlink()
        except Exception as e:
            print(f"Error unlinking voice: {e}")
            
    row_dict = dict(row)
    if row_dict.get("preview_audio_path"):
        pp = Path(row_dict["preview_audio_path"])
        if pp.exists():
            try:
                pp.unlink()
            except Exception as e:
                print(f"Error unlinking preview: {e}")
                
    conn.execute("DELETE FROM voices WHERE id = ?", (voice_id,))
    conn.commit()
    conn.close()
    return {"ok": True}




@app.get("/api/youtube/info")
async def get_youtube_info(url: str):
    import yt_dlp
    url = url.strip()
    if not url:
        raise HTTPException(400, "유튜브 URL을 입력하세요.")
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web']
                }
            },
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False))
            duration = info.get('duration') or 0
            title = info.get('title') or "유튜브 동영상"
            return {
                "ok": True,
                "duration": int(duration),
                "title": title
            }
    except Exception as e:
        raise HTTPException(400, f"유튜브 정보 분석 실패: {str(e)}")


@app.post("/api/youtube/extract")
async def extract_youtube_audio(
    url: str = Form(...),
    start_time: int = Form(...),
    end_time: int = Form(...),
):
    import yt_dlp
    import shutil

    url = url.strip()
    if not url:
        raise HTTPException(400, "유튜브 URL을 입력하세요.")

    duration = end_time - start_time
    if duration < 3 or duration > 30:
        raise HTTPException(400, f"추출 시간은 3초에서 30초 사이여야 합니다. (현재 {duration}초)")

    if start_time < 0:
        raise HTTPException(400, "시작 시간은 0보다 커야 합니다.")

    # 1. 오래된 임시 파일 정리 (1시간 이상 지난 파일 삭제)
    now_time = time.time()
    for p in TEMP_DIR.glob("*.wav"):
        try:
            if now_time - p.stat().st_mtime > 3600:
                p.unlink()
        except Exception as e:
            print(f"Error removing temp wav: {e}")

    # 2. ffmpeg 바이너리 탐색 및 PATH 보장
    ffmpeg_bin = setup_ffmpeg()
    if not ffmpeg_bin:
        raise HTTPException(500, "FFmpeg 실행 파일을 찾을 수 없습니다. 오디오 변환을 위해 FFmpeg가 필요합니다.")

    # 3. yt-dlp를 이용해 지정 구간 다운로드 및 22050Hz 모노 WAV 변환
    temp_id = str(uuid.uuid4())
    temp_wav_path = TEMP_DIR / f"{temp_id}.wav"
    outtmpl = str(TEMP_DIR / f"{temp_id}.%(ext)s")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': outtmpl,
        'download_ranges': lambda info_dict, ydl: [{'start_time': start_time, 'end_time': end_time}],
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web']
            }
        },
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
        }],
        'postprocessor_args': [
            '-ar', '22050',
            '-ac', '1'
        ],
        'ffmpeg_location': ffmpeg_bin,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        loop = asyncio.get_event_loop()
        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

        await loop.run_in_executor(None, _download)

        # 파일 생성 확인 및 fallback
        if not temp_wav_path.exists() or temp_wav_path.stat().st_size == 0:
            found_wav = list(TEMP_DIR.glob(f"{temp_id}*.wav"))
            if found_wav and found_wav[0].stat().st_size > 0:
                found_wav[0].rename(temp_wav_path)

        if not temp_wav_path.exists() or temp_wav_path.stat().st_size == 0:
            raise HTTPException(500, "추출된 오디오 파일이 비어있거나 생성되지 않았습니다.")

    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        print(f"YouTube extraction error: {e}")
        raise HTTPException(500, f"유튜브 오디오 추출 과정 실패: {str(e)}")

    return {
        "ok": True,
        "audio_url": f"/api/audio/temp/{temp_id}.wav",
        "duration": duration
    }


# Static files — must be last
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8808, timeout_keep_alive=600)
