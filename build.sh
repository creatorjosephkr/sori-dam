#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== VoxCPM2 빌드 ==="
echo ""

# Node.js 확인
if ! command -v node &>/dev/null; then
  echo "오류: Node.js가 설치되지 않았습니다."
  echo "https://nodejs.org 에서 설치하세요."
  exit 1
fi

# npm 의존성 설치
echo "[1/2] npm 의존성 설치 중..."
npm install

# 빌드
echo "[2/2] macOS DMG 빌드 중..."
npm run build:mac

echo ""
echo "완료! dist/ 폴더에서 DMG 파일을 확인하세요."
open dist/ 2>/dev/null || true
