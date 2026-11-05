"use strict";

const path = require("path");
const { notarize } = require("@electron/notarize");

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASS) {
    console.log("APPLE_ID or APPLE_ID_PASS not set, skipping notarization.");
    return;
  }

  const fs = require("fs");
  let appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    const files = fs.readdirSync(appOutDir);
    const found = files.find(f => f.endsWith(".app"));
    if (found) {
      appPath = path.join(appOutDir, found);
    }
  }

  console.log(`Notarizing ${appPath} (bundle id: ${context.packager.appInfo.id})`);

  try {
    await notarize({
      appBundleId: context.packager.appInfo.id,
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASS,
    });
    console.log("Notarization submitted successfully.");
  } catch (err) {
    console.error("Notarization failed:", err);
    throw err;
  }
};
