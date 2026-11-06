// ── i18n + Theme System ──────────────────────────────────────────────────────

const TRANSLATIONS = {
  ko: {
    // 헤더
    'header.title': '완전 무료 Ai 음성 생성기 - 소리담(Sori-Dam)',
    'header.quit': '앱 종료',
    // 사이드바 브랜드
    'sidebar.appName': '소리담',
    'header.help': '시작 안내 가이드',
    // 사이드바 네비게이션
    'nav.home': '소개',
    'nav.create': '음성 만들기',
    'nav.history': '생성 기록',
    'nav.register': '내 목소리 등록하기',
    'nav.voices': '내 음성 관리',
    'nav.collapse': '접기',
    // 후원
    'donate.kakao': '커피 한 잔의 후원',
    'donate.paypal': 'PayPal 후원',
    'footer.privacy': '개인정보처리방침',
    // 소개 페이지
    'home.badge': '완전 무료 · 로컬 AI',
    'home.appName': '소리담',
    'home.appDesc': 'VoxCPM2 기반 로컬 인공지능 음성 생성기',
    'home.btnStart': '음성 만들기 시작',
    'home.howTitle': '사용 방법',
    'home.featTitle': '주요 기능',
    'home.step1.title': '내 음성 등록',
    'home.step1.desc': '3초 이상의 참조 음성 파일을 업로드하거나 직접 녹음하세요.',
    'home.step2.title': '텍스트 입력',
    'home.step2.desc': '생성할 텍스트와 원하는 음성 스타일을 입력하세요.',
    'home.step3.title': '음성 생성',
    'home.step3.desc': 'AI가 선택한 음성 특성으로 텍스트를 자연스럽게 변환합니다.',
    'home.step4.title': '저장 및 활용',
    'home.step4.desc': 'WAV로 다운로드하거나 내 음성으로 저장해 재활용하세요.',
    'home.title': 'AI 음성 생성기',
    'home.subtitle': '나만의 AI 음성을 만들어 보세요',
    'home.desc': '완전히 내 컴퓨터 안에서만 동작하는 로컬 AI 음성 생성기입니다.',
    'home.btnCreate': '음성 만들기',
    'home.btnRegister': '내 목소리 등록하기',
    'home.feat1.title': '성우 직접 생성',
    'home.feat1.desc': '음성 스타일 지정으로 나만의 성우 무제한 제작',
    'home.feat2.title': '내 음성 복제',
    'home.feat2.desc': '참조 음성으로 나만의 AI 음성 생성',
    'home.feat3.title': '스타일 제어',
    'home.feat3.desc': '자연어로 음성 톤과 감정 스타일 조정',
    'home.feat4.title': '완전 로컬 처리',
    'home.feat4.desc': '인터넷 없이 내 컴퓨터에서 완전 처리',
    // 음성 만들기
    'create.voiceLabel': '사용할 AI 음성',
    'create.voicePlaceholder': '음성을 선택하세요',
    'create.noVoice': '등록된 음성 없음',
    'create.textLabel': '생성할 텍스트',
    'create.textPlaceholder': '음성을 생성할 글자를 입력하세요...',
    'create.btn': '음성 생성하기',
    'create.generating': '생성 중...',
    'create.stop': '생성 중지',
    'create.logTitle': '실시간 처리 로그',
    'create.tabBasic': '기본 음성',
    'create.tabMy': '내 음성',
    'create.tabShared': '공유 저장소',
    'create.browseSharedBtn': '공유저장소 목록 · 선택',
    'create.voiceHintShared': '깃허브 공유 저장소의 음성을 선택하면 자동으로 가져와(Import) 내 음성으로 적용됩니다',
    'create.guide': '음성 스타일을 직접 입력하거나 음성을 선택하세요',
    'create.styleLabel': '음성 스타일',
    'create.styleOptional': '선택사항',
    'create.stylePlaceholder': '예: 활기차고 빠른 목소리, 차분하고 낮은 톤',
    'create.voiceSelectLabel': '음성 선택',
    'create.voiceSelectHint': '선택한 음성으로 안 만들어지기도 합니다',
    'create.voiceNone': '선택 안 함',
    'create.advanced': '고급 설정',
    'create.cfg': 'CFG 강도',
    'create.steps': '생성 단계',
    'create.volume': '볼륨 최대치',
    'create.speed': '재생 속도',
    'create.resetBtn': '기본값 재설정',
    'create.restartBtn': '새로 시작',
    'create.generateBtn': '생성하기',
    'create.saveAsVoice': '내 음성으로 저장',
    'create.modelLoadingTitle': 'AI 음성 모델 메모리 로드 중',
    'create.modelLoadingBadge': '최초 1회만 소요',
    'create.modelLoadingDesc': '첫 음성을 생성할 때는 고품질 AI 모델(약 4.6GB)을 시스템 메모리에 읽어오는데 시간이 다소 걸립니다.<br><span class="model-loading-highlight">다음 생성부터는 메모리에 유지되어 기다림 없이 즉시 생성됩니다.</span>',
    // 생성 기록
    'history.title': '생성 기록',
    'history.empty': '생성된 음성이 없습니다',
    'history.emptyDesc': '텍스트를 입력하고 음성을 생성해보세요.',
    'history.selectAll': '모두 선택',
    'history.deleteSelected': '선택 삭제',
    'history.edit': '편집',
    'history.download': '다운로드',
    'history.delete': '삭제',
    // 내 목소리 등록
    'reg.tabMic': '내 목소리 녹음하기',
    'reg.tabYoutube': '유튜브에서 추출하기',
    'reg.tabFile': '내 파일 등록하기',
    'reg.listTitle': '임시 음성 목록',
    'reg.listEmpty.mic': '녹음된 음성이 아직 없습니다',
    'reg.listEmpty.mic.desc': '왼쪽에서 음성을 녹음해 보세요!',
    'reg.listEmpty.youtube': '추출된 음성이 아직 없습니다',
    'reg.listEmpty.youtube.desc': '유튜브 URL을 입력하고 음성을 추출해 보세요!',
    'reg.listEmpty.file': '등록된 파일이 아직 없습니다',
    'reg.listEmpty.file.desc': '왼쪽에서 오디오 파일을 선택해 보세요!',
    'reg.voiceNameLabel': '음성 이름',
    'reg.voiceNamePlaceholder': '예: 내 시그니처 목소리',
    'reg.voiceTypeLabel': '음성 분류',
    'reg.genderLabel': '성별',
    'reg.female': '여성',
    'reg.male': '남성',
    'reg.stop': '정지',
    'reg.edit': '편집',
    'reg.register': '내 음성으로 등록하기',
    'reg.preview': '미리듣기',
    'reg.delete': '삭제',
    'reg.addToList': '임시 리스트에 추가',
    // 녹음 탭
    'mic.recordBtn': '녹음 시작하기',
    'mic.stopBtn': '녹음 완료',
    'mic.guide': '권장 녹음 시간: 최소 3초 ~ 최대 30초',
    // 유튜브 탭
    'yt.urlLabel': '유튜브 URL',
    'yt.urlPlaceholder': 'https://www.youtube.com/watch?v=...',
    'yt.loadBtn': '불러오기',
    'yt.startLabel': '시작 지점 (초)',
    'yt.endLabel': '종료 지점 (초)',
    'yt.extractBtn': '음성 추출하기',
    'yt.guide': '오디오 추출 조건: 최소 3초 ~ 최대 30초',
    // 파일 탭
    'file.dropTitle': '이곳에 오디오 파일을 드래그 앤 드롭 하세요',
    'file.browseBtn': '음성 파일 찾기',
    'file.formats': 'mp3, wav, flac, ogg, m4a, aac 등 일반적 오디오 포맷 지원',
    'file.guide': '오디오 파일 등록 조건: 오디오 길이 제한은 최소 3초 ~ 최대 30초 사이여야 등록이 허가됩니다.',
    // 내 음성 관리
    'voices.title': '내 음성 관리',
    'voices.empty': '등록된 음성이 없습니다',
    'voices.emptyDesc': '내 목소리 등록하기에서 음성을 등록해 보세요!',
    'voices.delete': '삭제',
    'voices.use': '이 음성으로 만들기',
    // 공통 버튼
    'btn.confirm': '확인',
    'btn.cancel': '취소',
    'btn.close': '닫기',
    'btn.agree': '동의하고 계속',
    // 음성 선택 드롭다운 그룹
    'voice.group.female': '여성',
    'voice.group.male': '남성',
    'voice.group.my': '내 목소리',
    'voice.group.femaleActor': 'Ai성우-여성',
    'voice.group.maleActor': 'Ai성우-남성',
    'voice.group.sharedRepo': '공유 저장소',
    'voices.sharedRepoBtn': '공유저장소 음성 가져오기',
    'shared.modalTitle': '깃허브 공유 저장소 음성 목록',
    'shared.refresh': '새로고침',
    'history.shareRepo': '공유저장소 공유하기',
    // 음성 플레이어 텍스트
    'voice.play': '재생',
    'voice.pause': '일시정지',
    'voice.synthesizing': '합성 중...',
    // 단위
    'unit.count': '개',
    'unit.char': '자',
    // 플레이어
    'player.placeholder': '"음성을 생성하면 여기서 미리 들을 수 있습니다"',
    // 내 음성 관리 빈 상태
    'voices.addBtn': '음성 등록',
    'voices.emptyMy': '등록된 내 목소리가 없습니다',
    'voices.emptyMyDesc': '[내 목소리 등록] 메뉴에서 주의사항 동의 후 마이크로 목소리를 녹음해 등록하세요!',
    'voices.emptyFemale': '등록된 여성 AI 성우가 없습니다',
    'voices.emptyFemaleDesc': '우측 상단의 [음성 등록] 버튼을 눌러 여성 음성 파일을 올려보세요.',
    'voices.emptyMale': '등록된 남성 AI 성우가 없습니다',
    'voices.emptyMaleDesc': '우측 상단의 [음성 등록] 버튼을 눌러 남성 음성 파일을 올려보세요.',
    // 녹음/유튜브 탭 추가 안내
    'mic.statusIdle': '버튼을 눌러 나만의 목소리 녹음을 시작하세요',
    'yt.setStart': '[← 시작시간 등록',
    'yt.setEnd': '종료시간 등록 →]',
    // 후원 모달
    'donate.title': '개발자 후원하기',
    'donate.speech': '소리담을 응원해주셔서 정말 고마워요!<br>따뜻한 커피 한 잔의 후원이 개발에 큰 힘이 됩니다!',
    'donate.kakaobankTitle': '카카오뱅크 후원',
    'donate.paypalTitle': 'PayPal 후원',
    'donate.desc': '소리담을 응원해주셔서 감사합니다!<br>카카오뱅크 QR코드로 후원하실 수 있어요.',
    'donate.qrDesc': '카메라로 QR코드를 스캔하시면<br>카카오뱅크 송금 화면으로 이동합니다.',
    'donate.paypalDesc': 'PayPal 로고를 클릭하시면<br>기본 웹브라우저에서 후원 창이 열립니다.',
    // 음성 힌트
    'create.voiceHintMy': '등록한 음성을 선택하세요. 내 음성 관리 메뉴에서 본인의 음성을 등록할 수 있습니다',
    // 기본 음성 이름 (한국어는 원래 이름 그대로)
    'voice.name.female_standard': '여성 – 기본',
    'voice.name.female_warm': '여성 – 따뜻함',
    'voice.name.female_cheerful': '여성 – 활기참',
    'voice.name.male_standard': '남성 – 기본',
    'voice.name.male_calm': '남성 – 차분함',
    'voice.name.male_strong': '남성 – 힘참',
    // 업데이트 팝업 번역
    'update.title': '새로운 업데이트 소식',
    'update.body': '새로운 버전이 준비되었습니다. 지금 다운로드하여 최신 인공지능 기능과 개선사항을 경험해보세요!',
    'update.current': '현재 버전',
    'update.latest': '최신 버전',
    'update.btnDownload': '다운로드 페이지로 이동',
    'update.btnLater': '나중에 하기',
    // 소리담 첫 시작 가이드 (웰컴 모달)
    'welcome.badge': '소리담 첫 시작 가이드',
    'welcome.title': '소리담(Sori-Dam)에 오신 것을 환영합니다!',
    'welcome.subtitle': '자유롭게 나만의 AI 성우를 만들고 무제한으로 음성을 생성해보세요.',
    'welcome.sec1.title': '직접 만드는 나만의 성우',
    'welcome.sec1.desc': '소리담에는 고정된 기본 성우가 없습니다. 원하는 <strong>음성 스타일을 텍스트로 지정</strong>하여 새로운 성우를 직접 생성하거나, <strong>내 목소리(3초~30초)를 등록</strong>하여 나만의 전속 성우로 무제한 활용할 수 있습니다.',
    'welcome.sec2.title': '첫 생성 시 모델 로딩 시간 안내',
    'welcome.sec2.desc': '앱 실행 후 첫 음성을 생성할 때 거대 AI 모델(약 4.6GB)을 시스템 메모리에 로드하므로 <strong>최초 1회만 약 30초~수 분이 소요</strong>될 수 있습니다. 멈춘 것이 아니며, 이후부터는 메모리 캐시 덕분에 <strong>매우 빠르고 쾌적하게 생성</strong>됩니다.',
    'welcome.sec3.title': '100% 무료 & 오픈소스 라이선스',
    'welcome.sec3.desc': '소리담은 누구나 제한 없이 자유롭게 이용할 수 있는 <strong>100% 완전 무료 오픈소스</strong>입니다. 개인 및 상업적 콘텐츠 제작에 자유롭게 활용하실 수 있으며, <strong>출처 표기(소리담 / GitHub 저장소)</strong>를 지켜주시면 소스코드 수정 및 배포도 자유롭습니다.',
    'welcome.dontShow': '다시 보지 않기',
    'welcome.btnStart': '소리담 시작하기',
    // AI 모델 사전 설치 마법사
    'preinstall.badge': '하드웨어 가속 및 AI 모델 사전 최적화',
    'preinstall.introTitle': '소리담 첫 시작을 환영합니다!',
    'preinstall.introDesc': '첫 음성을 생성할 때 대용량 다운로드로 수 분간 멈추는 지연을 없애기 위해, <strong>고품질 AI 음성 모델(VoxCPM2, 약 4.6GB) 및 가속 환경 사전 설치</strong>를 권장합니다.',
    'preinstall.benefit1Title': '첫 생성 지연 제로',
    'preinstall.benefit1Desc': '처음 만들 때 기다림 없이 즉시 쾌적하게 음성을 생성합니다.',
    'preinstall.benefit2Title': '하드웨어 가속 최적화',
    'preinstall.benefit2Desc': '내 컴퓨터의 가속 엔진(Apple Silicon MPS / NVIDIA CUDA / CPU)을 사전에 워밍업합니다.',
    'preinstall.benefit3Title': '100% 완전 오프라인',
    'preinstall.benefit3Desc': '한 번만 받아두면 인터넷 연결 없이도 언제든 무제한 구동됩니다.',
    'preinstall.btnStart': '지금 바로 사전 설치 및 가속 최적화 (권장)',
    'preinstall.btnSkip': '나중에 하기 (첫 음성 생성 시 자동 다운로드)',
    'preinstall.step1': '가속 점검',
    'preinstall.step2': '모델 다운로드',
    'preinstall.step3': '가속 웜업 & 로드',
    'preinstall.step4': '준비 완료',
    'preinstall.toggleLog': '세부 설치 로그 보기',
    'preinstall.successTitle': '모든 준비가 완벽하게 완료되었습니다!',
    'preinstall.successDesc': '내 컴퓨터의 하드웨어 가속 엔진과 고품질 음성 가중치가 메모리에 준비되었습니다.<br>이제 기다림 없이 바로 첫 목소리를 빚어보세요!',
    'preinstall.btnStartVoice': '소리담 시작하기',
    'preinstall.alreadyTitle': 'AI 음성 모델이 준비되어 있습니다',
    'banner.modelTitle': 'AI 음성 생성 모델(약 4.6GB)이 아직 사전 설치되지 않았습니다.',
    'banner.modelDesc': '첫 음성 생성 시 모델 다운로드로 수 분이 걸릴 수 있습니다. 귀여운 안내와 함께 미리 준비해보세요!',
    // 개인정보처리방침 모달
    'privacy.badge': '100% 로컬 프라이버시 보호',
    'privacy.title': '소리담 개인정보처리방침',
    'privacy.subtitle': '소리담은 사용자의 어떠한 정보도 수집하거나 외부 서버에 전송하지 않습니다.',
    'privacy.sec1.title': '어떠한 정보도 수집 및 외부 전송하지 않습니다',
    'privacy.sec1.desc': '소리담은 <strong>회원가입이나 로그인이 전혀 필요 없으며</strong>, 사용자가 입력한 텍스트, 녹음하거나 추출한 음성 데이터, 생성된 오디오 파일 등 어떠한 정보도 <strong>외부 서버나 클라우드로 전송하지 않습니다</strong>.',
    'privacy.sec2.title': '100% 온디바이스 로컬 독립 구동',
    'privacy.sec2.desc': '인공지능 음성 생성 엔진(VoxCPM2)은 <strong>오직 사용자의 컴퓨터 내부 하드웨어(CPU/GPU/MPS)에서만 직접 실행</strong>됩니다. 인터넷 연결이 차단된 오프라인 상태에서도 완벽하게 동작합니다.',
    'privacy.sec3.title': '데이터 보관 및 완전한 삭제 권리',
    'privacy.sec3.desc': '음성 생성 기록 및 등록된 성우 데이터는 <strong>오직 내 컴퓨터의 로컬 데이터 폴더에만 보관</strong>됩니다. 사용자가 원할 때 언제든 개별 삭제할 수 있으며, 앱 삭제 시 모든 데이터는 함께 완전히 파기됩니다.',
    'privacy.btnConfirm': '확인',
    // 푸터
    'footer.copyright': 'Copyright © 2026 크리에이터 요셉 (creatorjoseph@kakao.com)',
  },

  en: {
    // Header
    'header.title': 'Free AI Voice Generator - Sori-Dam',
    'header.quit': 'Quit App',
    // Sidebar brand
    'sidebar.appName': 'Sori-Dam',
    'header.help': 'Quick Guide',
    // Sidebar nav
    'nav.home': 'About',
    'nav.create': 'Create Voice',
    'nav.history': 'History',
    'nav.register': 'Register Voice',
    'nav.voices': 'Manage Voices',
    'nav.collapse': 'Collapse',
    // Donate
    'donate.kakao': 'Buy Me a Coffee',
    'donate.paypal': 'PayPal Donate',
    'footer.privacy': 'Privacy Policy',
    // Home page
    'home.badge': 'Free · Local AI',
    'home.appName': 'Sori-Dam',
    'home.appDesc': 'VoxCPM2-based Local AI Voice Generator',
    'home.btnStart': 'Start Creating Voice',
    'home.howTitle': 'How to Use',
    'home.featTitle': 'Key Features',
    'home.step1.title': 'Register Voice',
    'home.step1.desc': 'Upload a reference audio file (3+ sec) or record directly.',
    'home.step2.title': 'Enter Text',
    'home.step2.desc': 'Type the text you want to generate and the voice style.',
    'home.step3.title': 'Generate Voice',
    'home.step3.desc': 'AI converts your text naturally using the selected voice.',
    'home.step4.title': 'Save & Use',
    'home.step4.desc': 'Download as WAV or save as your voice for reuse.',
    'home.title': 'AI Voice Generator',
    'home.subtitle': 'Create your own AI voice',
    'home.desc': 'A fully local AI voice generator that runs entirely on your computer.',
    'home.btnCreate': 'Create Voice',
    'home.btnRegister': 'Register My Voice',
    'home.feat1.title': 'Custom Voice Design',
    'home.feat1.desc': 'Design unlimited custom voice actors via style prompts',
    'home.feat2.title': 'Voice Cloning',
    'home.feat2.desc': 'Create your own AI voice from a reference recording',
    'home.feat3.title': 'Style Control',
    'home.feat3.desc': 'Adjust voice tone and emotion with natural language',
    'home.feat4.title': 'Fully Local',
    'home.feat4.desc': 'Processed entirely on your computer, no internet needed',
    // Create voice
    'create.voiceLabel': 'AI Voice',
    'create.voicePlaceholder': 'Select a voice',
    'create.noVoice': 'No voices registered',
    'create.textLabel': 'Text to Generate',
    'create.textPlaceholder': 'Enter the text you want to generate...',
    'create.btn': 'Generate Voice',
    'create.generating': 'Generating...',
    'create.stop': 'Stop Generation',
    'create.logTitle': 'Live Processing Log',
    'create.tabBasic': 'Built-in Voices',
    'create.tabMy': 'My Voices',
    'create.tabShared': 'Shared Repo',
    'create.browseSharedBtn': 'Browse Shared Voices',
    'create.voiceHintShared': 'Selecting a voice from the GitHub shared repository automatically imports and applies it',
    'create.guide': 'Enter a voice style or select a voice',
    'create.styleLabel': 'Voice Style',
    'create.styleOptional': 'Optional',
    'create.stylePlaceholder': 'e.g. energetic and fast, calm and low tone',
    'create.voiceSelectLabel': 'Voice Selection',
    'create.voiceSelectHint': 'May not always follow the selected voice exactly',
    'create.voiceNone': 'None',
    'create.advanced': 'Advanced Settings',
    'create.cfg': 'CFG Strength',
    'create.steps': 'Generation Steps',
    'create.volume': 'Volume Ceiling',
    'create.speed': 'Playback Speed',
    'create.resetBtn': 'Reset to Defaults',
    'create.restartBtn': 'Start Over',
    'create.generateBtn': 'Generate',
    'create.saveAsVoice': 'Save as My Voice',
    'create.modelLoadingTitle': 'Loading AI Voice Model into Memory',
    'create.modelLoadingBadge': 'First time only',
    'create.modelLoadingDesc': 'The first voice generation requires loading the 4.6GB AI model into system memory.<br><span class="model-loading-highlight">Subsequent generations will be instantaneous with cached memory.</span>',
    // History
    'history.title': 'Generation History',
    'history.empty': 'No voices generated yet',
    'history.emptyDesc': 'Go to Create Voice, enter some text and generate a voice!',
    'history.selectAll': 'Select All',
    'history.deleteSelected': 'Delete Selected',
    'history.edit': 'Edit',
    'history.download': 'Download',
    'history.delete': 'Delete',
    // Register voice
    'reg.tabMic': 'Record My Voice',
    'reg.tabYoutube': 'Extract from YouTube',
    'reg.tabFile': 'Upload File',
    'reg.listTitle': 'Temp Voice List',
    'reg.listEmpty.mic': 'No recordings yet',
    'reg.listEmpty.mic.desc': 'Record your voice on the left!',
    'reg.listEmpty.youtube': 'No extracted audio yet',
    'reg.listEmpty.youtube.desc': 'Enter a YouTube URL and extract audio!',
    'reg.listEmpty.file': 'No files uploaded yet',
    'reg.listEmpty.file.desc': 'Select an audio file on the left!',
    'reg.voiceNameLabel': 'Voice Name',
    'reg.voiceNamePlaceholder': 'e.g. My Signature Voice',
    'reg.voiceTypeLabel': 'Voice Type',
    'reg.genderLabel': 'Gender',
    'reg.female': 'Female',
    'reg.male': 'Male',
    'reg.stop': 'Stop',
    'reg.edit': 'Edit',
    'reg.register': 'Register as My Voice',
    'reg.preview': 'Preview',
    'reg.delete': 'Delete',
    'reg.addToList': 'Add to List',
    // Mic tab
    'mic.recordBtn': 'Start Recording',
    'mic.stopBtn': 'Done Recording',
    'mic.guide': 'Recommended: 3 sec minimum ~ 30 sec maximum',
    // YouTube tab
    'yt.urlLabel': 'YouTube URL',
    'yt.urlPlaceholder': 'https://www.youtube.com/watch?v=...',
    'yt.loadBtn': 'Load',
    'yt.startLabel': 'Start Point (sec)',
    'yt.endLabel': 'End Point (sec)',
    'yt.extractBtn': 'Extract Audio',
    'yt.guide': 'Extraction condition: 3 sec minimum ~ 30 sec maximum',
    // File tab
    'file.dropTitle': 'Drag & drop your audio file here',
    'file.browseBtn': 'Browse Audio File',
    'file.formats': 'Supports mp3, wav, flac, ogg, m4a, aac and more',
    'file.guide': 'Audio file condition: length must be between 3 and 30 seconds to be accepted.',
    // Manage voices
    'voices.title': 'Manage My Voices',
    'voices.empty': 'No voices registered',
    'voices.emptyDesc': 'Go to Register Voice and add your first voice!',
    'voices.delete': 'Delete',
    'voices.use': 'Use This Voice',
    // Common buttons
    'btn.confirm': 'Confirm',
    'btn.cancel': 'Cancel',
    'btn.close': 'Close',
    'btn.agree': 'Agree & Continue',
    // Voice select dropdown groups
    'voice.group.female': 'Female',
    'voice.group.male': 'Male',
    'voice.group.my': 'My Voice',
    'voice.group.femaleActor': 'AI Actor - Female',
    'voice.group.maleActor': 'AI Actor - Male',
    'voice.group.sharedRepo': 'Shared Repo',
    'voices.sharedRepoBtn': 'Import from Shared Repo',
    'shared.modalTitle': 'GitHub Shared Repository Voices',
    'shared.refresh': 'Refresh',
    'history.shareRepo': 'Share to Repo',
    // Voice player text
    'voice.play': 'Play',
    'voice.pause': 'Pause',
    'voice.synthesizing': 'Synthesizing...',
    // Units
    'unit.count': '',
    'unit.char': ' chars',
    // Player
    'player.placeholder': '"Generate a voice to preview it here"',
    // Manage voices empty states
    'voices.addBtn': 'Add Voice',
    'voices.emptyMy': 'No personal voices registered',
    'voices.emptyMyDesc': 'Go to [Register Voice] and record your voice after accepting the notice.',
    'voices.emptyFemale': 'No female AI actors registered',
    'voices.emptyFemaleDesc': 'Click the [Add Voice] button to upload a female voice file.',
    'voices.emptyMale': 'No male AI actors registered',
    'voices.emptyMaleDesc': 'Click the [Add Voice] button to upload a male voice file.',
    // Mic / YouTube tab
    'mic.statusIdle': 'Press the button to start recording your voice',
    'yt.setStart': '[← Set Start',
    'yt.setEnd': 'Set End →]',
    // Donate modal
    'donate.title': 'Support the Developer',
    'donate.speech': 'Thank you so much for supporting Sori-Dam!<br>Buying a warm cup of coffee keeps development going!',
    'donate.kakaobankTitle': 'KakaoBank Donate',
    'donate.paypalTitle': 'PayPal Donate',
    'donate.desc': 'Thank you for supporting Sori-Dam!<br>You can donate via KakaoBank QR code.',
    'donate.qrDesc': 'Scan the QR code with your camera<br>to open the KakaoBank transfer screen.',
    'donate.paypalDesc': 'Click the PayPal logo to open<br>the donation page in your browser.',
    // Voice hint
    'create.voiceHintMy': 'Select a registered voice. You can record and register your own voice in Manage Voices.',
    // 기본 음성 이름 (영어)
    'voice.name.female_standard': 'Female – Standard',
    'voice.name.female_warm': 'Female – Warm',
    'voice.name.female_cheerful': 'Female – Cheerful',
    'voice.name.male_standard': 'Male – Standard',
    'voice.name.male_calm': 'Male – Calm',
    'voice.name.male_strong': 'Male – Strong',
    // Update Notification
    'update.title': 'New Update Available',
    'update.body': 'A new version is available! Download now to experience the latest AI features and improvements.',
    'update.current': 'Current Version',
    'update.latest': 'Latest Version',
    'update.btnDownload': 'Go to Download Page',
    'update.btnLater': 'Later',
    // Welcome Guide Modal
    'welcome.badge': 'Sori-Dam Quick Guide',
    'welcome.title': 'Welcome to Sori-Dam!',
    'welcome.subtitle': 'Create your own custom AI voice actors freely and generate unlimited voices.',
    'welcome.sec1.title': 'Custom AI Voice Actors',
    'welcome.sec1.desc': 'Sori-Dam has no fixed default actors. Design your own voices with <strong>natural language style prompts</strong>, or <strong>register your own voice (3-30s)</strong> to create custom cloned actors.',
    'welcome.sec2.title': 'Model Loading on First Run',
    'welcome.sec2.desc': 'When generating voice for the first time, loading the 4.6GB AI model into memory takes <strong>30s to a few minutes for the first time only</strong>. It has not frozen! Subsequent generations will be lightning fast.',
    'welcome.sec3.title': '100% Free & Open Source',
    'welcome.sec3.desc': 'Sori-Dam is <strong>100% completely free and open-source</strong> for everyone (commercial and personal use). You are free to modify and redistribute source code with proper <strong>attribution (Sori-Dam / GitHub repository)</strong>.',
    'welcome.dontShow': 'Do not show again',
    'welcome.btnStart': 'Get Started',
    // AI Model Pre-installation Wizard
    'preinstall.badge': 'Hardware Acceleration & Model Optimization',
    'preinstall.introTitle': 'Welcome to Sori-Dam!',
    'preinstall.introDesc': 'To avoid multi-minute freezes on your first voice generation, we recommend <strong>pre-installing the high-quality AI voice model (VoxCPM2, ~4.6GB) and acceleration environment</strong>.',
    'preinstall.benefit1Title': 'Zero First-Gen Delay',
    'preinstall.benefit1Desc': 'Generate speech right away without minutes of waiting on first run.',
    'preinstall.benefit2Title': 'Hardware Acceleration',
    'preinstall.benefit2Desc': 'Pre-warms and compiles acceleration kernels (Apple Silicon MPS / NVIDIA CUDA / CPU).',
    'preinstall.benefit3Title': '100% Completely Offline',
    'preinstall.benefit3Desc': 'Download once and run completely offline anytime with zero data usage.',
    'preinstall.btnStart': 'Pre-install & Optimize Now (Recommended)',
    'preinstall.btnSkip': 'Do it later (Download on first generation)',
    'preinstall.step1': 'Check HW',
    'preinstall.step2': 'Download Model',
    'preinstall.step3': 'Engine Warm-up',
    'preinstall.step4': 'Ready',
    'preinstall.toggleLog': 'View Detailed Log',
    'preinstall.successTitle': 'Everything is Ready!',
    'preinstall.successDesc': 'Your hardware acceleration engine and high-quality voice model are loaded into memory.<br>Start crafting your voice right away!',
    'preinstall.btnStartVoice': 'Start Sori-Dam',
    'preinstall.alreadyTitle': 'AI Voice Model is Ready',
    'banner.modelTitle': 'AI Voice Model (~4.6GB) has not been pre-installed yet.',
    'banner.modelDesc': 'First generation may take several minutes to download. Prepare in advance with friendly guide!',
    // Privacy Policy Modal
    'privacy.badge': '100% Local Privacy Protection',
    'privacy.title': 'Sori-Dam Privacy Policy',
    'privacy.subtitle': 'Sori-Dam does not collect or transmit any of your personal information to external servers.',
    'privacy.sec1.title': 'Zero Data Collection & Transmission',
    'privacy.sec1.desc': 'Sori-Dam <strong>does not require any sign-up or login</strong>. Any text you enter, voices you record/extract, and generated audios are <strong>never sent to any external server or cloud</strong>.',
    'privacy.sec2.title': '100% On-Device Local Processing',
    'privacy.sec2.desc': 'The AI voice model (VoxCPM2) runs <strong>strictly on your local computer hardware (CPU/GPU/MPS)</strong>. It operates completely offline with zero internet access required.',
    'privacy.sec3.title': 'Data Retention & Full Deletion Rights',
    'privacy.sec3.desc': 'Generated recordings and voice models are <strong>stored exclusively in your local app data folder</strong>. You can view, export, or delete them anytime, and uninstalling removes all data completely.',
    'privacy.btnConfirm': 'Close',
    // Footer
    'footer.copyright': 'Copyright © 2026 Creator Joseph (creatorjoseph@kakao.com)',
  }
};

