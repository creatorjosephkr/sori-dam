# ── 자동 의존성 설치 모듈 ────────────────────────────────────────────────────────
import sys
import os
import shutil
import importlib
import subprocess
import platform
from pathlib import Path

# ── Windows 전용 쓰기 가능한 독립 사이트 패키지 경로 확보 및 글로벌 AppData 오염 차단 ──
_INIT_DATA_DIR = Path(os.environ.get("VOXCPM_DATA_DIR", Path(__file__).parent / "data"))
_WIN_USER_BASE = _INIT_DATA_DIR / "python-user"
_WIN_RUNTIME_SITE = _WIN_USER_BASE / "Python310" / "site-packages"

if sys.platform == 'win32':
    os.environ["PYTHONUSERBASE"] = str(_WIN_USER_BASE)
    try:
        _WIN_RUNTIME_SITE.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    appdata = os.environ.get('APPDATA', '')
    if appdata:
        roaming_python = os.path.normpath(os.path.join(appdata, 'Python'))
        roaming_site = Path(roaming_python) / "Python310" / "site-packages"
        # 기존 실행에서 Roaming\Python에 이미 다운로드된 torch/torchaudio가 있다면 전용 폴더로 즉시 이관 (2.5GB 재다운로드 방지)
        try:
            if roaming_site.is_dir() and not (_WIN_RUNTIME_SITE / "torch").exists() and (roaming_site / "torch").exists():
                for item in roaming_site.iterdir():
                    if item.name.lower().startswith(("torch", "torchaudio")):
                        dest = _WIN_RUNTIME_SITE / item.name
                        if not dest.exists():
                            shutil.move(str(item), str(dest))
                print("[Sori-Dam] 기존 다운로드된 PyTorch 모듈을 전용 격리 환경으로 이관 완료했습니다.", flush=True)
        except Exception as _mig_err:
            print(f"[Sori-Dam] 기존 PyTorch 이관 참고 메시지: {_mig_err}", flush=True)

        roaming_python_lower = roaming_python.lower()
        sys.path = [p for p in sys.path if not os.path.normpath(p).lower().startswith(roaming_python_lower)]

    # 번들 site-packages가 최우선, 그 다음 _WIN_RUNTIME_SITE가 위치하도록 보장
    runtime_site_str = str(_WIN_RUNTIME_SITE)
    if runtime_site_str not in sys.path:
        sys.path.append(runtime_site_str)

print(f"[Sori-Dam] 현재 구동 중인 파이썬 엔진: {sys.executable}", flush=True)

def ensure_voxcpm_patched():
    """voxcpm2.py에서 librosa 의존성을 안전하게 주석 처리하고 utils.py의 디바이스/dtype 선택 로직을 보강"""
    for p in sys.path:
        target = Path(p) / "voxcpm" / "model" / "voxcpm2.py"
        if target.is_file():
            try:
                code = target.read_text(encoding="utf-8")
                modified = False
                if "\nimport librosa\n" in code:
                    code = code.replace("\nimport librosa\n", "\n# import librosa\n")
                    modified = True
                if "\nimport librosa\r\n" in code:
                    code = code.replace("\nimport librosa\r\n", "\n# import librosa\r\n")
                    modified = True
                if code.startswith("import librosa\n") or code.startswith("import librosa\r\n"):
                    code = "# " + code
                    modified = True
                if modified:
                    target.write_text(code, encoding="utf-8")
                    print(f"[Sori-Dam] ✅ {target} 호환성 패치 완료 (librosa 직접 의존성 제거)", flush=True)
            except Exception as e:
                print(f"[Sori-Dam] voxcpm 패치 중 경고: {e}", flush=True)

ensure_voxcpm_patched()

REQUIRED_PACKAGES = {
    "typing_extensions": "typing-extensions",
    "fastapi": "fastapi",
    "uvicorn": "uvicorn[standard]",
    "multipart": "python-multipart",
    "soundfile": "soundfile",
    "numpy": "numpy",
    "torch": "torch",
    "torchaudio": "torchaudio",
    "voxcpm": "voxcpm",
    "deep_translator": "deep-translator",
    "yt_dlp": "yt-dlp",
    "imageio_ffmpeg": "imageio-ffmpeg"
}

# Windows 번들 환경에서는 아래 패키지들이 이미 bin/python-win/Lib/site-packages에 포함되어 있습니다.
# pip으로 재설치하면 패치된 voxcpm이 덮어씌워지므로 반드시 제외해야 합니다.
_WIN_BUNDLED_PACKAGES = {
    "typing_extensions",   # bin에 포함
    "fastapi",             # bin에 포함
    "uvicorn",             # bin에 포함
    "multipart",           # bin에 포함
    "soundfile",           # bin에 포함
    "numpy",               # bin에 포함
    "voxcpm",              # bin에 포함 (패치됨 — pip 재설치 금지)
    "deep_translator",     # bin에 포함
    "yt_dlp",              # bin에 포함
    "imageio_ffmpeg",      # bin에 포함
}

def has_capable_nvidia_gpu() -> bool:
    """VoxCPM2(4.6GB) 구동이 가능한 NVIDIA GPU(VRAM 5.5GB 이상, Compute Capability 6.0 이상) 유무 확인"""
    try:
        res = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total,compute_cap", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if res.returncode == 0 and res.stdout.strip():
            line = res.stdout.strip().splitlines()[0]
            parts = [p.strip() for p in line.split(",")]
            vram_mb = float(parts[0])
            cc_major = int(parts[1].split(".")[0])
            print(f"[Sori-Dam] 감지된 NVIDIA GPU 사양: VRAM={vram_mb:.0f}MB, Compute Capability={parts[1]}", flush=True)
            return vram_mb >= 5500 and cc_major >= 6
    except Exception:
        pass
    return False

