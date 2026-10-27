/**
 * Order Alert and Notification Service
 * Handles:
 * 1. Taskbar flashing (mainWindow.flashFrame(true))
 * 2. Repeating loud audio alarm
 * 3. Windows desktop notifications (even when minimized)
 * 4. Mute / Unmute state
 */

const path = require('path');
const { Notification, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const config = require('./config');

class AlertService {
  constructor() {
    this.mainWindow = null;
    this.muted = !config.get('soundAlerts', true);
    this.soundInterval = null;
    this.wavPath = path.join(__dirname, '..', 'assets', 'order-alarm.wav');
    this.hiddenAudioWin = null;
  }

  init(win) {
    this.mainWindow = win;

    // When the user focuses the main window, stop taskbar flashing and repeating sound
    if (this.mainWindow) {
      this.mainWindow.on('focus', () => {
        this.stopAlarm();
      });
    }

    // Initialize hidden audio player window for zero-latency audio playback
    this.createAudioWindow();
  }

  createAudioWindow() {
    if (this.hiddenAudioWin) return;
    try {
      this.hiddenAudioWin = new BrowserWindow({
        show: false,
        width: 100,
        height: 100,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
        },
      });
      this.hiddenAudioWin.loadURL(`data:text/html,<html><body><audio id="player" src="file://${this.wavPath.replace(/\\/g, '/')}"></audio></body></html>`);
    } catch (err) {
      console.warn('[AlertService] Hidden audio window note:', err.message);
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(val) {
    this.muted = Boolean(val);
    config.saveUserSetting('soundAlerts', !this.muted);
    if (this.muted) {
      this.stopAlarm();
    }
    console.log(`[AlertService] Sound alerts muted: ${this.muted}`);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Play single chime sound via hidden audio window with PowerShell fallback
   */
  playSoundOnce() {
    if (this.muted) return;

    // Method 1: Play via hidden audio window
    if (this.hiddenAudioWin && !this.hiddenAudioWin.isDestroyed()) {
      this.hiddenAudioWin.webContents
        .executeJavaScript(`
          const audio = document.getElementById('player');
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
        `)
        .catch(() => {});
      return;
    }

    // Method 2: Native Windows SoundPlayer via background PowerShell
    if (process.platform === 'win32') {
      const sanitized = this.wavPath.replace(/'/g, "''");
      exec(`powershell -NoProfile -NonInteractive -Command "(New-Object Media.SoundPlayer '${sanitized}').Play()"`, {
        windowsHide: true,
      }, () => {});
    }
  }

  /**
   * Trigger complete alert on incoming new order:
   * - Flashes taskbar
   * - Fires repeating sound alarm
   * - Shows Windows native notification
   */
  triggerNewOrderAlert(order = {}) {
    console.log(`[AlertService] Triggering new order alert for order #${order.id || 'N/A'}`);

    // 1. Flash Taskbar Icon
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.flashFrame(true);
    }

    // 2. Play Repeating Loud Sound
    if (!this.muted) {
      this.playSoundOnce();
      if (!this.soundInterval) {
        this.soundInterval = setInterval(() => {
          this.playSoundOnce();
        }, 4000);
      }
    }

    // 3. Show Windows Desktop Notification
    if (Notification.isSupported()) {
      const orderId = order.id || 'New';
      const customer = order.customer_name || 'Customer';
      const orderType = order.order_type === 'delivery'
        ? '🛵 Delivery'
        : order.order_type === 'dine_in'
        ? `🍽️ Table #${order.table_number || 'Dine-In'}`
        : '🥡 Takeaway';
      const totalStr = order.total_payable ? `Rs. ${Number(order.total_payable).toLocaleString()}` : '';

      const notif = new Notification({
        title: `🚨 Dineflow: New ${orderType} Order #${orderId}`,
        body: `${customer} placed an order ${totalStr ? '• ' + totalStr : ''}. Tap to view & accept in kitchen.`,
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        silent: true, // We handle our own louder repeating sound
        urgency: 'critical',
      });

      notif.on('click', () => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.show();
          this.mainWindow.focus();
        }
        this.stopAlarm();
      });

      notif.show();
    }
  }

  /**
   * Stop taskbar flashing and repeating sound
   */
  stopAlarm() {
    if (this.soundInterval) {
      clearInterval(this.soundInterval);
      this.soundInterval = null;
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.flashFrame(false);
    }
  }
}

module.exports = new AlertService();