// ── 현재 언어 / 테마 상태 ────────────────────────────────────────────────────
let _lang = 'ko';
let _theme = 'light';

/** 번역 문자열 반환 */
function t(key) {
  return (TRANSLATIONS[_lang] && TRANSLATIONS[_lang][key]) ||
         (TRANSLATIONS['ko'][key]) || key;
}

/** data-i18n 속성을 가진 모든 요소 업데이트 */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.hasAttribute('placeholder')) el.placeholder = val;
    } else if (el.hasAttribute('data-i18n-html') || (typeof val === 'string' && val.includes('<'))) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  // data-i18n-attr-{attrName}="key" 패턴 처리 (CSS attr() 연동용)
  document.querySelectorAll('[data-i18n-attr-data-placeholder]').forEach(el => {
    el.setAttribute('data-placeholder', t(el.getAttribute('data-i18n-attr-data-placeholder')));
  });
  document.documentElement.lang = _lang;
}

/** 언어 전환 */
function setLanguage(lang) {
  _lang = lang;
  try { localStorage.setItem('vox_lang', lang); } catch (_) {}
  applyI18n();
  // 언어 버튼 레이블 업데이트
  const btn = document.getElementById('btnLang');
  if (btn) btn.setAttribute('title', lang === 'ko' ? 'Switch to English' : '한국어로 전환');
  const label = document.getElementById('btnLangLabel');
  if (label) label.textContent = lang === 'ko' ? 'English' : '한국어';
  // 동적 콘텐츠 재렌더링 (등록된 경우)
  if (typeof renderVoiceSelect === 'function') renderVoiceSelect();
  if (typeof renderRegisterVoiceList === 'function') renderRegisterVoiceList();
  if (typeof renderMyVoices === 'function') renderMyVoices();
  if (typeof renderHistory === 'function') renderHistory();
  if (typeof renderOutputs === 'function') renderOutputs();
  // voiceSelectHint 즉시 갱신
  const hint = document.getElementById('voiceSelectHint');
  if (hint && typeof getVoiceHint === 'function') {
    hint.textContent = getVoiceHint(window.S ? window.S.tab : 'basic');
  }
}

