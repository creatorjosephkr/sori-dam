# 소리담 (Sori-Dam) v1.1.8 릴리즈 안내

<div align="center">

<img src="https://raw.githubusercontent.com/creatorjosephkr/sori-dam/main/build/icon.iconset/icon_128x128@2x.png" width="100" alt="소리담 아이콘">

# 소리담 (Sori-Dam) v1.1.8
### 완전 무료 로컬 AI 음성 생성기 (Voice Cloning & TTS)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)%20%7C%20Windows-lightgrey.svg)]()
[![Release Version](https://img.shields.io/badge/Release-v1.1.8-brightgreen.svg)](https://github.com/creatorjosephkr/sori-dam/releases/tag/v1.1.8)

> **"소리를 담다, 마음을 담다."**  
> 외부 네트워크나 클라우드 서버 전송 없이, 오직 내 컴퓨터 안에서 안전하게 나만의 목소리를 빚어내는 로컬 AI 음성 생성기 **'소리담' v1.1.8** 버전이 출시되었습니다.

</div>

---

## 설치 파일 다운로드

| 플랫폼 | 설치 파일 | 지원 아키텍처 및 사양 | 파일 용량 |
|:---|:---|:---|:---|
| **macOS (Apple Silicon)** | **[`Sori-Dam-1.1.8-arm64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.8/Sori-Dam-1.1.8-arm64.dmg)** | Apple Silicon (M1 / M2 / M3 / M4 전 기종 지원) | ~547 MB |
| **Windows** | **[`Sori-Dam-Setup-1.1.8.exe`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.8/Sori-Dam-Setup-1.1.8.exe)** | Windows 10 / 11 (64비트, NVIDIA CUDA & 저사양/CPU 자동 최적화) | ~334 MB |

---

## v1.1.8 주요 업데이트 내역

### 1. Windows 설치 환경 완벽 호환성 확보 (권한 및 패키지 격리)
* **`Program Files` 설치 시 권한 오류 해결**: Windows 기본 경로(`C:\Program Files\Sori-Dam`)에 설치된 환경에서도 관리자 권한 없이 런타임 패키지(PyTorch 등)가 안전하게 설치되도록 전용 쓰기 가능 격리 디렉터리(`%APPDATA%\sori-dam\data\python-user`)를 구축했습니다.
* **호스트 Python 환경 오염 차단**: 사용자 PC에 기존 설치된 글로벌 Python(`%APPDATA%\Python`) 환경과의 패키지 충돌(`typing_extensions` 등)을 원천 차단했습니다.
* **필수 AI 라이브러리 사전 번들링**: `voxcpm`, `librosa`, `scipy`, `numba`, `soundfile`, `transformers`, `safetensors`, `sympy`, `networkx`, `jinja2` 등 필수 패키지를 설치 파일에 사전 내장하여 첫 실행 시간을 대폭 단축하고 `voxcpm` 임포트 실패 문제를 해결했습니다.

### 2. 저사양 Windows PC 및 구형 GPU 자동 감지·CPU 폴백 지원
* **GPU 사양 정밀 진단**: GTX 750 Ti 등 VRAM 5.5GB 미만 또는 구형 아키텍처(Compute Capability 6.0 미만) 그래픽카드 환경에서는 4.6GB 모델 로드 시 발생하던 메모리 부족(CUDA OOM) 및 커널 호환성 오류를 방지하기 위해 자동으로 멀티스레드 CPU 가속 모드(`float32`)로 전환됩니다.
* **스마트 PyTorch 설치**: 저사양/내장 그래픽 환경에서는 불필요한 2.5GB CUDA 패키지 대신 경량 CPU 최적화 PyTorch를 설치하여 초기 준비 시간과 디스크 사용량을 크게 줄였습니다.
* **CUDA 로드 예외 시 자동 CPU 전환**: CUDA 장치에서 가중치 로드 중 예외가 발생하더라도 중단되지 않고 즉시 CPU 모드로 재시도하여 안정적인 기동을 보장합니다.

### 3. 첫 기동 대기 타이머 및 외부 링크 연결 개선
* **활동 기반 타임아웃 연장**: 최초 기동 시 네트워크 환경에 따라 패키지 준비 중 타임아웃으로 종료되지 않도록 최대 대기 시간을 30분으로 확장하고, 로그 출력 활성 상태에 따라 타이머가 갱신되도록 개선했습니다.
* **업데이트 알림창 다운로드 페이지 이동 수정**: 새 버전 알림 모달에서 다운로드 페이지 이동 버튼 클릭 시 기본 웹 브라우저로 최신 릴리즈 페이지가 즉시 열리도록 Electron IPC 브릿지를 수정했습니다.

---

## 소리담 기본 기능 소개

### 1. 100% 완전 로컬 구동 (철저한 개인정보 보호)
* 사용자의 목소리, 입력 텍스트, 생성된 오디오가 **외부 서버나 클라우드로 단 1바이트도 전송되지 않습니다.**
* 인터넷이 끊긴 오프라인 환경에서도 아무런 제약 없이 100% 무료로 무제한 사용 가능합니다.
* 회원가입, 로그인, 월 구독료 결제가 전혀 필요 없습니다.

### 2. 하드웨어 가속 지원
* **macOS (Apple Silicon)**: Apple MPS(Metal Performance Shaders) 뉴럴 가속 자동 적용.
* **Windows**: 고사양 NVIDIA CUDA GPU 텐서 가속 및 저사양/일반 PC용 CPU 멀티스레드 자동 최적화.

---

## 설치 및 실행 방법

### macOS 사용자
1. 다운로드한 **`Sori-Dam-1.1.8-arm64.dmg`** 파일을 더블클릭합니다.
2. 열린 창(`소리담 1.1.8`)에서 **소리담 아이콘**을 **Applications(응용 프로그램)** 폴더로 드래그하여 설치합니다.
3. Launchpad 또는 응용 프로그램 폴더에서 **소리담**을 실행합니다.

### Windows 사용자
1. **`Sori-Dam-Setup-1.1.8.exe`** 설치 파일을 다운로드합니다.
2. 설치 관리자의 안내에 따라 설치를 완료한 후 바탕화면 바로가기로 실행합니다.
