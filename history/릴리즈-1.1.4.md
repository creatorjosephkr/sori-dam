# 소리담 (Sori-Dam) v1.1.4 릴리즈 안내

<div align="center">

<img src="https://raw.githubusercontent.com/creatorjosephkr/sori-dam/main/build/icon.iconset/icon_128x128@2x.png" width="100" alt="소리담 아이콘">

# 🎙️ 소리담 (Sori-Dam) v1.1.4
### 완전 무료 로컬 AI 음성 생성기 (Voice Cloning & TTS)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)%20%7C%20Windows-lightgrey.svg)]()
[![Release Version](https://img.shields.io/badge/Release-v1.1.4-brightgreen.svg)](https://github.com/creatorjosephkr/sori-dam/releases/tag/v1.1.4)

> **"소리를 담다, 마음을 담다."**  
> 외부 네트워크나 클라우드 서버 전송 없이, 오직 내 컴퓨터 안에서 안전하게 나만의 목소리를 빚어내는 로컬 AI 음성 생성기 **'소리담' v1.1.4** 버전이 출시되었습니다.

</div>

---

## 📥 설치 파일 다운로드

| 플랫폼 | 설치 파일 | 지원 아키텍처 및 사양 | 파일 용량 |
|:---|:---|:---|:---|
| **macOS (Apple Silicon)** | **[`Sori-Dam-1.1.4-arm64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.4/Sori-Dam-1.1.4-arm64.dmg)** | Apple Silicon (M1 / M2 / M3 / M4 전 기종 지원) | ~525 MB |
| **macOS (Intel Mac)** | **[`Sori-Dam-1.1.4-x64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.4/Sori-Dam-1.1.4-x64.dmg)** | Intel Core i5 / i7 / i9 탑재 Mac (x86_64) | ~136 MB |
| **Windows** | **[`Sori-Dam-Setup-1.1.4.exe`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.4/Sori-Dam-Setup-1.1.4.exe)** | Windows 10 / 11 (64비트, NVIDIA CUDA & CPU 가속) | ~106 MB |

---

## 🚀 v1.1.4 주요 업데이트 내역

### 1. ⚡ 전 기종 범용 하드웨어 가속 실시간 자동 감지
* 특정 칩셋으로 고정되어 있던 하드웨어 점검 로직을 완전히 개편하여, 사용자의 실제 프로세서 사양을 실시간 자동 감지합니다.
* **Apple Silicon (M1, M2, M3, M4 등 전 기종)**: `sysctl` 기반 칩셋 명칭(예: `Apple M4 MPS`) 식별 및 Metal Performance Shaders(MPS) 뉴럴 가속 자동 연동.
* **Intel Mac & 일반 CPU**: 가용 논리 코어 수에 맞춘 CPU 멀티스레드 고속 추론 모드 구성.
* **Windows (NVIDIA)**: CUDA 코어 및 텐서 가속 디바이스 실시간 감지(예: `CUDA: RTX 4070`).

### 2. 📦 최초 실행 AI 모델(VoxCPM2, 4.6GB) 사전 설치 마법사
* 첫 음성 생성 시 대용량 모델 가중치 다운로드로 인해 수 분간 멈추는 현상(첫 생성 지연)을 완전히 해소했습니다.
* 앱 처음 실행 시 모델 설치 상태를 자동 진단하고, 사전 설치 여부를 친절히 묻는 **온보딩 마법사**가 실행됩니다.
* 실시간 진행률(%), 다운로드 속도(MB/s), 받은 용량/전체 용량이 한눈에 시각적으로 표시되며, 접이식 터미널 콘솔을 통해 세부 진행 로그를 확인할 수 있습니다.

### 3. 🐱 인터랙티브 마스코트 '소리담이' 애니메이션 추가
* 설치 대기 시간을 즐겁게 만들어주는 귀여운 벡터 SVG 마스코트 캐릭터 '소리담이'가 탑재되었습니다.
* **5가지 상황별 모션**:
  * 🔍 **탐색 모드**: 돋보기로 최적의 가속 경로 탐색
  * 🎧 **다운로드 모드**: 헤드폰을 끼고 리듬을 타며 무지개 음표가 퐁퐁 떠오르는 동작
  * 📖 **학습 모드**: 안경을 쓰고 AI 사전을 넘기며 머리 위 전구가 반짝이는 동작
  * 🎤 **가속 웜업 모드**: 마이크를 잡고 열창하며 바닥에 오디오 이퀄라이저가 춤추는 동작
  * 🎉 **완료 모드**: 양팔을 번쩍 들고 방방 뛰며 반짝이 별과 콘페티 폭죽이 터지는 동작
* 캐릭터 클릭 시 반응하는 인터랙션 이스터에그 및 감지된 하드웨어 칩셋에 맞춤화된 다정한 말풍선 멘트가 출력됩니다.

### 4. 🏷️ macOS 표준 별칭(Alias) 기반 앱 표시명 및 DMG 타이틀 한글화
* 파일시스템 상의 실제 번들 디렉터리는 영문 `Sori-Dam.app`으로 안전하게 유지하여 파이썬 인터프리터, dyld 동적 링커, SQLite 경로 인코딩 충돌을 원천 차단했습니다.
* Apple 표준 별칭(Alias) 규격인 `CFBundleDisplayName = "소리담"` 및 `ko.lproj/InfoPlist.strings`를 적용하여 Finder, Launchpad, Dock, 메뉴바 등 사용자 UI에서는 자연스럽게 **'소리담'**으로 표시됩니다.
* DMG 파일을 열었을 때 마운트되는 볼륨 및 윈도우 타이틀에 앱 버전이 함께 표시됩니다 (`소리담 1.1.4`).

### 5. 🛡️ 런타임 안정성 및 버그 수정
* **0% 멈춤 현상 수정**: SVG 마스코트 클래스 조작 시 브라우저 Strict 모드에서 발생하던 `SVGAnimatedString` 속성 오류를 표준 `setAttribute` 방식으로 수정.
* **Electron 헬퍼 프로세스 에러 수정**: `CFBundleName` 불일치로 인해 발생하던 `Unable to find helper app` 크래시 문제를 해결하여 완벽한 실행 안정성 확보.
* **로컬 캐시 패스 최적화**: 이미 가중치 파일이 로컬에 있는 경우 불필요한 네트워크 재검증 없이 가속 웜업 단계로 즉시 진입하도록 파이프라인 단축.

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

### 4. ⚙️ 정밀한 음성 스타일 및 오디오 제어
* **음성 스타일 가이드**: "활기차고 밝은 목소리", "차분하고 신뢰감 있는 톤" 등 프롬프트를 통해 목소리 분위기 직접 지정
* **CFG 강도 조절 (Classifier-Free Guidance)**: 텍스트 및 프롬프트 반영 강도 미세 조정
* **생성 단계 (Steps)**: 생성 퀄리티 및 추론 속도 제어
* **음량 표준화 & 재생 속도**: 목표 볼륨(dB) 노멀라이즈 및 피치 보존 오디오 속도 조절(0.5x ~ 2.0x)

### 5. 📋 생성 내역 보관 및 오디오 트림 편집
* 생성된 모든 음성은 SQLite 로컬 데이터베이스에 안전하게 보관되어 언제든 다시 듣고 다운로드할 수 있습니다.
* 파형(Waveform) 비주얼라이저를 보며 원하는 구간만 손쉽게 잘라낼 수 있는 **오디오 트림 편집기**를 기본 제공합니다.

---

## 💻 시스템 요구사항

| 구분 | macOS 사양 | Windows 사양 |
|:---|:---|:---|
| **운영체제** | macOS 13 (Ventura) 이상 권장 | Windows 10 / 11 (64비트) |
| **프로세서** | **Apple Silicon (M1 / M2 / M3 / M4)** | Intel / AMD 64비트 프로세서 |
| **하드웨어 가속** | Metal Performance Shaders (MPS) 내장 가속 | NVIDIA GeForce GTX/RTX 시리즈 (CUDA) 권장 (CPU 모드도 지원) |
| **시스템 메모리** | 8GB RAM 이상 권장 (16GB 이상 최적) | 8GB RAM 이상 권장 (16GB 이상 최적) |
| **저장공간** | 최소 6GB 이상의 여유 디스크 공간 | 최소 6GB 이상의 여유 디스크 공간 |
| **네트워크** | 최초 1회 모델 가중치 다운로드 시 필요 (이후 오프라인 구동) | 최초 1회 모델 가중치 다운로드 시 필요 (이후 오프라인 구동) |

---

## 📖 설치 및 시작 가이드

### macOS 설치 방법
1. 상단 다운로드 표에서 본인의 Mac 사양(Apple Silicon은 `arm64.dmg`, Intel Mac은 `x64.dmg`)에 맞는 설치 파일을 다운로드합니다.
2. 다운로드한 `.dmg` 파일을 더블클릭하여 엽니다.
3. 열린 창(`소리담 1.1.4`)에서 **소리담 아이콘**을 **Applications(응용 프로그램)** 폴더로 드래그하여 설치합니다.
4. Launchpad 또는 응용 프로그램 폴더에서 **소리담**을 실행합니다.
5. 앱이 처음 켜질 때 나타나는 **[사전 설치 마법사]**에서 `지금 바로 사전 설치 및 가속 최적화`를 선택하시면 첫 음성 생성 지연 없이 바로 사용하실 수 있습니다.

> 💡 **최초 실행 시 macOS 보안 경고가 나타날 경우**:  
> 자체 서명(Ad-hoc) 패키지이므로 보안 확인 창이 나타날 수 있습니다.  
> **시스템 설정 → 개인정보 보호 및 보안 → 하단의 "확인 없이 열기"**를 클릭하시면 정상 실행됩니다.

### Windows 설치 방법
1. **`Sori-Dam-Setup-1.1.4.exe`** 설치 파일을 다운로드합니다.
2. 설치 관리자의 안내에 따라 설치 경로를 지정하고 설치를 완료합니다.
3. 바탕화면 또는 시작 메뉴의 **소리담** 바로가기를 실행합니다.

---

## ☕ 개발자 후원 및 피드백

소리담은 누구나 제한 없이 안전한 인공지능 음성 기술을 누릴 수 있도록 만들어진 100% 무료 오픈 프로젝트입니다. 소리담이 마음에 드셨다면 개발자에게 따뜻한 응원을 보내주세요!

* **GitHub Issues**: [버그 신고 및 기능 제안](https://github.com/creatorjosephkr/sori-dam/issues)
* **PayPal 후원**: [💙 PayPal로 후원하기](https://www.paypal.com/paypalme/tech1010?locale.x=ko_KR&country.x=KR)
* **개발자 문의**: `creatorjoseph@kakao.com`
* **라이선스**: [Apache License 2.0](https://github.com/creatorjosephkr/sori-dam/blob/main/LICENSE)
