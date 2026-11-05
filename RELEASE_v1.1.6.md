# 소리담 (Sori-Dam) v1.1.6 릴리즈 안내

<div align="center">

<img src="https://raw.githubusercontent.com/creatorjosephkr/sori-dam/main/build/icon.iconset/icon_128x128@2x.png" width="100" alt="소리담 아이콘">

# 🎙️ 소리담 (Sori-Dam) v1.1.6
### 완전 무료 로컬 AI 음성 생성기 (Voice Cloning & TTS)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)%20%7C%20Windows-lightgrey.svg)]()
[![Release Version](https://img.shields.io/badge/Release-v1.1.6-brightgreen.svg)](https://github.com/creatorjosephkr/sori-dam/releases/tag/v1.1.6)

> **"소리를 담다, 마음을 담다."**  
> 외부 네트워크나 클라우드 서버 전송 없이, 오직 내 컴퓨터 안에서 안전하게 나만의 목소리를 빚어내는 로컬 AI 음성 생성기 **'소리담' v1.1.6** 버전이 출시되었습니다.

</div>

---

## 📥 설치 파일 다운로드

| 플랫폼 | 설치 파일 | 지원 아키텍처 및 사양 | 파일 용량 |
|:---|:---|:---|:---|
| **macOS (Apple Silicon)** | **[`Sori-Dam-1.1.6-arm64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.6/Sori-Dam-1.1.6-arm64.dmg)** | Apple Silicon (M1 / M2 / M3 / M4 전 기종 지원) | ~525 MB |
| **macOS (Intel Mac)** | **[`Sori-Dam-1.1.6-x64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.6/Sori-Dam-1.1.6-x64.dmg)** | Intel Core i5 / i7 / i9 탑재 Mac (x86_64) | ~136 MB |
| **Windows** | **[`Sori-Dam-Setup-1.1.6.exe`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.6/Sori-Dam-Setup-1.1.6.exe)** | Windows 10 / 11 (64비트, NVIDIA CUDA & CPU 가속) | ~106 MB |

---

## 🚀 v1.1.6 주요 업데이트 내역

### 1. 🎙️ 첫 실행 안내 가이드(온보딩 모달) 추가
* **사용자 친화적 첫 안내 창 도입**:
  * 처음 사용하는 사용자분들이 소리담의 독창적인 AI 성우 제작 방식을 쉽게 이해하실 수 있도록 앱 첫 구동 시 웰컴 가이드를 제공합니다.
  * **나만의 성우 제작**: 소리담에는 고정된 상용 성우가 없으며, 원하는 음성 스타일(텍스트)로 새로운 성우를 직접 생성하거나 자신의 목소리(3초~30초)를 등록하여 나만의 전속 성우를 무제한 구축하는 방식임을 명확히 안내합니다.
  * **첫 생성 시 모델 로딩 시간 안내**: 첫 음성 생성 시 약 4.6GB의 거대 AI 가중치를 메모리에 적재하므로 최초 1회만 다소 시간이 소요되며, 이후부터는 캐시되어 매우 빠르게 생성됨을 사전 고지합니다.
  * **100% 무료 & 오픈소스 라이선스**: 상업적·비상업적 목적 모두 무제한 무료이며, 출처 표기 시 소스코드 수정 및 배포가 자유롭습니다.
* **편의성 개선**:
  * `다시 보지 않기` 체크 지원
  * 상단 헤더의 `?` 버튼으로 언제든 가이드를 다시 열어볼 수 있도록 지원
  * 가이드 확인 후 미설치 상태일 경우 자연스럽게 '사전 설치 마법사'로 연결

### 2. 🌐 다국어(KO/EN) 및 UI 완성도 향상
* 한국어와 영어 환경 모두 매끄러운 다국어 번역 지원
* 다크/라이트 테마 카드 UI 최적화
* 홈 화면의 주요 기능 설명을 최신 성우 생성 메커니즘에 맞게 일관성 있게 정비

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
* **유튜브에서 추출**: 좋아하는 유튜브 영상의 링크를 넣고 원하는 구간(3초~30초)을 바로 추출
* **오디오 파일 업로드**: 소장하고 있는 음성 파일(mp3, wav, m4a, flac 등)을 끌어다 놓기만 하면 등록 완료
* **정밀 파형 자르기(오디오 트리밍)**: 녹음하거나 가져온 음성의 앞뒤 묵음이나 불필요한 부분을 마우스 드래그로 손쉽게 편집 가능

### 4. ⚡ AI 모델 사전 최적화 마법사
* 상단 헤더의 `AI 모델` 버튼을 통해 4.6GB 음성 모델을 미리 다운로드하고 컴퓨터의 하드웨어 가속(Apple Silicon MPS / NVIDIA CUDA / CPU) 환경을 사전에 워밍업할 수 있습니다.
* 귀여운 마스코트 **'소리담이'**가 설치 과정을 친절하고 유쾌하게 안내합니다.
