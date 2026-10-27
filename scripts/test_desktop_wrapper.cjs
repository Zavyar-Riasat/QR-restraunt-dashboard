/**
 * Verification test suite for Dineflow Electron Desktop Wrapper
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DESKTOP_DIR = path.join(ROOT, 'desktop');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('   Dineflow Electron Desktop Wrapper Verification     ');
console.log('====================================================\n');

// 1. Check folder separation
console.log('📁 Test Suite 1: Directory Structure & File Existence');
assert(fs.existsSync(DESKTOP_DIR), 'Folder /desktop exists separately from web app');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'package.json')), 'desktop/package.json exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'config.json')), 'desktop/config.json exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'README.md')), 'desktop/README.md exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'main.js')), 'desktop/src/main.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'preload.js')), 'desktop/src/preload.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'config.js')), 'desktop/src/config.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'windowManager.js')), 'desktop/src/windowManager.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'trayManager.js')), 'desktop/src/trayManager.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'alertService.js')), 'desktop/src/alertService.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'printService.js')), 'desktop/src/printService.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'autoUpdater.js')), 'desktop/src/autoUpdater.js exists');
assert(fs.existsSync(path.join(DESKTOP_DIR, 'src', 'offline.html')), 'desktop/src/offline.html exists');

// 2. Check Assets
console.log('\n🎨 Test Suite 2: Desktop Assets');
const assets = ['icon.png', 'tray-icon.png', 'icon.ico', 'order-alarm.wav'];
for (const a of assets) {
  const p = path.join(DESKTOP_DIR, 'assets', a);
  assert(fs.existsSync(p), `Asset ${a} exists`);
  if (fs.existsSync(p)) {
    const size = fs.statSync(p).size;
    assert(size > 1000, `Asset ${a} is valid (${size} bytes)`);
  }
}

// 3. Check Configuration File
console.log('\n⚙️ Test Suite 3: Configuration & URL Options');
const configJson = JSON.parse(fs.readFileSync(path.join(DESKTOP_DIR, 'config.json'), 'utf8'));
assert(typeof configJson.dashboardUrl === 'string', 'dashboardUrl configured');
assert(typeof configJson.devDashboardUrl === 'string', 'devDashboardUrl configured');
assert(configJson.startWithWindows === true, 'startWithWindows default true');
assert(configJson.soundAlerts === true, 'soundAlerts default true');
assert(configJson.autoUpdate === true, 'autoUpdate default true');
assert(Array.isArray(configJson.allowedOrigins), 'allowedOrigins configured for security');

// 4. Check Offline Screen
console.log('\n📶 Test Suite 4: Offline Screen UI');
const offlineHtml = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'offline.html'), 'utf8');
assert(offlineHtml.includes('Unable to Reach Dineflow'), 'Offline title present');
assert(offlineHtml.includes('Retry Connection'), 'Retry button present');
assert(offlineHtml.includes('retryConnection()'), 'Retry trigger function hooked');
assert(offlineHtml.includes('No Internet Connection'), 'No Internet badge present');

// 5. Check Preload Security
console.log('\n🔒 Test Suite 5: Preload Security & API Exposure');
const preloadJs = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'preload.js'), 'utf8');
assert(preloadJs.includes("contextBridge.exposeInMainWorld('dineflowDesktop'"), 'Exposes dineflowDesktop securely');
assert(preloadJs.includes("contextBridge.exposeInMainWorld('electronAPI'"), 'Exposes electronAPI for backward compatibility');
assert(!preloadJs.includes('require(') || !preloadJs.includes('contextBridge.exposeInMainWorld("process"'), 'Raw Node APIs not exposed');
assert(preloadJs.includes('getSystemPrinters'), 'Exposes getSystemPrinters');
assert(preloadJs.includes('printSilent'), 'Exposes printSilent');
assert(preloadJs.includes('printRawEscPos'), 'Exposes printRawEscPos');
assert(preloadJs.includes('triggerNewOrderAlert'), 'Exposes triggerNewOrderAlert');
assert(preloadJs.includes('setStartWithWindows'), 'Exposes setStartWithWindows');

// 6. Check Main Process Features
console.log('\n💻 Test Suite 6: Main Process Features');
const mainJs = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'main.js'), 'utf8');
assert(mainJs.includes('app.requestSingleInstanceLock()'), 'Enforces single instance');
assert(mainJs.includes('did-fail-load'), 'Catches network failure to load offline page');
assert(mainJs.includes('will-navigate'), 'Restricts navigation to allowed origins');
assert(mainJs.includes('setWindowOpenHandler'), 'Opens external links in default browser');

// 7. Check Printing Service
console.log('\n🖨️ Test Suite 7: Silent Printing & Raw ESC/POS');
const printJs = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'printService.js'), 'utf8');
assert(printJs.includes('webContents.print('), 'Uses webContents.print for silent spooling');
assert(printJs.includes('printToNetwork'), 'Supports network TCP port 9100');
assert(printJs.includes('printToSerial'), 'Supports serial / Bluetooth COM ports');
assert(printJs.includes('printToUsb'), 'Supports direct USB printing');

// 8. Check Order Alerts
console.log('\n🚨 Test Suite 8: Order Alerts & Sounds');
const alertJs = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'alertService.js'), 'utf8');
assert(alertJs.includes('flashFrame(true)'), 'Flashes taskbar icon');
assert(alertJs.includes('Notification('), 'Shows native Windows notification');
assert(alertJs.includes('soundInterval'), 'Implements repeating loud sound loop');
assert(alertJs.includes('setMuted'), 'Provides mute/unmute control');

// 9. Check Tray Manager & Window Manager
console.log('\n📌 Test Suite 9: Tray & Auto-Launch');
const trayJs = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'trayManager.js'), 'utf8');
assert(trayJs.includes('Open Dineflow'), 'Tray menu has Open Dineflow');
assert(trayJs.includes('Mute Sound Alerts'), 'Tray menu has Mute Sound Alerts');
assert(trayJs.includes('Start with Windows'), 'Tray menu has Start with Windows');
assert(trayJs.includes('Quit Dineflow'), 'Tray menu has Quit');

const winMgrJs = fs.readFileSync(path.join(DESKTOP_DIR, 'src', 'windowManager.js'), 'utf8');
assert(winMgrJs.includes('window-state.json'), 'Persists window size and position');
assert(winMgrJs.includes('app.setLoginItemSettings'), 'Implements Windows auto-launch');
assert(winMgrJs.includes('event.preventDefault()'), 'Minimizes to tray instead of closing');

// 10. Check Package.json Builder Config & README
console.log('\n📦 Test Suite 10: Packaging & Documentation');
const pkgJson = JSON.parse(fs.readFileSync(path.join(DESKTOP_DIR, 'package.json'), 'utf8'));
assert(pkgJson.build && pkgJson.build.win, 'electron-builder configured for Windows');
const winTargets = pkgJson.build.win.target.map(t => t.target || t);
assert(winTargets.includes('nsis'), 'Target includes NSIS installer');
assert(winTargets.includes('portable'), 'Target includes Portable build');

const readme = fs.readFileSync(path.join(DESKTOP_DIR, 'README.md'), 'utf8');
assert(readme.includes('How to Configure the URL'), 'README documents URL configuration');
assert(readme.includes('How to Build the Installer'), 'README documents building installer and portable');
assert(readme.includes('How to Release an OTA Auto-Update'), 'README documents auto-updates');
assert(readme.includes('SmartScreen'), 'README documents Windows SmartScreen bypass ("More info" -> "Run anyway")');

console.log('\n====================================================');
console.log(` Desktop Verification: ${passed} passed, ${failed} failed`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
