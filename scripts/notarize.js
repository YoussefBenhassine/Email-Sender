// Notarization script for code signing
// This is a placeholder for future implementation

const { notarize } = require('@electron/notarize');

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip notarization if credentials are not available
  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASS) {
    console.log('Skipping notarization: APPLE_ID or APPLE_ID_PASS not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.emailsender.pro',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASS,
  });
}; 