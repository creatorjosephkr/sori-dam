!macro customInit
  DetailPrint "기존 실행 중인 프로세스 강제 종료 중..."
  nsExec::ExecToStack 'taskkill /F /IM Sori-Dam.exe /T'
  nsExec::ExecToStack 'taskkill /F /IM VoxLocal.exe /T'
  nsExec::ExecToStack 'taskkill /F /IM python.exe /T'

  # 기존 설치 본 언인스톨러 탐색 및 무음 실행 (HKCU 및 HKLM 순차 탐색)
  # com.soridam.voicegen 및 레거시 com.voxcpm2.voicegen 대응
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.soridam.voicegen" "UninstallString"
  StrCmp $R0 "" check_old_hkcu CheckUninst

check_old_hkcu:
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.voxcpm2.voicegen" "UninstallString"
  StrCmp $R0 "" check_hklm CheckUninst

check_hklm:
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.soridam.voicegen" "UninstallString"
  StrCmp $R0 "" check_old_hklm CheckUninst

check_old_hklm:
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.voxcpm2.voicegen" "UninstallString"
  StrCmp $R0 "" CheckUninst CheckUninst

CheckUninst:
  StrCmp $R0 "" no_uninst
    ClearErrors
    # 기존 설치 경로를 파싱하고 무음(/S)으로 완전히 삭제
    ExecWait '$R0 /S _?=$INSTDIR'
  no_uninst:
!macroend
