@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo === VoxCPM2 빌드 ===
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo 오류: Node.js가 설치되지 않았습니다.
    echo https://nodejs.org 에서 설치하세요.
    pause
    exit /b 1
)

echo [1/2] npm 의존성 설치 중...
npm install

echo [2/2] Windows 설치 파일 빌드 중...
npm run build:win

echo.
echo 완료! dist\ 폴더에서 설치 파일을 확인하세요.
explorer dist\
pause