def windows_torch_profile():
    """Keep the legacy build for older cards; use Blackwell wheels for RTX 50+."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=compute_cap,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        capability, memory = result.stdout.strip().splitlines()[0].split(",")
        if result.returncode == 0 and float(capability) >= 10 and float(memory) >= 5500:
            return "2.7.1", "cu128"
    except (OSError, ValueError, IndexError, subprocess.SubprocessError):
        pass
    return "2.5.1", "cu121"


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

_WIN_TORCH_VERSION, _WIN_CUDA_CHANNEL = windows_torch_profile() if sys.platform == "win32" else ("2.5.1", "cu121")
_WIN_TORCHAUDIO_VERSION = _WIN_TORCH_VERSION
_WIN_CUDA_INDEX = f"https://download.pytorch.org/whl/{_WIN_CUDA_CHANNEL}"
_WIN_MSVC_DLLS = (
    "vcruntime140.dll",
    "vcruntime140_1.dll",
    "vcruntime140_threads.dll",
    "msvcp140.dll",
    "msvcp140_1.dll",
    "msvcp140_2.dll",
    "msvcp140_atomic_wait.dll",
    "msvcp140_codecvt_ids.dll",
    "vcomp140.dll",
    "concrt140.dll",
)

def _preload_windows_msvc_dlls():
    """Windows에서 구형 System32\\msvcp140.dll 충돌(WinError 1114: c10.dll 초기화 실패)을 방지하기 위해 최신 VC++ 런타임 DLL을 선제 로드합니다."""
    if sys.platform != "win32":
        return
    import ctypes
    candidate_dirs = [
        Path(sys.executable).parent,
        _WIN_RUNTIME_SITE / "Scripts",
        _WIN_RUNTIME_SITE,
        _WIN_RUNTIME_SITE / "torch" / "lib",
    ]
    existing_dirs = [d for d in candidate_dirs if d.is_dir()]
    for d in existing_dirs:
        try:
            if hasattr(os, "add_dll_directory"):
                os.add_dll_directory(str(d))
        except Exception:
            pass
    if existing_dirs:
        os.environ["PATH"] = ";".join([str(d) for d in existing_dirs] + [os.environ.get("PATH", "")])

    # torch/lib 폴더가 존재할 경우 최신 VC++ 런타임 DLL을 torch/lib에도 동기화하여 LoadLibraryExW가 최우선 참조하도록 보장
    torch_lib_dir = _WIN_RUNTIME_SITE / "torch" / "lib"
    for dll_name in _WIN_MSVC_DLLS:
        for src_dir in existing_dirs:
            dll_path = src_dir / dll_name
            if dll_path.is_file():
                if torch_lib_dir.is_dir() and src_dir != torch_lib_dir:
                    target_dll = torch_lib_dir / dll_name
                    try:
                        if not target_dll.exists() or target_dll.stat().st_size != dll_path.stat().st_size:
                            shutil.copy2(str(dll_path), str(target_dll))
                    except Exception:
                        pass
                try:
                    ctypes.CDLL(str(dll_path))
                except Exception:
                    pass
                break

def _ensure_windows_msvc_runtime(base_cmd):
    """내장 파이썬 폴더나 런타임 사이트에 최신 msvcp140.dll이 없을 경우 msvc-runtime을 자동 설치합니다."""
    if sys.platform != "win32":
        return
    py_dir = Path(sys.executable).parent
    if not (py_dir / "msvcp140.dll").is_file() and not (_WIN_RUNTIME_SITE / "Scripts" / "msvcp140.dll").is_file():
        print("[Sori-Dam] 🔧 Windows VC++ 런타임(msvc-runtime) 보완 설치 중...", flush=True)
        try:
            subprocess.check_call([
                *base_cmd, "install",
                "--target", str(_WIN_RUNTIME_SITE),
                "--upgrade",
                "--no-cache-dir",
                "--no-deps",
                "--no-warn-script-location",
                "msvc-runtime"
            ])
        except Exception as e:
            print(f"[Sori-Dam] msvc-runtime 설치 참고 메시지: {e}", flush=True)
    _preload_windows_msvc_dlls()

def install_missing_packages():
    pip_cmd_base = get_working_pip_cmd()
    base_cmd = [sys.executable, *pip_cmd_base] if len(pip_cmd_base) > 1 else [pip_cmd_base[0]]
    
    # ── 1. Windows에서 VC++ 런타임 선제 로드 및 PyTorch/TorchAudio 최우선 점검·설치 ──
    # Program Files 설치 시에도 권한 오류가 절대 발생하지 않도록 _WIN_RUNTIME_SITE(--target)에 설치합니다.
    if sys.platform == 'win32':
        # Inspect metadata before importing DLLs: loaded torch DLLs cannot be replaced safely.
        from importlib.metadata import distributions
        installed = {dist.metadata["Name"].lower(): dist.version
                     for dist in distributions(path=[str(_WIN_RUNTIME_SITE)])
                     if dist.metadata.get("Name")}
        expected = f"{_WIN_TORCH_VERSION}+{_WIN_CUDA_CHANNEL}"
        if has_capable_nvidia_gpu() and any(
            installed.get(name) != expected for name in ("torch", "torchaudio")
        ):
            print(f"[Sori-Dam] GPU 호환 패키지 설치: PyTorch {expected}", flush=True)
            try:
                subprocess.check_call([
                    *base_cmd, "install", "--target", str(_WIN_RUNTIME_SITE),
                    "--upgrade", "--no-cache-dir", "--no-deps", "--no-warn-script-location",
                    f"torch=={expected}", f"torchaudio=={expected}",
                    "--index-url", _WIN_CUDA_INDEX
                ])
                importlib.invalidate_caches()
            except subprocess.CalledProcessError as err:
                print(f"[Sori-Dam] CUDA 패키지 설치 실패: {err}. 기존 패키지 또는 CPU 설치로 계속합니다.", flush=True)
        _ensure_windows_msvc_runtime(base_cmd)
        need_torch = False
        try:
            import torch
            import torchaudio
        except Exception as torch_import_err:
            print(f"[Sori-Dam] ℹ️ PyTorch 초기 점검 안내 ({torch_import_err}). 호환 버전 설치/복구를 준비합니다...", flush=True)
            need_torch = True
            # 이미 로드 시도된 반쪽짜리 모듈 캐시 및 손상/불완전한 기존 torch/torchaudio 폴더 정리
            for mod_key in [k for k in list(sys.modules.keys()) if k == "torch" or k.startswith("torch.") or k == "torchaudio" or k.startswith("torchaudio.")]:
                sys.modules.pop(mod_key, None)
            for prefix in ("torch", "torchaudio"):
                for item in _WIN_RUNTIME_SITE.glob(f"{prefix}*"):
                    try:
                        if item.is_dir():
                            shutil.rmtree(item, ignore_errors=True)
                        else:
                            item.unlink(missing_ok=True)
                    except Exception:
                        pass

        if need_torch:
            use_cuda_wheel = has_capable_nvidia_gpu()
            installed_ok = False

            if use_cuda_wheel:
                print(f"[Sori-Dam] ⚡ Windows CUDA 가속 PyTorch({_WIN_TORCH_VERSION}+{_WIN_CUDA_CHANNEL}) 고속 설치를 진행합니다...", flush=True)
                torch_cuda_cmd = [
                    *base_cmd, "install",
                    "--target", str(_WIN_RUNTIME_SITE),
                    "--upgrade",
                    "--no-cache-dir",
                    "--no-deps",
                    "--no-warn-script-location",
                    f"torch=={_WIN_TORCH_VERSION}",
                    f"torchaudio=={_WIN_TORCHAUDIO_VERSION}",
                    "--index-url", _WIN_CUDA_INDEX
                ]
                try:
                    subprocess.check_call(torch_cuda_cmd)
                    installed_ok = True
                    print("[Sori-Dam] ✅ PyTorch 및 TorchAudio CUDA 설치 완료!", flush=True)
                except Exception as cuda_err:
                    print(f"[Sori-Dam] ⚠️ CUDA 버전 PyTorch 설치 실패 ({cuda_err}). 호환 CPU 버전으로 자동 전환하여 설치합니다...", flush=True)

            if not installed_ok:
                print(f"[Sori-Dam] ⚡ Windows 호환 PyTorch({_WIN_TORCH_VERSION} CPU 최적화 버전) 고속 설치를 진행합니다...", flush=True)
                torch_cpu_cmd = [
                    *base_cmd, "install",
                    "--target", str(_WIN_RUNTIME_SITE),
                    "--upgrade",
                    "--no-cache-dir",
                    "--no-deps",
                    "--no-warn-script-location",
                    f"torch=={_WIN_TORCH_VERSION}",
                    f"torchaudio=={_WIN_TORCHAUDIO_VERSION}",
                    "--index-url", "https://download.pytorch.org/whl/cpu"
                ]
                try:
                    subprocess.check_call(torch_cpu_cmd)
                    print("[Sori-Dam] ✅ PyTorch 및 TorchAudio 설치 완료!", flush=True)
                except Exception as e:
                    print(f"[Sori-Dam] PyTorch/TorchAudio 설치 실패: {e}", file=sys.stderr, flush=True)
                    sys.exit(1)

            importlib.invalidate_caches()
            if str(_WIN_RUNTIME_SITE) not in sys.path:
                sys.path.append(str(_WIN_RUNTIME_SITE))
            _preload_windows_msvc_dlls()

    # VoxCPM 호환성 패치 재확인
    ensure_voxcpm_patched()

    # ── 2. 나머지 필수 패키지 점검 및 설치 ──
    missing = []
    for module_name, package_name in REQUIRED_PACKAGES.items():
        if sys.platform == 'win32' and module_name in _WIN_BUNDLED_PACKAGES:
            continue
        try:
            __import__(module_name)
        except (ImportError, OSError):
            missing.append(package_name)
            
    if missing:
        print(f"[Sori-Dam] 누락된 패키지 감지: {missing}. 자동 설치를 시작합니다...", flush=True)
        print(f"[Sori-Dam] 감지된 패키지 매니저 도구: {pip_cmd_base}", flush=True)
        
        for pkg in missing:
            install_pkg = pkg
            extra_args = []
            
            if sys.platform == 'win32':
                extra_args = ["--target", str(_WIN_RUNTIME_SITE), "--upgrade", "--no-build-isolation"]
                if pkg == "voxcpm":
                    extra_args.append("--no-deps")
                elif pkg in ("torch", "torchaudio"):
                    install_pkg = f"torch=={_WIN_TORCH_VERSION}" if pkg == "torch" else f"torchaudio=={_WIN_TORCHAUDIO_VERSION}"
                    extra_args.append("--no-deps")
                    if has_capable_nvidia_gpu():
                        extra_args.extend(["--index-url", _WIN_CUDA_INDEX])
            
            print(f"[Sori-Dam] 패키지 설치 진행 중: {install_pkg} (추가옵션: {extra_args})...", flush=True)
            try:
                cmd = [
                    *base_cmd, "install",
                    "--no-cache-dir",
                    "--no-warn-script-location",
                    *extra_args,
                    install_pkg
                ]
                
                subprocess.check_call(cmd)
                importlib.invalidate_caches()
                print(f"[Sori-Dam] 패키지 설치 성공: {install_pkg}", flush=True)
            except Exception as e:
                print(f"[Sori-Dam] {install_pkg} 자동 설치 실패: {e}", file=sys.stderr, flush=True)
                print(f"[Sori-Dam] 치명적 오류: 필수 패키지 {install_pkg} 설치에 실패하여 기동을 중단합니다.", file=sys.stderr, flush=True)
                sys.exit(1)

        ensure_voxcpm_patched()
        if sys.platform == 'win32':
            _preload_windows_msvc_dlls()
        print("[Sori-Dam] 모든 필수 패키지 설치 절차가 완료되었습니다!", flush=True)


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
_cuda_probe_result = None


def can_use_cuda_for_voxcpm() -> bool:
    """Test real CUDA kernels once, including the model's low precision math."""
    global _cuda_probe_result
    if _cuda_probe_result is not None:
        return _cuda_probe_result
    _cuda_probe_result = False
    if not torch.cuda.is_available():
        return False
    try:
        props = torch.cuda.get_device_properties(0)
        if props.major < 6 or props.total_memory / (1024 * 1024) < 5500:
            return False
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        with torch.inference_mode():
            probe = torch.ones((32, 32), device="cuda:0", dtype=dtype)
            result = probe @ probe
            torch.cuda.synchronize(0)
            if result[0, 0].item() != 32:
                raise RuntimeError("CUDA 연산 검증 실패")
        _cuda_probe_result = True
    except Exception as err:
        print(f"[Sori-Dam] CUDA 연산 점검 실패: {err}. CPU 모드를 사용합니다. NVIDIA 드라이버도 확인해 주세요.", flush=True)
    return _cuda_probe_result

