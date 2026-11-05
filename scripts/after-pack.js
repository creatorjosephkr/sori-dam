'use strict';

const path = require('path');
const { execSync } = require('child_process');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const fs = require('fs');
  let appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    // macOS NFD/NFC 유니코드 정규화 차이 방어를 위한 디렉터리 자동 탐색
    const files = fs.readdirSync(context.appOutDir);
    const found = files.find(f => f.endsWith('.app'));
    if (found) {
      appPath = path.join(context.appOutDir, found);
    }
  }
  // Finder 및 macOS 전반에서 한글 별칭("소리담")으로 안전하게 표시되도록 ko.lproj / en.lproj InfoPlist.strings 주입
  try {
    const resDir = path.join(appPath, 'Contents', 'Resources');
    const koLproj = path.join(resDir, 'ko.lproj');
    if (!fs.existsSync(koLproj)) fs.mkdirSync(koLproj, { recursive: true });
    fs.writeFileSync(path.join(koLproj, 'InfoPlist.strings'), '"CFBundleDisplayName" = "소리담";\n', 'utf8');

    const enLproj = path.join(resDir, 'en.lproj');
    if (!fs.existsSync(enLproj)) fs.mkdirSync(enLproj, { recursive: true });
    fs.writeFileSync(path.join(enLproj, 'InfoPlist.strings'), '"CFBundleDisplayName" = "소리담";\n', 'utf8');
    console.log('[afterPack] Localized InfoPlist.strings ("소리담") 주입 완료');
  } catch (err) {
    console.warn(`[afterPack] InfoPlist.strings 생성 경고: ${err.message}`);
  }

  console.log(`[afterPack] Ad-hoc re-signing app bundle deeply at: ${appPath}`);

  try {
    // 혹시 남아있을 수 있는 격리 속성 제거
    execSync(`xattr -cr "${appPath}"`);
    // 내부 바이너리 및 라이브러리 전체 ad-hoc 서명
    execSync(`codesign --force --deep -s - "${appPath}"`);
    console.log(`[afterPack] Ad-hoc 서명 완료: ${appPath}`);
  } catch (err) {
    console.error(`[afterPack] 서명 실패: ${err.message}`);
    throw err;
  }
};
