/**
 * DineHQ Desktop Configuration Manager
 * Loads and validates settings from desktop/config.json and environment variables.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config.json');
    this.userConfigPath = path.join(app.getPath('userData'), 'user-config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaults = {
      dashboardUrl: 'https://dinehq.app/dashboard',
      devDashboardUrl: 'http://localhost:5173/dashboard',
      useDevInDevelopment: true,
      startWithWindows: true,
      soundAlerts: true,
      autoUpdate: true,
      updateFeedUrl: 'https://github.com/Zavyar-Riasat/QR-restraunt-dashboard/releases/latest/download',
      allowedOrigins: [
        'https://dinehq.app',
        'https://*.dinehq.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
    };

    let baseConfig = {};
    if (fs.existsSync(this.configPath)) {
      try {
        baseConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch (err) {
        console.warn('[Config] Failed to parse config.json, using defaults:', err.message);
      }
    }

    let userConfig = {};
    if (fs.existsSync(this.userConfigPath)) {
      try {
        userConfig = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
      } catch (err) {
        console.warn('[Config] Failed to parse user-config.json:', err.message);
      }
    }

    return { ...defaults, ...baseConfig, ...userConfig };
  }

  saveUserSetting(key, value) {
    this.config[key] = value;
    try {
      let existing = {};
      if (fs.existsSync(this.userConfigPath)) {
        existing = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
      }
      existing[key] = value;
      fs.writeFileSync(this.userConfigPath, JSON.stringify(existing, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Config] Failed to save user setting:', err.message);
    }
  }

  getDashboardUrl(isDevMode = false) {
    // 1. Environment variable override takes highest priority
    if (process.env.DINEHQ_DASHBOARD_URL) {
      return process.env.DINEHQ_DASHBOARD_URL;
    }

    // 2. Local dev server if in dev mode
    if (isDevMode && this.config.useDevInDevelopment && this.config.devDashboardUrl) {
      return this.config.devDashboardUrl;
    }

    // 3. Configured production dashboard URL
    return this.config.dashboardUrl || 'https://dinehq.app/dashboard';
  }

  isAllowedOrigin(rawUrl) {
    if (!rawUrl) return false;
    try {
      const parsed = new URL(rawUrl);
      const origin = parsed.origin;
      const hostname = parsed.hostname;

      for (const pattern of this.config.allowedOrigins || []) {
        if (pattern.startsWith('https://*.') || pattern.startsWith('http://*.')) {
          const rootDomain = pattern.replace(/^https?:\/\/\*\./, '');
          if (hostname === rootDomain || hostname.endsWith('.' + rootDomain)) {
            return true;
          }
        } else {
          try {
            const p = new URL(pattern);
            if (origin === p.origin) return true;
          } catch {
            if (rawUrl.startsWith(pattern)) return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  get(key, fallback = null) {
    return this.config[key] !== undefined ? this.config[key] : fallback;
  }
}

module.exports = new ConfigManager();
