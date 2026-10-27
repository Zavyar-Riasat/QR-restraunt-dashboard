# Dineflow Desktop Application

Native Windows Electron desktop wrapper for the **Dineflow Restaurant Kitchen & POS Dashboard**.

Provides:
- 🚀 **Silent Printing**: Direct spooling to 80mm thermal receipt printers without browser print dialogs.
- 🔌 **Raw ESC/POS Support**: TCP Port 9100 network printers, Bluetooth/Serial COM ports, and USB direct.
- 🔔 **Kitchen Order Alerts**: Flashes Windows taskbar, plays loud repeating chimes, and triggers native Windows notifications even when minimized.
- 📌 **System Tray Integration**: Minimizes to tray, quick actions ("Open Dineflow", "Mute sound", "Start with Windows", "Quit").
- ⚡ **Auto-Launch ("Start with Windows")**: Automatically boots when Windows starts (ON by default).
- 📶 **Friendly Offline Screen**: Automatically detects network loss and provides a clean reconnect screen with automatic retry.
- 🔄 **OTA Auto-Updates**: Seamless updates across all restaurant computers using `electron-updater`.
- 🛡️ **Hardened Security**: Preload `contextBridge` isolation, navigation lockdown, and external link handling in default browser.

---

## 1. Quick Start & Development

To run the desktop wrapper in development against your local dev server:

```bash
# 1. Open the desktop directory
cd desktop

# 2. Run the desktop wrapper in development mode
# (Defaults to http://localhost:5173/dashboard)
npm run dev
```

Or run via `npx electron . --dev` from inside the `desktop` folder.

---

## 2. How to Configure the URL

All configuration is managed in a single JSON file: **`desktop/config.json`**.

```json
{
  "dashboardUrl": "https://dineflow.app/dashboard",
  "devDashboardUrl": "http://localhost:5173/dashboard",
  "useDevInDevelopment": true,
  "startWithWindows": true,
  "soundAlerts": true,
  "autoUpdate": true,
  "updateFeedUrl": "https://github.com/Zavyar-Riasat/QR-restraunt-dashboard/releases/latest/download",
  "allowedOrigins": [
    "https://dineflow.app",
    "https://*.dineflow.app",
    "https://dinehq.app",
    "https://*.dinehq.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
}
```

### Environment Variable Override:
You can also point the desktop app to any staging or production URL without modifying files:

```powershell
# PowerShell:
$env:DINEFLOW_DASHBOARD_URL="https://your-custom-domain.com/dashboard"
npm start
```

---

## 3. How to Build the Installer & Portable .exe

We use `electron-builder` to package Dineflow into standard Windows binaries.

```bash
cd desktop

# Build both the NSIS Installer and Portable .exe
npm run build:all

# OR build only the NSIS setup installer (.exe with desktop shortcut)
npm run build:win

# OR build only the standalone Portable single-file .exe
npm run build:portable
```

### Generated Artifacts in `desktop/dist-electron/`:
1. **`Dineflow-1.0.0-win-x64.exe`** (or `Dineflow Setup 1.0.0.exe`):  
   Standard Windows NSIS Installer. Creates Start Menu and Desktop shortcuts with the official Dineflow icon.
2. **`Dineflow-1.0.0-Portable.exe`**:  
   Standalone single-file executable that runs instantly without installation (ideal for USB drives or quick testing).

---

## 4. Windows SmartScreen Warning (Unsigned Builds)

Because code-signing certificates (EV / OV certificates) will be configured in production, Windows SmartScreen may show a prompt on first launch of unsigned builds:

> **"Windows protected your PC"**  
> *Microsoft Defender SmartScreen prevented an unrecognized app from starting.*

### How Restaurant Owners Run It:
1. Click **"More info"** on the blue SmartScreen dialog.
2. Click the **"Run anyway"** button that appears.
3. Dineflow will launch and remember permission for subsequent launches.

---

## 5. How to Release an OTA Auto-Update

The desktop app integrates `electron-updater` configured for GitHub Releases.

1. **Bump Version** in `desktop/package.json` (e.g. `1.0.0` $\rightarrow$ `1.0.1`).
2. Set your GitHub Token in your terminal:
   ```powershell
   $env:GH_TOKEN="your_github_personal_access_token"
   ```
3. Run the publish build:
   ```bash
   npx electron-builder --win --publish always
   ```
4. This will build the update and draft a release on GitHub containing:
   - `Dineflow-1.0.1-win-x64.exe`
   - `latest.yml` (update metadata and SHA512 hash)
5. Publish the release on GitHub.
6. Every restaurant's installed Dineflow desktop app will automatically detect the new release within 4 hours (or on next launch), download it silently in the background, and prompt:
   > *"A new version of Dineflow is ready. Restart to apply update."*

---

## 6. Preload JavaScript API Reference

The web application securely accesses desktop capabilities via `window.dineflowDesktop` (also aliased to `window.electronAPI` and `window.dinehqDesktop`):

```javascript
// 1. List installed Windows printers
const printers = await window.dineflowDesktop.getPrinters();
console.log(printers); // [{ name: "POS-80", isDefault: true, ... }]

// 2. Silent print receipt HTML directly to thermal printer
await window.dineflowDesktop.printSilent({
  html: '<html><body><h1>Receipt #1024</h1></body></html>',
  deviceName: 'POS-80',
  pageSize: { width: 80000, height: 297000 }
});

// 3. Raw ESC/POS byte printing
// Network thermal printer (TCP Port 9100)
await window.dineflowDesktop.printRawEscPos({
  type: 'network',
  target: '192.168.1.150:9100',
  data: [0x1B, 0x40, 0x1B, 0x61, 0x01, ...] // Raw ESC/POS commands
});

// Serial / Bluetooth COM Port
await window.dineflowDesktop.printRawEscPos({
  type: 'serial',
  target: 'COM3',
  data: escposBuffer
});

// 4. Trigger incoming order alert (flashes taskbar, loud chime, Windows notification)
window.dineflowDesktop.triggerNewOrderAlert({
  id: '504',
  customer_name: 'Usman Khan',
  order_type: 'delivery',
  total_payable: 3200
});

// 5. Windows Auto-Launch status
const isAuto = await window.dineflowDesktop.isStartWithWindows();
await window.dineflowDesktop.setStartWithWindows(true);
```