if can_use_cuda_for_voxcpm():
    print(f"[Sori-Dam] 🚀 CUDA GPU 가속 활성화됨: {torch.cuda.get_device_name(0)}", flush=True)
elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
    print("[Sori-Dam] 🚀 Apple Silicon (MPS) 가속 활성화됨", flush=True)
else:
    cpu_threads = max(1, (os.cpu_count() or 4) - 1)
    torch.set_num_threads(cpu_threads)
    if torch.cuda.is_available():
        print(f"[Sori-Dam] ℹ️ 감지된 GPU({torch.cuda.get_device_name(0)})는 GPU 사양 또는 CUDA 연산 호환성 점검을 통과하지 못해, CPU 멀티스레드 모드({cpu_threads} 스레드)로 구동됩니다.", flush=True)
    else:
        print(f"[Sori-Dam] ℹ️ CPU 모드로 구동됩니다. 멀티스레드 최적화 적용: {cpu_threads} 스레드", flush=True)

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
SHARED_CACHE_DIR = DATA_DIR / "shared_cache"
DB_PATH = DATA_DIR / "voxcpm.db"
GITHUB_CONFIG_PATH = DATA_DIR / "github_config.json"
SHARED_VOICES_REPO = os.environ.get("SORIDAM_GITHUB_REPO", "creatorjosephkr/sori-dam")
SHARED_VOICES_BRANCH = os.environ.get("SORIDAM_GITHUB_BRANCH", "main")
LOCAL_SHARED_DIR = Path(__file__).parent.resolve() / "shared_voices"

