# 소리담 (Sori-Dam) v1.2.1 릴리즈 노트

**릴리즈 일자**: 2026-11-09  
**버전**: `v1.2.1`

---

## 주요 업데이트 요약

이번 **`v1.2.1`** 업데이트는 Windows 환경에서의 안정성을 대폭 강화한 핫픽스 릴리즈로, **창 가로 폭이 무한히 늘어나는 현상**과 **특정 Windows PC에서 기동 시 `c10.dll` 초기화 오류(`WinError 1114`)로 중단되는 문제**를 해결했습니다.

---

## 버그 수정 및 개선 상세

### 1. Windows 환경에서 앱 창이 가로로 계속 늘어나는 현상 수정 (`electron/main.js`, `static/app.js`)
- Windows 디스플레이 배율(125%, 150% 등) 및 기본 프레임 환경에서 `getContentSize()` → `setContentSize()` 호출 시 반올림 오차로 인해 창 가로 폭이 1~2px씩 증가하고, 이를 감지한 `ResizeObserver`가 다시 높이 동기화를 호출하던 무한 피드백 루프를 제거했습니다.
- `set-height` IPC 핸들러가 외곽 창 가로 폭(`bounds.width`)을 고정한 채 `setBounds()`로 세로 높이만 변경하도록 수정하고, 실제 세로 높이 변화(`> 1px`)가 있을 때만 동작하도록 방어 로직을 추가했습니다.

### 2. 특정 Windows PC 기동 시 PyTorch `c10.dll` 초기화 오류(`WinError 1114`) 해결 (`app.py`, `scripts/setup-binaries.js`)
- Windows 포터블 파이썬(`bin/python-win`)에 최신 Microsoft Visual C++ 런타임 DLL(`msvcp140.dll`, `vcruntime140.dll`, `vcruntime140_1.dll`, `msvcp140_atomic_wait.dll`, `vcomp140.dll`, `concrt140.dll` 등 v14.42)을 직접 내장하고, 기동 시 `ctypes.CDLL`로 선제 로드하도록 개선했습니다.
- Windows 환경의 PyTorch 및 TorchAudio 설치 버전을 검증된 `2.5.1`로 고정하고, 기존에 호환되지 않는 버전이 설치되어 `OSError`(`WinError 1114`)가 발생하던 PC에서도 재실행 시 자동으로 정리 및 복구되도록 개선했습니다.
