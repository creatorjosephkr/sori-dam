# 소리담 (Sori-Dam) v1.1.7 릴리즈 안내

<div align="center">

<img src="https://raw.githubusercontent.com/creatorjosephkr/sori-dam/main/build/icon.iconset/icon_128x128@2x.png" width="100" alt="소리담 아이콘">

# 🎙️ 소리담 (Sori-Dam) v1.1.7
### 완전 무료 로컬 AI 음성 생성기 (Voice Cloning & TTS)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Platform](https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)%20%7C%20Windows-lightgrey.svg)]()
[![Release Version](https://img.shields.io/badge/Release-v1.1.7-brightgreen.svg)](https://github.com/creatorjosephkr/sori-dam/releases/tag/v1.1.7)

> **"소리를 담다, 마음을 담다."**  
> 외부 네트워크나 클라우드 서버 전송 없이, 오직 내 컴퓨터 안에서 안전하게 나만의 목소리를 빚어내는 로컬 AI 음성 생성기 **'소리담' v1.1.7** 버전이 출시되었습니다.

</div>

---

## 📥 설치 파일 다운로드

| 플랫폼 | 설치 파일 | 지원 아키텍처 및 사양 | 파일 용량 |
|:---|:---|:---|:---|
| **macOS (Apple Silicon)** | **[`Sori-Dam-1.1.7-arm64.dmg`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.7/Sori-Dam-1.1.7-arm64.dmg)** | Apple Silicon (M1 / M2 / M3 / M4 전 기종 지원) | ~547 MB |
| **Windows** | **[`Sori-Dam-Setup-1.1.7.exe`](https://github.com/creatorjosephkr/sori-dam/releases/download/v1.1.7/Sori-Dam-Setup-1.1.7.exe)** | Windows 10 / 11 (64비트, NVIDIA CUDA & CPU 가속) | ~160 MB |

---

## 🚀 v1.1.7 주요 업데이트 내역

### 1. ⚡ 첫 음성 생성 시 실시간 AI 모델 로딩 안내창 & 진행바 추가
* **대기 시간 시각화**: 앱 실행 후 첫 음성을 생성할 때, 대용량 AI 모델(약 4.6GB)을 시스템 메모리에 적재하는 과정을 직관적으로 확인할 수 있는 상태 박스가 텍스트 입력창 아래에 표시됩니다.
* **실시간 용량 및 진행률 표시**: 전체 용량 대비 현재 로드된 용량(`0.0 GB / 4.6 GB`), 실시간 진행률(%), 가속 장치(Apple Silicon MPS / CUDA / CPU) 정보가 시각적으로 표시됩니다.
* **스마트 자동 닫힘**: 모델 적재가 완료되면 1.2초 후 자동으로 닫히며 즉시 음성 합성을 시작합니다. 다음 생성부터는 메모리에 유지되어 기다림 없이 즉시 생성됩니다.

### 2. 🎨 OS 간 일관성을 위한 SVG 벡터 아이콘 전면 교체
* 운영체제(macOS, Windows)나 폰트에 따라 다르게 깨져 보이던 모든 이모지를 세련된 SVG 벡터 아이콘으로 일괄 교체하여, 어떤 환경에서도 일관되고 깔끔한 디자인을 제공합니다.

### 3. 🎙️ 첫 실행 온보딩 가이드 및 재설치 경험 개선
* 앱 첫 실행 시 소리담의 나만의 AI 성우 제작 방식(스타일 텍스트 지정 생성 및 사용자 음성 복제), 모델 로딩 시간 안내, 100% 무료 오픈소스 라이선스를 명확히 안내합니다.
* `다시 보지 않기` 체크 상태를 세밀하게 관리하여 필요 시 언제든 상단 `?` 버튼으로 가이드를 다시 열어볼 수 있습니다.

### 4. 🛡️ 사이드바 개인정보처리방침 안내 버튼 및 모달 탑재
* 왼쪽 사이드바 후원 버튼 아래 `개인정보처리방침` 버튼이 추가되었습니다.
* 사용자 정보와 오디오 데이터를 일체 수집하거나 서버로 전송하지 않는 100% 온디바이스 로컬 독립 구동 원칙을 명확히 안내합니다.

### 5. 🛠️ 음성 생성 안정성 강화
* 첫 음성 생성 시 간헐적으로 스크립트 실행이 중단되던 스코프 문제를 원천 해결했습니다.
* 백엔드 SSE 로그 브로드캐스트의 스레드 안전성을 강화하여 진행 로그가 실시간으로 끊김 없이 표시됩니다.

---

## ✨ 소리담 기본 기능 소개

### 1. 🔒 100% 완전 로컬 구동 (철저한 개인정보 보호)
* 사용자의 목소리, 입력 텍스트, 생성된 오디오가 **외부 서버나 클라우드로 단 1바이트도 전송되지 않습니다.**
* 인터넷이 끊긴 오프라인 환경에서도 아무런 제약 없이 100% 무료로 무제한 사용 가능합니다.
* 회원가입, 로그인, 월 구독료 결제가 전혀 필요 없습니다.

### 2. ⚡ 하드웨어 가속 지원
* **macOS (Apple Silicon)**: Apple MPS(Metal Performance Shaders) 뉴럴 가속 자동 적용.
* **Windows**: NVIDIA CUDA GPU 텐서 코어 가속 및 고성능 CPU 멀티스레드 최적화.

---

## 💻 설치 및 실행 방법

### macOS 사용자
1. 다운로드한 **`Sori-Dam-1.1.7-arm64.dmg`** 파일을 더블클릭합니다.
2. 열린 창(`소리담 1.1.7`)에서 **소리담 아이콘**을 **Applications(응용 프로그램)** 폴더로 드래그하여 설치합니다.
3. Launchpad 또는 응용 프로그램 폴더에서 **소리담**을 실행합니다.

### Windows 사용자
1. **`Sori-Dam-Setup-1.1.7.exe`** 설치 파일을 다운로드합니다.
2. 설치 관리자의 안내에 따라 설치를 완료한 후 바탕화면 바로가기로 실행합니다.