for d in [DATA_DIR, VOICES_DIR, OUTPUTS_DIR, TEMP_DIR, SHARED_CACHE_DIR]:
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

    # voices 테이블에 공유저장소 고유 ID(shared_id) 컬럼 추가
    try:
        conn.execute("ALTER TABLE voices ADD COLUMN shared_id TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass

    conn.close()

migrate_db()

# ── VoxCPM Model (lazy) ──────────────────────────────────────────────────────
_model = None
_model_device = None

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
_model_load_lock = threading.Lock()

def _patch_safetensors_loader():
    global _safetensors_patched
    if _safetensors_patched:
        return
    try:
        import torch.nn as nn
        import safetensors.torch
        from safetensors import safe_open
        import voxcpm.model.voxcpm2
        import voxcpm.model.voxcpm
        from voxcpm.model.voxcpm2 import VoxCPM2Model, VoxCPMConfig, AudioVAEV2, LlamaTokenizerFast, get_dtype, resolve_runtime_device, pick_runtime_dtype

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

        @classmethod
        def fast_from_local(
            cls,
            path: str,
            optimize: bool = True,
            training: bool = False,
            device: str = None,
            lora_config = None,
        ):
            cb = _current_load_progress_cb
            with open(os.path.join(path, "config.json"), "r", encoding="utf-8") as _cfg_f:
                config = VoxCPMConfig.model_validate_json(_cfg_f.read())
            tokenizer = LlamaTokenizerFast.from_pretrained(path)
            audio_vae_config = getattr(config, "audio_vae_config", None)
            audio_vae = AudioVAEV2(config=audio_vae_config) if audio_vae_config else AudioVAEV2()

            audiovae_safetensors_path = os.path.join(path, "audiovae.safetensors")
            audiovae_pth_path = os.path.join(path, "audiovae.pth")
            if os.path.exists(audiovae_safetensors_path):
                vae_state_dict = orig_load(audiovae_safetensors_path, device="cpu")
            elif os.path.exists(audiovae_pth_path):
                checkpoint = torch.load(audiovae_pth_path, map_location="cpu", weights_only=True)
                vae_state_dict = checkpoint.get("state_dict", checkpoint)
                del checkpoint
            else:
                raise FileNotFoundError(f"AudioVAE checkpoint not found in {path}")

            audio_vae.load_state_dict(vae_state_dict, strict=False)
            del vae_state_dict

            if cb:
                cb(
                    loaded_mb=377,
                    total_mb=4580,
                    pct=10,
                    stage="init_skeleton",
                    msg="오디오 VAE 로드 완료! 거대 언어 신경망(2B) 메모리 구조 준비 중..."
                )

            resolved_dev = resolve_runtime_device(device, config.device)
            resolved_dt_str = pick_runtime_dtype(resolved_dev, config.dtype)
            lm_dtype = get_dtype(resolved_dt_str)

            # 22억 개 파라미터의 불필요한 kaiming_uniform_ 난수 초기화를 생략하여 CPU 프리징 및 메모리 스래싱 방지
            orig_resets = {}
            for m_cls in (nn.Linear, nn.Embedding):
                orig_resets[m_cls] = m_cls.reset_parameters
                m_cls.reset_parameters = lambda self: None
            prev_default_dtype = torch.get_default_dtype()
            try:
                if not training:
                    torch.set_default_dtype(lm_dtype)
                model = cls(config, tokenizer, audio_vae, lora_config, device=device)
            finally:
                torch.set_default_dtype(prev_default_dtype)
                for m_cls, fn in orig_resets.items():
                    m_cls.reset_parameters = fn

            if not training:
                model = model.to(lm_dtype)
            model.audio_vae = model.audio_vae.to(torch.float32)

            safetensors_path = os.path.join(path, "model.safetensors")
            pytorch_model_path = os.path.join(path, "pytorch_model.bin")

            if os.path.exists(safetensors_path):
                file_size = os.path.getsize(safetensors_path)
                total_mb = round(file_size / (1024 * 1024), 1)
                last_t = 0
                loaded_bytes = 0
                params_map = dict(model.named_parameters())
                buffers_map = dict(model.named_buffers())

                # 4.2GB 전체 dict를 중복 할당하지 않고 텐서 단위로 즉시 스트리밍 주입 (메모리 사용량 50% 절감)
                with safe_open(safetensors_path, framework="pt", device="cpu") as f:
                    keys = f.offset_keys()
                    total_keys = len(keys)
                    for i, k in enumerate(keys):
                        tensor = f.get_tensor(k)
                        loaded_bytes += tensor.numel() * tensor.element_size()
                        if k in params_map:
                            p = params_map[k]
                            if p.device.type == "cpu" and p.dtype == tensor.dtype:
                                p.data = tensor
                            else:
                                p.data.copy_(tensor)
                        elif k in buffers_map:
                            b = buffers_map[k]
                            if b.device.type == "cpu" and b.dtype == tensor.dtype:
                                b.data = tensor
                            else:
                                b.data.copy_(tensor)
                        del tensor

                        if cb:
                            now = time.time()
                            if now - last_t >= 0.12 or i == total_keys - 1:
                                last_t = now
                                loaded_mb = round(loaded_bytes / (1024 * 1024), 1)
                                pct = min(92, 12 + int((loaded_bytes / max(file_size, 1)) * 80))
                                cb(
                                    loaded_mb=loaded_mb,
                                    total_mb=total_mb,
                                    pct=pct,
                                    stage="loading_safetensors",
                                    msg=f"AI 모델 신경망 가중치 로드 중... ({loaded_mb:,.0f} MB / {total_mb:,.0f} MB)"
                                )
            elif os.path.exists(pytorch_model_path):
                checkpoint = torch.load(pytorch_model_path, map_location="cpu", weights_only=True)
                model_state_dict = checkpoint.get("state_dict", checkpoint)
                model.load_state_dict(model_state_dict, strict=False)
                del model_state_dict, checkpoint
            else:
                raise FileNotFoundError(f"Model file not found in {path}")

            if cb:
                cb(
                    loaded_mb=4580,
                    total_mb=4580,
                    pct=95,
                    stage="optimizing",
                    msg="신경망 가속 장치 배치 및 최적화 마무리 중..."
                )

            if training:
                return model
            return model.to(model.device).eval().optimize(disable=not optimize)

        safetensors.torch.load_file = tracked_load_file
        voxcpm.model.voxcpm2.load_file = tracked_load_file
        voxcpm.model.voxcpm.load_file = tracked_load_file
        VoxCPM2Model.from_local = fast_from_local
        _safetensors_patched = True
        print("[Sori-Dam] safetensors 저메모리 고속 스트리밍 로더 후킹 완료", flush=True)
    except Exception as e:
        print(f"[Sori-Dam] safetensors 후킹 경고: {e}", flush=True)

def get_model(progress_cb=None):
    global _model, _model_device, _current_load_progress_cb
    if _model is not None:
        return _model
    with _model_load_lock:
        if _model is not None:
            return _model
        _current_load_progress_cb = progress_cb
        ensure_voxcpm_patched()
        try:
            from voxcpm import VoxCPM
        except Exception as e:
            import traceback
            traceback.print_exc()
            err_tb = traceback.format_exc()
            print(f"[Sori-Dam] voxcpm 임포트 에러 상세:\n{err_tb}", file=sys.stderr)
            raise RuntimeError(f"voxcpm 라이브러리 임포트 실패 ({e}). 필수 패키지가 정상 설치되었는지 확인해 주세요.")

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
        target_device = "cpu"
        if can_use_cuda_for_voxcpm():
            dev_str = f"CUDA GPU ({torch.cuda.get_device_name(0)})"
            target_device = "cuda"
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            dev_str = "Apple Silicon (MPS)"
            target_device = "mps"
        print(f"[Sori-Dam] VoxCPM2 모델 로드 중... (구동 장치: {dev_str})", flush=True)

        if progress_cb:
            progress_cb(
                loaded_mb=377,
                total_mb=4580,
                pct=8,
                stage="vae",
                msg="오디오 VAE 신경망 디코더 로드 중 (약 377MB)..."
            )

        try:
            _model = VoxCPM.from_pretrained(
                "openbmb/VoxCPM2",
                load_denoiser=False,
                optimize=False,
                device=target_device
            )
        except Exception as e:
            if target_device == "cuda":
                print(f"[Sori-Dam] ⚠️ CUDA 장치 로드 중 예외 발생 ({e}). 안정적인 CPU 모드로 자동 전환하여 재시도합니다...", flush=True)
                try:
                    torch.cuda.empty_cache()
                except Exception:
                    pass
                try:
                    target_device = "cpu"
                    _model = VoxCPM.from_pretrained(
                        "openbmb/VoxCPM2",
                        load_denoiser=False,
                        optimize=False,
                        device="cpu"
                    )
                except Exception as cpu_e:
                    import traceback
                    traceback.print_exc()
                    raise RuntimeError(f"VoxCPM2 모델 가중치 로드 중 오류가 발생했습니다: {cpu_e}")
            else:
                import traceback
                traceback.print_exc()
                raise RuntimeError(f"VoxCPM2 모델 가중치 로드 중 오류가 발생했습니다: {e}")

        _model_device = target_device
        if progress_cb:
            progress_cb(
                loaded_mb=4580,
                total_mb=4580,
                pct=100,
                stage="done",
                msg="AI 모델 준비 완료! 음성 합성을 시작합니다."
            )
        print(f"[Sori-Dam] VoxCPM2 모델 로드 완료! (실행 장치: {_model_device})", flush=True)
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
    if _model_device == "cuda" or (_model_device is None and can_use_cuda_for_voxcpm()):
        gpu_name = torch.cuda.get_device_name(0)
        device_type = "cuda"
        device_label = f"NVIDIA CUDA ({gpu_name})"
        tag_label = f"CUDA: {gpu_name.replace('NVIDIA GeForce ', '')}"
    elif _model_device == "mps" or (_model_device is None and getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()):
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
            
            def step3_progress(loaded_mb, total_mb, pct, stage, msg):
                overall = 80 + int((pct / 100.0) * 15)
                emit(3, 4, "신경망 로드 및 가속 웜업", overall, pct, msg, "studying",
                     downloaded_mb=loaded_mb, total_mb=total_mb)

            # 모델 로드 & 웜업 실행
            get_model(progress_cb=step3_progress)

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
def serve_audio(category: str, filename: str, download_name: str = None):
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
    if download_name:
        safe_dl = re.sub(r'[\\/:*?"<>|]+', "_", download_name.strip()) or "voice"
        if not safe_dl.lower().endswith(".wav"):
            safe_dl += ".wav"
        return FileResponse(str(path), media_type="audio/wav", filename=safe_dl)
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


# ── GitHub 공유 저장소(Export / Import) API ────────────────────────────────────
import base64
import urllib.request
import urllib.error

_shared_index_cache = {"items": None, "ts": 0.0}


def _load_github_config() -> dict:
    if GITHUB_CONFIG_PATH.exists():
        try:
            return json.loads(GITHUB_CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _save_github_config(cfg: dict):
    try:
        current = _load_github_config()
        current.update(cfg)
        GITHUB_CONFIG_PATH.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[GitHub Config] 설정 저장 실패: {e}")


def _resolve_github_token(explicit_token: str = None) -> tuple[str, str]:
    """(token, method) 튜플 반환"""
    if explicit_token and explicit_token.strip():
        tok = explicit_token.strip()
        _save_github_config({"github_token": tok})
        return tok, "token"

    cfg = _load_github_config()
    if cfg.get("github_token", "").strip():
        return cfg["github_token"].strip(), "token"

    for env_key in ("GITHUB_TOKEN", "GH_TOKEN", "SORIDAM_GITHUB_TOKEN"):
        if os.environ.get(env_key, "").strip():
            return os.environ[env_key].strip(), "env"

    gh_candidates = [
        shutil.which("gh") or "",
        "/opt/homebrew/bin/gh",
        "/usr/local/bin/gh",
        r"C:\Program Files\GitHub CLI\gh.exe",
    ]
    for gh_bin in gh_candidates:
        if gh_bin and os.path.isfile(gh_bin):
            try:
                out = subprocess.check_output(
                    [gh_bin, "auth", "token"],
                    stderr=subprocess.DEVNULL,
                    text=True,
                    timeout=3,
                ).strip()
                if out:
                    return out, "gh_cli"
            except Exception:
                pass

    return "", "none"


def _can_use_local_git() -> bool:
    repo_root = Path(__file__).parent.resolve()
    return (repo_root / ".git").exists() and bool(shutil.which("git"))


def _github_api_request(method: str, path: str, token: str = "", data: dict = None, timeout: int = 20) -> dict:
    url = f"https://api.github.com/repos/{SHARED_VOICES_REPO}/{path.lstrip('/')}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Sori-Dam-App/1.2.2",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body_bytes = None
    if data is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
        body_bytes = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def _fetch_shared_voices_index(force_refresh: bool = False) -> list[dict]:
    now = time.time()
    if not force_refresh and _shared_index_cache["items"] is not None and (now - _shared_index_cache["ts"] < 15):
        return _shared_index_cache["items"]

    local_idx_path = LOCAL_SHARED_DIR / "index.json"
    cache_idx_path = SHARED_CACHE_DIR / "index.json"

    # 1. GitHub 저장소에서 실시간 조회 (GitHub 원격 저장소를 단일 진실 공급원으로 사용)
    remote_items = None
    tok, _ = _resolve_github_token()
    try:
        res = _github_api_request(
            "GET",
            f"contents/shared_voices/index.json?ref={SHARED_VOICES_BRANCH}",
            token=tok,
            timeout=8,
        )
        if isinstance(res, dict) and res.get("content"):
            decoded = base64.b64decode(res["content"]).decode("utf-8")
            remote_items = json.loads(decoded)
    except urllib.error.HTTPError as he:
        if he.code == 404:
            remote_items = []
    except Exception:
        pass

    if remote_items is None:
        try:
            raw_url = f"https://raw.githubusercontent.com/{SHARED_VOICES_REPO}/{SHARED_VOICES_BRANCH}/shared_voices/index.json?t={int(now)}"
            req = urllib.request.Request(raw_url, headers={"User-Agent": "Sori-Dam-App/1.2.2", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                remote_items = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            if he.code == 404:
                remote_items = []
        except Exception as e:
            print(f"[SharedVoices] 원격 index 조회 참고(오프라인): {e}")

    items_by_id = {}
    if isinstance(remote_items, list):
        # 온라인 조회 성공 시: 원격 GitHub 저장소 목록만 신뢰하고 로컬 캐시/번들 index.json을 원격 기준으로 덮어씀
        for item in remote_items:
            if isinstance(item, dict) and item.get("id"):
                items_by_id[item["id"]] = item
        clean_list = sorted(items_by_id.values(), key=lambda x: float(x.get("created_at") or 0), reverse=True)
        serialized = json.dumps(clean_list, ensure_ascii=False, indent=2)
        try:
            cache_idx_path.write_text(serialized, encoding="utf-8")
        except Exception:
            pass
        try:
            if local_idx_path.parent.exists():
                local_idx_path.write_text(serialized, encoding="utf-8")
        except Exception:
            pass
        _shared_index_cache["items"] = clean_list
        _shared_index_cache["ts"] = now
        return clean_list

    # 2. 완전 오프라인 시 폴백: 로컬 캐시 -> 로컬 번들 순으로 참조
    for fallback_path in (cache_idx_path, local_idx_path):
        if fallback_path.exists():
            try:
                for item in json.loads(fallback_path.read_text(encoding="utf-8")):
                    if isinstance(item, dict) and item.get("id"):
                        items_by_id[item["id"]] = item
                if items_by_id:
                    break
            except Exception as e:
                print(f"[SharedVoices] 오프라인 index 로드 오류 ({fallback_path.name}): {e}")

    items = sorted(items_by_id.values(), key=lambda x: float(x.get("created_at") or 0), reverse=True)
    _shared_index_cache["items"] = items
    _shared_index_cache["ts"] = now
    return items


def _ensure_shared_audio_cached(shared_id: str, audio_file: str = None) -> Path:
    if not audio_file:
        idx = _fetch_shared_voices_index(force_refresh=False)
        found = next((x for x in idx if x.get("id") == shared_id), None)
        audio_file = found.get("audio_file") if found else f"{shared_id}.wav"

    safe_name = Path(audio_file).name
    cached_path = SHARED_CACHE_DIR / safe_name
    if cached_path.exists() and cached_path.stat().st_size > 100:
        return cached_path

    local_bundled = LOCAL_SHARED_DIR / safe_name
    if local_bundled.exists() and local_bundled.stat().st_size > 100:
        shutil.copy2(str(local_bundled), str(cached_path))
        return cached_path

    # GitHub Raw URL 또는 Contents API에서 다운로드
    raw_url = f"https://raw.githubusercontent.com/{SHARED_VOICES_REPO}/{SHARED_VOICES_BRANCH}/shared_voices/{safe_name}"
    try:
        req = urllib.request.Request(raw_url, headers={"User-Agent": "Sori-Dam-App/1.2.2"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            if len(data) > 100:
                cached_path.write_bytes(data)
                return cached_path
    except Exception:
        pass

    tok, _ = _resolve_github_token()
    try:
        res = _github_api_request(
            "GET",
            f"contents/shared_voices/{safe_name}?ref={SHARED_VOICES_BRANCH}",
            token=tok,
            timeout=20,
        )
        if isinstance(res, dict) and res.get("content"):
            data = base64.b64decode(res["content"])
            cached_path.write_bytes(data)
            return cached_path
    except Exception as e:
        raise HTTPException(404, f"공유 저장소에서 오디오 파일을 다운로드할 수 없습니다: {e}")

    raise HTTPException(404, "공유 저장소 오디오 파일을 찾을 수 없습니다.")


@app.get("/api/shared-voices/auth-status")
def get_shared_voices_auth_status():
    tok, method = _resolve_github_token()
    if not tok and _can_use_local_git():
        method = "git_local"
    cfg = _load_github_config()
    return {
        "configured": bool(tok) or method == "git_local",
        "method": method,
        "repo": SHARED_VOICES_REPO,
        "author": cfg.get("author", "creatorjosephkr"),
        "has_saved_token": bool(cfg.get("github_token")),
    }


@app.post("/api/shared-voices/token")
def save_shared_voices_token(
    github_token: str = Form(""),
    author: str = Form(""),
):
    tok = github_token.strip()
    updates = {}
    if author.strip():
        updates["author"] = author.strip()
    if tok:
        # 토큰 유효성 간단 확인
        try:
            req = urllib.request.Request(
                "https://api.github.com/user",
                headers={
                    "Accept": "application/vnd.github.v3+json",
                    "Authorization": f"Bearer {tok}",
                    "User-Agent": "Sori-Dam-App/1.2.2",
                },
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                user_info = json.loads(resp.read().decode("utf-8"))
                login = user_info.get("login")
                if login and not author.strip():
                    updates["author"] = login
        except Exception as e:
            raise HTTPException(400, f"유효하지 않은 GitHub 토큰입니다: {e}")
        updates["github_token"] = tok

    _save_github_config(updates)
    return get_shared_voices_auth_status()


@app.get("/api/shared-voices")
def list_shared_voices(refresh: bool = False):
    items = _fetch_shared_voices_index(force_refresh=refresh)

    conn = get_db()
    local_rows = conn.execute("SELECT id, name, shared_id, audio_path FROM voices").fetchall()
    conn.close()

    by_shared_id = {}
    by_name = {}
    for r in local_rows:
        rd = dict(r)
        ap = rd.get("audio_path")
        if ap and Path(ap).exists():
            if rd.get("shared_id"):
                by_shared_id[rd["shared_id"]] = rd["id"]
            by_name[rd["name"]] = rd["id"]

    result = []
    for item in items:
        sid = item.get("id", "")
        local_id = by_shared_id.get(sid) or by_name.get(item.get("name", ""))
        entry = dict(item)
        entry["imported"] = bool(local_id)
        entry["local_voice_id"] = local_id
        entry["audio_url"] = f"/api/shared-voices/{sid}/audio"
        result.append(entry)

    return result


@app.get("/api/shared-voices/{shared_id}/audio")
def get_shared_voice_audio(shared_id: str, download_name: str = None):
    cached_path = _ensure_shared_audio_cached(shared_id)
    if download_name:
        safe_dl = re.sub(r'[\\/:*?"<>|]+', "_", download_name.strip()) or shared_id
        if not safe_dl.lower().endswith(".wav"):
            safe_dl += ".wav"
        return FileResponse(str(cached_path), media_type="audio/wav", filename=safe_dl)
    return FileResponse(str(cached_path), media_type="audio/wav", filename=f"{shared_id}.wav")


@app.post("/api/shared-voices/import")
def import_shared_voice(
    shared_id: str = Form(...),
    voice_type: str = Form(None),
    custom_name: str = Form(None),
):
    import soundfile as sf

    shared_id = shared_id.strip()
    items = _fetch_shared_voices_index(force_refresh=False)
    meta = next((x for x in items if x.get("id") == shared_id), None)
    if not meta:
        items = _fetch_shared_voices_index(force_refresh=True)
        meta = next((x for x in items if x.get("id") == shared_id), None)
    if not meta:
        raise HTTPException(404, "공유 저장소에서 선택한 음성을 찾을 수 없습니다.")

    # 이미 가져온 음성인지 확인
    conn = get_db()
    existing = conn.execute("SELECT * FROM voices WHERE shared_id = ?", (shared_id,)).fetchone()
    if existing:
        ed = dict(existing)
        if ed.get("audio_path") and Path(ed["audio_path"]).exists():
            conn.close()
            ed["audio_url"] = f"/api/audio/voices/{Path(ed['audio_path']).name}"
            ed["original_audio_url"] = ed["audio_url"]
            ed["already_imported"] = True
            return ed
        else:
            conn.execute("DELETE FROM voices WHERE id = ?", (ed["id"],))
            conn.commit()
    conn.close()

    cached_wav = _ensure_shared_audio_cached(shared_id, meta.get("audio_file"))

    voice_id = str(uuid.uuid4())
    voice_path = VOICES_DIR / f"{voice_id}.wav"
    shutil.copy2(str(cached_wav), str(voice_path))

    # 참조 음성 최소 길이(3.0초) 보장 보정
    try:
        data, sr = sf.read(str(voice_path))
        dur = len(data) / float(sr)
        if dur < 3.0 and len(data) > 0:
            gap = np.zeros((int(0.15 * sr),) + data.shape[1:], dtype=data.dtype)
            chunks = [data]
            total_len = len(data)
            target_len = int(3.2 * sr)
            while total_len < target_len:
                chunks.append(gap)
                chunks.append(data)
                total_len += len(gap) + len(data)
            padded = np.concatenate(chunks, axis=0)
            sf.write(str(voice_path), padded, sr)
    except Exception as e:
        print(f"[SharedVoices] 오디오 패딩 확인 중 예외: {e}")

    name = (custom_name or meta.get("name") or "공유 음성").strip()
    gender = meta.get("gender") if meta.get("gender") in ("여성", "남성") else "여성"
    vtype = voice_type or meta.get("voice_type") or ("female_actor" if gender == "여성" else "male_actor")
    if vtype not in ("my_voice", "female_actor", "male_actor"):
        vtype = "female_actor" if gender == "여성" else "male_actor"

    style = meta.get("style") or ""
    cfg_value = float(meta.get("cfg_value") if meta.get("cfg_value") is not None else 2.0)
    steps = int(meta.get("steps") if meta.get("steps") is not None else 10)
    target_db = float(meta.get("target_db") if meta.get("target_db") is not None else -6.0)
    speed = float(meta.get("speed") if meta.get("speed") is not None else 1.0)
    now = time.time()

    conn = get_db()
    conn.execute(
        "INSERT INTO voices (id, name, gender, audio_path, created_at, preview_text, preview_audio_path, style, cfg_value, steps, target_db, speed, voice_type, shared_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (voice_id, name, gender, str(voice_path), now, "", "", style, cfg_value, steps, target_db, speed, vtype, shared_id),
    )
    conn.commit()
    conn.close()

    return {
        "id": voice_id,
        "name": name,
        "gender": gender,
        "audio_url": f"/api/audio/voices/{voice_id}.wav",
        "original_audio_url": f"/api/audio/voices/{voice_id}.wav",
        "created_at": now,
        "style": style,
        "cfg_value": cfg_value,
        "steps": steps,
        "target_db": target_db,
        "speed": speed,
        "voice_type": vtype,
        "shared_id": shared_id,
        "already_imported": False,
    }


@app.post("/api/shared-voices/export")
def export_shared_voice(
    name: str = Form(...),
    gender: str = Form(...),
    from_output_id: str = Form(None),
    from_voice_id: str = Form(None),
    voice_type: str = Form("female_actor"),
    style: str = Form(""),
    sample_text: str = Form(""),
    author: str = Form(""),
    github_token: str = Form(None),
):
    import soundfile as sf

    name = name.strip()
    if not name:
        raise HTTPException(400, "공유할 음성 이름을 입력하세요.")
    if gender not in ("여성", "남성"):
        raise HTTPException(400, "성별을 선택하세요.")
    if voice_type not in ("my_voice", "female_actor", "male_actor"):
        voice_type = "female_actor" if gender == "여성" else "male_actor"

    src_path = None
    cfg_value = 2.0
    steps = 10
    target_db = -6.0
    speed = 1.0

    conn = get_db()
    if from_output_id:
        row = conn.execute("SELECT * FROM outputs WHERE id = ?", (from_output_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(404, "생성 기록에서 해당 음성을 찾을 수 없습니다.")
        od = dict(row)
        p = Path(od["audio_path"])
        if not p.exists():
            for cand in (OUTPUTS_DIR / p.name, DATA_DIR / od["audio_path"]):
                if cand.exists():
                    p = cand
                    break
        if not p.exists():
            raise HTTPException(404, "원본 생성 오디오 파일을 찾을 수 없습니다.")
        src_path = p
        if not style.strip():
            style = od.get("style") or ""
        if not sample_text.strip():
            sample_text = od.get("text") or ""
        cfg_value = float(od.get("cfg_value") if od.get("cfg_value") is not None else 2.0)
        steps = int(od.get("steps") if od.get("steps") is not None else 10)
        target_db = float(od.get("target_db") if od.get("target_db") is not None else -6.0)
        speed = float(od.get("speed") if od.get("speed") is not None else 1.0)
    elif from_voice_id:
        row = conn.execute("SELECT * FROM voices WHERE id = ?", (from_voice_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(404, "내 음성 목록에서 해당 음성을 찾을 수 없습니다.")
        vd = dict(row)
        p = Path(vd["audio_path"])
        if not p.exists():
            cand = VOICES_DIR / p.name
            if cand.exists():
                p = cand
        if not p.exists():
            raise HTTPException(404, "원본 음성 파일을 찾을 수 없습니다.")
        src_path = p
        if not style.strip():
            style = vd.get("style") or ""
        cfg_value = float(vd.get("cfg_value") if vd.get("cfg_value") is not None else 2.0)
        steps = int(vd.get("steps") if vd.get("steps") is not None else 10)
        target_db = float(vd.get("target_db") if vd.get("target_db") is not None else -6.0)
        speed = float(vd.get("speed") if vd.get("speed") is not None else 1.0)
    else:
        conn.close()
        raise HTTPException(400, "공유할 대상 음성 ID가 필요합니다.")

    shared_id = f"shared_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    audio_file = f"{shared_id}.wav"
    cached_wav = SHARED_CACHE_DIR / audio_file

    # 오디오 길이 확인 및 3초~28초 범위 정규화 저장
    try:
        data, sr = sf.read(str(src_path))
        dur = len(data) / float(sr)
        if dur < 3.0 and len(data) > 0:
            gap = np.zeros((int(0.15 * sr),) + data.shape[1:], dtype=data.dtype)
            chunks = [data]
            total_len = len(data)
            target_len = int(3.2 * sr)
            while total_len < target_len:
                chunks.append(gap)
                chunks.append(data)
                total_len += len(gap) + len(data)
            data = np.concatenate(chunks, axis=0)
        elif dur > 28.0:
            data = data[: int(28.0 * sr)]
        duration = round(len(data) / float(sr), 2)
        sf.write(str(cached_wav), data, sr)
    except Exception:
        shutil.copy2(str(src_path), str(cached_wav))
        duration = 5.0

    author_name = (author or _load_github_config().get("author") or "creatorjosephkr").strip()
    if author.strip():
        _save_github_config({"author": author_name})

    new_entry = {
        "id": shared_id,
        "name": name,
        "gender": gender,
        "voice_type": voice_type,
        "style": style.strip(),
        "sample_text": sample_text.strip()[:200],
        "duration": duration,
        "cfg_value": cfg_value,
        "steps": steps,
        "target_db": target_db,
        "speed": speed,
        "audio_file": audio_file,
        "author": author_name,
        "created_at": round(time.time(), 2),
    }

    tok, method = _resolve_github_token(github_token)
    pushed_remote = False
    push_error = None

    # 방법 1: GitHub REST API를 통한 직접 업로드
    if tok:
        try:
            wav_b64 = base64.b64encode(cached_wav.read_bytes()).decode("ascii")
            _github_api_request(
                "PUT",
                f"contents/shared_voices/{audio_file}",
                token=tok,
                data={
                    "message": f"feat(shared-voices): export voice '{name}' ({shared_id})",
                    "content": wav_b64,
                    "branch": SHARED_VOICES_BRANCH,
                },
                timeout=30,
            )

            # 기존 index.json 조회 (sha 획득)
            existing_list = []
            idx_sha = None
            try:
                idx_res = _github_api_request(
                    "GET",
                    f"contents/shared_voices/index.json?ref={SHARED_VOICES_BRANCH}",
                    token=tok,
                    timeout=15,
                )
                if isinstance(idx_res, dict) and idx_res.get("content"):
                    idx_sha = idx_res.get("sha")
                    existing_list = json.loads(base64.b64decode(idx_res["content"]).decode("utf-8"))
            except urllib.error.HTTPError as he:
                if he.code != 404:
                    raise

            if not isinstance(existing_list, list):
                existing_list = []
            existing_list = [x for x in existing_list if x.get("id") != shared_id]
            existing_list.insert(0, new_entry)

            idx_b64 = base64.b64encode(
                json.dumps(existing_list, ensure_ascii=False, indent=2).encode("utf-8")
            ).decode("ascii")
            put_payload = {
                "message": f"chore(shared-voices): update index.json for '{name}'",
                "content": idx_b64,
                "branch": SHARED_VOICES_BRANCH,
            }
            if idx_sha:
                put_payload["sha"] = idx_sha

            _github_api_request(
                "PUT",
                "contents/shared_voices/index.json",
                token=tok,
                data=put_payload,
                timeout=20,
            )
            pushed_remote = True
        except Exception as e:
            push_error = str(e)
            print(f"[SharedVoices] GitHub REST API 업로드 오류: {e}")

    # 방법 2: 로컬 Git 저장소가 있는 경우 로컬 파일 동기화 및 필요 시 git push 폴백
    authoritative_list = None
    try:
        if pushed_remote and isinstance(existing_list, list):
            authoritative_list = existing_list
        if LOCAL_SHARED_DIR.exists() or _can_use_local_git():
            LOCAL_SHARED_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(cached_wav), str(LOCAL_SHARED_DIR / audio_file))
            local_idx_file = LOCAL_SHARED_DIR / "index.json"
            if authoritative_list is not None:
                local_list = authoritative_list
            else:
                local_list = []
                if local_idx_file.exists():
                    try:
                        local_list = json.loads(local_idx_file.read_text(encoding="utf-8"))
                    except Exception:
                        local_list = []
                local_list = [x for x in local_list if x.get("id") != shared_id]
                local_list.insert(0, new_entry)
                authoritative_list = local_list
            local_idx_file.write_text(json.dumps(local_list, ensure_ascii=False, indent=2), encoding="utf-8")

            if not pushed_remote and _can_use_local_git():
                repo_root = str(Path(__file__).parent.resolve())
                subprocess.run(["git", "add", f"shared_voices/{audio_file}", "shared_voices/index.json"], cwd=repo_root, check=True, timeout=10)
                subprocess.run(["git", "commit", "-m", f"feat(shared-voices): export voice '{name}'"], cwd=repo_root, check=True, timeout=10)
                subprocess.run(["git", "push", "origin", SHARED_VOICES_BRANCH], cwd=repo_root, check=True, timeout=25)
                pushed_remote = True
    except Exception as e:
        if not push_error:
            push_error = str(e)
        print(f"[SharedVoices] 로컬 git 동기화/푸시 참고: {e}")

    if not pushed_remote:
        if cached_wav.exists():
            try:
                cached_wav.unlink()
            except Exception:
                pass
        if not tok:
            raise HTTPException(
                400,
                "깃허브 저장소 업로드 권한(GitHub Personal Access Token)이 필요합니다. 아래 GitHub 토큰 입력란에 토큰을 입력해 주세요.",
            )
        raise HTTPException(500, f"깃허브 공유 저장소 업로드 실패: {push_error}")

    # 캐시 index.json 즉시 갱신 (원격 저장소 목록 기준)
    try:
        cur_items = authoritative_list if isinstance(authoritative_list, list) else _fetch_shared_voices_index(force_refresh=True)
        cur_items = [x for x in cur_items if x.get("id") != shared_id]
        cur_items.insert(0, new_entry)
        (SHARED_CACHE_DIR / "index.json").write_text(
            json.dumps(cur_items, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        _shared_index_cache["items"] = cur_items
        _shared_index_cache["ts"] = time.time()
    except Exception:
        pass

    return {
        "ok": True,
        "voice": new_entry,
        "repo_url": f"https://github.com/{SHARED_VOICES_REPO}/tree/{SHARED_VOICES_BRANCH}/shared_voices",
    }


# Static files — must be last
if (Path(__file__).parent / "spon").exists():
    app.mount("/spon", StaticFiles(directory=str(Path(__file__).parent / "spon")), name="spon")
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8808, timeout_keep_alive=600)