const THEME_SVG_SUN = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const THEME_SVG_MOON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

/** 다크/라이트 모드 전환 */
function setTheme(theme) {
  _theme = theme;
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  try { localStorage.setItem('vox_theme', theme); } catch (_) {}
  const icon = document.getElementById('btnThemeIcon');
  if (icon) {
    icon.innerHTML = theme === 'dark' ? THEME_SVG_SUN : THEME_SVG_MOON;
  }
}

/** 초기화 — 저장된 언어/테마 복원 */
function initI18nAndTheme() {
  try {
    const savedLang = localStorage.getItem('vox_lang') || 'ko';
    const savedTheme = localStorage.getItem('vox_theme') || 'light';
    _lang = savedLang;
    _theme = savedTheme;
  } catch (_) {}
  setTheme(_theme);
  applyI18n();
  // 저장된 언어가 en일 경우 드롭다운도 재렌더링
  if (typeof renderVoiceSelect === 'function') renderVoiceSelect();
  // 버튼 초기 레이블
  const label = document.getElementById('btnLangLabel');
  if (label) label.textContent = _lang === 'ko' ? 'English' : '한국어';
  const icon = document.getElementById('btnThemeIcon');
  if (icon) icon.innerHTML = _theme === 'dark' ? THEME_SVG_SUN : THEME_SVG_MOON;
}
