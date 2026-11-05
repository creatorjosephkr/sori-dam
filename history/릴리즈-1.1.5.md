# 소리담 (Sori-Dam) v1.1.5 릴리즈 안내

<div align="center">

<img src="https://raw.githubusercontent.com/creatorjosephkr/sori-dam/main/build/icon.iconset/icon_128x128@2x.png" width="100" alt="소리담 아이콘">

# 🎙️ 소리담 (Sori-Dam) v1.1.5
### 완전 무료 로컬 AI 음성 생성기 (Voice Cloning & TTS)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)%20%7C%20Windows-lightgrey.svg)]()
[![Release Version](https://img.shields.io/badge/Release-v1.1.5-brightgreen.svg)](https://github.com/creatorjosephkr/sori-dam/releases/tag/v1.1.5)

> **"소리를 담다, 마음을 담다."**  
> 외부 네트워크나 클라우드 서버 전송 없이, 오직 내 컴퓨터 안에서 안전하게 나만의 목소리를 빚어내는 로컬 AI 음성 생성기 **'소리담' v1.1.5** 버전이 출시되었습니다.

</div>

---

## 📥 설치 파일 다운로드

| 플랫폼 | 설치 파일 | 지원 아키텍처 및 사양 | 파일 용량 |
|:---|:---|:---|:---|
| **macOS (Apple Silicon)** | **[`Sori-Dam-1.1.5-arm64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.5/Sori-Dam-1.1.5-arm64.dmg)** | Apple Silicon (M1 / M2 / M3 / M4 전 기종 지원) | ~525 MB |
| **macOS (Intel Mac)** | **[`Sori-Dam-1.1.5-x64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.5/Sori-Dam-1.1.5-x64.dmg)** | Intel Core i5 / i7 / i9 탑재 Mac (x86_64) | ~136 MB |
| **Windows** | **[`Sori-Dam-Setup-1.1.5.exe`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.5/Sori-Dam-Setup-1.1.5.exe)** | Windows 10 / 11 (64비트, NVIDIA CUDA & CPU 가속) | ~106 MB |

---

## 🚀 v1.1.5 주요 업데이트 내역

### 1. 🎙️ 저장한 성우 음성 및 복제 음성 생성 시 크래시 오류 완전 해결
* **오류 원인 해결**:
  * 복제 모드(`reference_wav_path`) 실행 시 AI 엔진 내부에서 오디오를 로드할 때 `librosa.load`가 호출되며 발생하던 macOS dyld 바이너리 충돌(`scipy.signal` Mach-O 섹션 헤더 불일치로 인한 `ImportError: dlopen`) 문제를 완벽히 해결했습니다.
* **고속·무결점 오디오 로더 전환**:
  * 불안정한 라이브러리 의존성을 제거하고, 네이티브 `soundfile` + `torchaudio.transforms.Resample` 파이프라인으로 교체하여 지연 없이 깨끗하고 안정적인 음성 합성을 지원합니다.
* **런타임 몽키패치 이중 안전망 구축**:
  * 백엔드 엔진 구동 시 안전 로더가 자동으로 보정되도록 이중 방어 코드를 적용했습니다.

### 2. 🛡️ 참조 음성 경로 탐색 및 복사 안전 폴백(Fallback) 추가
* 작업 디렉터리(`VOXCPM_DATA_DIR`)와 로컬 CWD 간의 경로 차이로 인해 발생할 수 있는 참조 오디오 파일 누락 위험을 방지하기 위해, 단계별 후보 경로 자동 탐색 및 폴백 로직을 구축했습니다.
* 생성된 오디오 목록에서 '내 음성으로 저장'을 수행할 때 원본 파일 경로 유실 없이 안전하게 복사되도록 방어 코드를 강화했습니다.

---

## ✨ 소리담 기본 기능 소개

### 1. 🔒 100% 완전 로컬 구동 (철저한 개인정보 보호)
* 사용자의 목소리, 입력 텍스트, 생성된 오디오가 **외부 서버나 클라우드로 단 1바이트도 전송되지 않습니다.**
* 인터넷이 끊긴 오프라인 환경에서도 아무런 제약 없이 100% 무료로 무제한 사용 가능합니다.
* 회원가입, 로그인, 월 구독료 결제가 전혀 필요 없습니다.

### 2. 🎙️ 초고품질 AI 음성 합성 (VoxCPM2 기반)
* 최첨단 오픈소스 음성 생성 파운데이션 모델인 **VoxCPM2**를 엔진으로 탑재하여, 기계음이 아닌 숨소리와 억양이 살아있는 극도로 자연스러운 음성을 생성합니다.
* 한국어와 영어 음성을 완벽하게 지원합니다.

### 3. 🎤 나만의 목소리 등록 (3가지 쉬운 방법)
원하는 방식을 선택하여 단 몇 초 만에 내 목소리 또는 원하는 음성을 AI 보이스로 복제할 수 있습니다:
* **마이크 직접 녹음**: 마이크를 이용해 화면의 예시 문장을 3초~30초간 읽고 즉시 등록
* **유튜브 구간 추출**: 좋아하는 영상의 유튜브 링크를 넣고 원하는 시간대 구간을 지정해 추출
* **오디오 파일 업로드**: 기존에 가지고 있는 음성 파일(`mp3`, `wav`, `flac`, `m4a`, `aac` 등)을 바로 업로드

---

## 💻 설치 및 실행 안내

### macOS 사용자
1. 다운로드한 **`Sori-Dam-1.1.5-arm64.dmg`** (Apple Silicon) 또는 **`Sori-Dam-1.1.5-x64.dmg`** (Intel Mac) 파일을 더블클릭합니다.
2. 라이선스 동의 창에서 **[동의(Agree)]**를 클릭합니다.
3. 열린 창(`소리담 1.1.5`)에서 **소리담 아이콘**을 **Applications(응용 프로그램)** 폴더로 드래그하여 설치합니다.
4. Launchpad 또는 응용 프로그램 폴더에서 **소리담**을 실행합니다.

### Windows 사용자
1. **`Sori-Dam-Setup-1.1.5.exe`** 설치 파일을 다운로드합니다.
2. 설치 관리자의 안내에 따라 설치를 완료합니다.
3. 바탕화면 또는 시작 메뉴에서 **소리담**을 실행합니다.
