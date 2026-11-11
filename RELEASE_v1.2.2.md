# 소리담 (Sori-Dam) v1.2.2 릴리즈 노트

**릴리즈 일자**: 2026-11-11  
**버전**: `v1.2.2`

## GPU 호환성 개선

- Windows의 RTX 5050 8GB 및 RTX 50 시리즈 등 Compute Capability 10 이상 GPU에는 PyTorch/TorchAudio 2.7.1 + CUDA 12.8을 설치합니다. 기존 세대 GPU는 2.5.1 + CUDA 12.1 경로를 유지합니다.
- 기존 CPU 또는 구형 CUDA 패키지는 GPU에 맞는 패키지로 교체하며, Windows DLL 충돌을 줄이기 위해 PyTorch를 불러오기 전에 설치 버전을 확인합니다.
- GPU 가속 판정 시 실제 저정밀도 행렬 계산과 동기화를 수행합니다. CUDA 연산이 실패하면 CPU로 전환하고 드라이버 확인 안내를 기록합니다.
- GPU 모델 로딩 실패로 CPU로 전환된 경우 실제 모델 실행 장치를 화면에 반영합니다.
- CPU 대체 설치는 공식 CPU 전용 패키지 저장소를 사용합니다.
- Windows 스마트 앱 컨트롤 상태 및 관련 차단 오류를 감지하고 설정 안내를 표시합니다.

## 사용 조건 및 검증 범위

- NVIDIA GPU의 VRAM 최소 판정 기준은 기존과 동일한 5,500MiB입니다. 8GB라도 다른 앱의 사용량과 생성 길이에 따라 메모리가 부족할 수 있습니다.
- RTX 50 시리즈는 해당 GPU와 CUDA 12.8을 지원하는 NVIDIA 드라이버가 필요합니다.
- AMD/Intel GPU 가속은 이번 변경에 포함되지 않습니다. Apple Silicon의 MPS 경로는 유지됩니다.
- 자동화 검증: GPU 세대별 설치 선택, 드라이버 부재, GPU 연산 성공/실패, 저용량 VRAM, CPU 전환 후 장치 표시.
- Apple Silicon 개발 환경에서 코드 및 모의 검증을 수행했습니다.
- Windows v1.2.2 설치 파일은 사용자 테스트 성공 확인 후 배포합니다. GPU별 상세 성능 수치는 별도 측정하지 않았습니다.

## 다운로드

- Windows x64: `Sori-Dam-Setup-1.2.2.exe`
- macOS Apple Silicon: `Sori-Dam-1.2.2-arm64.dmg`
