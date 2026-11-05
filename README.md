<div align="center">
<p align="center">
  <img src="/joseph.jpg" width="60%" alt="크리에이터 요셉" /><br />
  "나에게 필요한 앱을 바이브 코딩으로 직접 만드는 반백살 인디 개발자 아저씨입니다."
</p>

<br />
<br />
<br />
<img src="build/icon.iconset/icon_128x128@2x.png" width="120" alt="소리담 아이콘">

# 소리담 (Sori-Dam)
### 완전 무료 AI 음성 생성기

**🇰🇷 한국어** | [🇺🇸 English](#english)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)]()
[![Release](https://img.shields.io/github/v/release/creatorjosephkr/sori-dam)](https://github.com/creatorjosephkr/sori-dam/releases)

</div>

---

### 📖 [브랜드 스토리] 세상에서 가장 안전한 그릇, 소리담

> **"소리를 담다, 마음을 담다."**
> 
> 우리가 내뱉는 목소리에는 단순한 정보 이상의 '나'라는 정체성과 감정이 담겨 있습니다. 하지만 인공지능 기술이 발전할수록, 우리의 소중한 목소리 데이터는 거대한 클라우드 서버 너머로 유출될 위험에 직면해 있습니다.
> 
> '소리담'은 이러한 고민에서 출발했습니다.  
> 외부 네트워크나 거대 서버의 도움 없이, 오직 당신의 기기(로컬) 안에서만 완결되는 단단한 기술력을 바탕으로 합니다. 당신의 목소리를 정교한 인공지능 기술로 빚어내어 가장 안전한 기기라는 그릇 속에 **'오롯이 담아냅니다.'**
> 
> 밖으로 새어 나가지 있기에 안심할 수 있고, 기기 내부에서 즉시 샘솟기에 그 어떤 소리보다 빠르고 자연스럽습니다.  
> 기술의 정밀함 위에 따뜻한 보안을 더한 곳.
> 
> 지금, 당신의 안전한 AI 음성 공방 **'소리담'**이 문을 엽니다.

---

## 소리담이란?

**소리담**은 완전히 내 컴퓨터 안에서만 동작하는 **무료 로컬 AI 음성 생성기**입니다.  
인터넷이나 외부 서버에 데이터를 보내지 않아 **개인 정보가 완벽하게 보호**되며, 별도 구독료나 사용 요금 없이 무제한으로 사용할 수 있습니다.

1. **AI 음성 복제 엔진**: 소리담의 강력한 음성 생성 엔진은 **VoxCPM2**를 기반으로 작동하여 극도로 자연스럽고 어조가 살아있는 음성을 빚어냅니다.
2. **원클릭 자동 패키지 구성**: VoxCPM2 구동에 필요한 고성능 파이썬(Python) 및 핵심 AI 패키지(PyTorch 등) 요소는 최초 실행 시 **앱 내부에서 전부 자동으로 다운로드 및 설치**를 수행하므로 별도의 까다로운 사전 셋업이 전혀 필요하지 않습니다.

> 📸 **[스크린샷 추가 예정 - 앱 메인 화면]**

---

## ✨ 주요 기능

### 🎙️ AI 음성 생성
텍스트를 입력하면 등록된 AI 음성으로 자연스러운 음성을 생성합니다.

### 🎤 내 목소리 등록하기
3가지 방법으로 나만의 AI 음성 모델을 등록할 수 있습니다.
- **직접 녹음** — 마이크로 3~30초 목소리를 녹음
- **유튜브에서 추출** — 유튜브 영상 URL로 특정 구간 음성 추출
- **파일 업로드** — mp3, wav, flac, ogg, m4a, aac 등 직접 업로드

### 📋 생성 기록
생성된 모든 음성이 자동 저장되며 언제든 재생 및 재편집할 수 있습니다.

### ✂️ 오디오 편집
생성된 음성 및 녹음본에 대한 트림(구간 편집) 기능을 제공합니다.

### 👤 내 음성 관리
등록된 AI 음성 목록을 확인하고 관리합니다.

> 📸 **[스크린샷 추가 예정 - 음성 만들기 화면]**

> 📸 **[스크린샷 추가 예정 - 내 목소리 등록하기 화면]**

---

## 💻 시스템 요구사항

| 항목 | macOS | Windows |
|------|-------|---------|
| **지원 OS** | macOS 13 (Ventura) 이상 | Windows 10 / 11 |
| **칩셋** | Apple Silicon (M 시리즈) ⚠️ Intel 미지원 | x64 (64비트) |
| **RAM** | 8GB 이상 권장 | 8GB 이상 권장 |
| **저장공간** | 3GB 이상 여유 공간 | 3GB 이상 여유 공간 |
| **인터넷** | 최초 모델 다운로드 시 필요 | 최초 모델 다운로드 시 필요 |

> ⚠️ **macOS는 Apple Silicon (M 시리즈) 칩에서 잘 작동합니다.** Intel Mac은 지원하지 않습니다.

---

## 📥 설치 방법

### macOS (Apple Silicon)

1. [Releases 페이지](https://github.com/creatorjosephkr/sori-dam/releases)에서 최신 버전의 **`Sori-Dam-x.x.x-arm64.dmg`** 파일을 다운로드합니다.

2. 다운로드한 `.dmg` 파일을 실행합니다.

3. 열린 창에서 **Sori-Dam 아이콘**을 **Applications 폴더**로 드래그합니다.

   > 📸 **[스크린샷 추가 예정 - DMG 설치 창]**

4. Launchpad 또는 Applications 폴더에서 **Sori-Dam**을 실행합니다.

5. 처음 실행 시 macOS 보안 경고가 표시될 수 있습니다.  
   **시스템 설정 → 개인 정보 보호 및 보안 → "확인 없이 열기"** 를 클릭하세요.

   > 📸 **[스크린샷 추가 예정 - macOS 보안 허용 설정]**

---

### Windows

1. [Releases 페이지](https://github.com/creatorjosephkr/sori-dam/releases)에서 최신 버전의 **`Sori-Dam-Setup-x.x.x.exe`** 파일을 다운로드합니다.

2. 다운로드한 설치 파일을 실행합니다.

3. Windows Defender SmartScreen 경고가 표시되면 **"추가 정보"** → **"실행"** 을 클릭합니다.

   > 📸 **[스크린샷 추가 예정 - Windows SmartScreen 허용]**

4. 설치 경로를 선택하고 설치를 완료합니다.

5. 바탕화면 또는 시작 메뉴에서 **Sori-Dam**을 실행합니다.

---

## 🔒 개인정보 보호

소리담은 **완전 로컬 실행** 방식입니다.

- ✅ 모든 AI 처리는 내 컴퓨터 안에서만 실행됩니다
- ✅ 녹음한 목소리, 생성된 음성, 입력한 텍스트 모두 외부로 전송되지 않습니다
- ✅ 별도 계정 생성이나 로그인이 필요 없습니다
- ✅ 구독료 없이 무제한 사용 가능합니다

---

## 🙏 개발자 후원

소리담이 마음에 드셨다면 개발자를 응원해 주세요!

| 카카오뱅크 | PayPal |
|:---:|:---:|
| 📸 **[QR코드 이미지 추가 예정]** | [💙 PayPal로 후원하기](https://www.paypal.com/paypalme/tech1010?locale.x=ko_KR&country.x=KR) |

---

## 📄 라이선스

이 프로젝트는 [Apache License 2.0](LICENSE) 하에 배포됩니다.  
자유롭게 변경/배포 가능하지만 출처는 꼭 밝혀주시면 감사하겠습니다.

---

## 📬 문의

- **개발자:** 크리에이터 요셉 (creatorjoseph@kakao.com)
- **GitHub Issues:** [버그 신고 / 기능 요청](https://github.com/creatorjosephkr/sori-dam/issues)

---

<br>
<br>

---

<div align="center" id="english">

# Sori-Dam
### Free Local AI Voice Generator

[🇰🇷 한국어](#소리담-sori-dam) | **🇺🇸 English**

</div>

---

## What is Sori-Dam?

**Sori-Dam** is a completely **free, local AI voice generator** that runs entirely on your computer.  
Your data never leaves your machine — no external servers, no subscriptions, no usage fees. Generate unlimited AI voices with complete privacy.

1. **AI Voice Cloning Engine**: Sori-Dam is powered by the state-of-the-art **VoxCPM2** generation engine, creating extremely natural and expressive cloned voices.
2. **One-Click Automated Setup**: All required components, including Python and essential AI packages (such as PyTorch), are **automatically downloaded and installed** inside the app during the first run. No complicated manual setup is required.

> 📸 **[Screenshot placeholder — Main app screen]**

---

## ✨ Key Features

### 🎙️ AI Voice Generation
Enter text and generate natural-sounding speech using your registered AI voices.

### 🎤 Register Your Voice
Add your own AI voice model in 3 ways:
- **Direct Recording** — Record 3–30 seconds with your microphone
- **YouTube Extraction** — Extract audio from a specific segment of a YouTube video
- **File Upload** — Upload mp3, wav, flac, ogg, m4a, aac and more

### 📋 Generation History
All generated audio is automatically saved. Replay or re-edit at any time.

### ✂️ Audio Editing
Trim and edit generated audio and recordings with a built-in editor.

### 👤 Voice Management
View and manage all registered AI voices.

> 📸 **[Screenshot placeholder — Voice creation screen]**

> 📸 **[Screenshot placeholder — Voice registration screen]**

---

## 💻 System Requirements

| | macOS | Windows |
|--|-------|---------|
| **OS** | macOS 13 (Ventura) or later | Windows 10 / 11 |
| **Chip** | Apple Silicon (M1/M2/M3/M4) ⚠️ Intel not supported | x64 (64-bit) |
| **RAM** | 8GB or more recommended | 8GB or more recommended |
| **Storage** | 3GB free space | 3GB free space |
| **Internet** | Required for initial model download | Required for initial model download |

> ⚠️ **macOS version supports Apple Silicon (M-series) chips only.** Intel Macs are not supported.

---

## 📥 Installation

### macOS (Apple Silicon)

1. Download **`Sori-Dam-x.x.x-arm64.dmg`** from the [Releases page](https://github.com/creatorjosephkr/sori-dam/releases).

2. Open the downloaded `.dmg` file.

3. Drag the **Sori-Dam icon** into the **Applications folder**.

   > 📸 **[Screenshot placeholder — DMG install window]**

4. Launch **Sori-Dam** from Launchpad or the Applications folder.

5. If macOS shows a security warning on first launch:  
   Go to **System Settings → Privacy & Security → Open Anyway**.

   > 📸 **[Screenshot placeholder — macOS security allow screen]**

---

### Windows

1. Download **`Sori-Dam-Setup-x.x.x.exe`** from the [Releases page](https://github.com/creatorjosephkr/sori-dam/releases).

2. Run the downloaded installer.

3. If Windows Defender SmartScreen appears, click **"More info"** → **"Run anyway"**.

   > 📸 **[Screenshot placeholder — Windows SmartScreen allow screen]**

4. Choose your installation folder and complete the setup.

5. Launch **Sori-Dam** from the desktop shortcut or Start menu.

---

## 🔒 Privacy

Sori-Dam runs **100% locally** on your computer.

- ✅ All AI processing happens on your device — no cloud involved
- ✅ Your voice recordings, generated audio, and text are never uploaded
- ✅ No account or login required
- ✅ Unlimited use with no subscription

---

## 🙏 Support the Developer

If you enjoy Sori-Dam, please consider supporting development!

| KakaoBank (Korea) | PayPal |
|:---:|:---:|
| 📸 **[QR code image placeholder]** | [💙 Donate via PayPal](https://www.paypal.com/paypalme/tech1010?locale.x=ko_KR&country.x=KR) |

---

## 📄 License

Distributed under the [Apache License 2.0](LICENSE).  
Source code is not publicly available. Installation files are provided via GitHub Releases only.

---

## 📬 Contact

- **Developer:** Creator Joseph (creatorjoseph@kakao.com)
- **GitHub Issues:** [Bug reports / Feature requests](https://github.com/creatorjosephkr/sori-dam/issues)
