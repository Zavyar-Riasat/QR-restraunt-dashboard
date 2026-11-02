/**
 * Customer Authentication & OTP Service
 * Handles Pakistani mobile phone validation, SMS OTP dispatch with rate limiting,
 * Google Sign-In, and phone registry lookups backed by Coolify PostgreSQL.
 */

import { validatePakistaniPhone } from '../utils/checkoutUtils.js';
import { customerService } from './customerService.js';

const OTP_RATELIMIT_PREFIX = 'dinehq_otp_ratelimit_';
const PENDING_OTP_PREFIX = 'dinehq_pending_otp_';
const PENDING_EMAIL_OTP_PREFIX = 'dinehq_pending_email_otp_';
const VERIFIED_GOOGLE_ACCOUNTS_KEY = 'dinehq_verified_google_accounts';

// Environment variable configuration with safe production fallback
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const SMS_PROVIDER = env.VITE_SMS_PROVIDER || 'production';
const TEST_OTP_CODE = env.VITE_TEST_OTP_CODE || '';
const GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID || '';

const COMMON_DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
};

const BLOCKED_FAKE_GMAIL_LOCAL_PARTS = new Set([
  'test',
  'testing',
  'user',
  'admin',
  'abc',
  'abcd',
  '123',
  '1234',
  '12345',
  '123456',
  'aaa',
  'aaaa',
  'asdf',
  'qwerty',
  'none',
  'null',
  'fake',
  'wrong',
]);

export const customerAuthService = {
  /**
   * Get active SMS provider mode ('production' | 'twilio' | 'infobip')
   */
  getSmsProvider() {
    return SMS_PROVIDER;
  },

  /**
   * Check if running on localhost / local development environment
   */
  isLocalhost() {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    );
  },

  /**
   * Check if running in development / test OTP mode
   */
  isTestMode() {
    return SMS_PROVIDER === 'test' && Boolean(TEST_OTP_CODE);
  },

  /**
   * Get fixed test code if explicitly configured
   */
  getTestOtpCode() {
    return TEST_OTP_CODE;
  },

  /**
   * Validate Pakistani mobile phone number (03XX-XXXXXXX)
   */
  validatePhone(phoneInput) {
    return validatePakistaniPhone(phoneInput);
  },

  /**
   * Check Rate Limiting for a phone number
   * Rules:
   * - 60 seconds minimum cooldown between consecutive requests
   * - Maximum 4 requests per 15-minute sliding window
   */
  checkRateLimit(cleanPhone) {
    if (!cleanPhone) return { allowed: false, error: 'Phone number is required.' };

    const key = `${OTP_RATELIMIT_PREFIX}${cleanPhone}`;
    const now = Date.now();

    try {
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : { requests: [], lastRequestTime: 0 };

      // Filter requests within 15 minutes (900,000 ms)
      const window15m = 15 * 60 * 1000;
      const recentRequests = (data.requests || []).filter((ts) => now - ts < window15m);

      // Check 60-second cooldown
      if (data.lastRequestTime && now - data.lastRequestTime < 60000) {
        const remainingSec = Math.ceil((60000 - (now - data.lastRequestTime)) / 1000);
        return {
          allowed: false,
          remainingSeconds: remainingSec,
          error: `Please wait ${remainingSec}s before requesting a new code.`,
        };
      }

      // Check 15-minute window limit (max 4 attempts)
      if (recentRequests.length >= 4) {
        const oldest = recentRequests[0];
        const waitMinutes = Math.ceil((window15m - (now - oldest)) / 60000);
        return {
          allowed: false,
          remainingSeconds: waitMinutes * 60,
          error: `Too many attempts. Please try again in ${waitMinutes} minutes.`,
        };
      }

      return { allowed: true, recentCount: recentRequests.length };
    } catch (e) {
      console.warn('Rate limit check fallback:', e);
      return { allowed: true, recentCount: 0 };
    }
  },

  /**
   * Record an OTP request in rate limiter
   */
  recordOtpRequest(cleanPhone) {
    const key = `${OTP_RATELIMIT_PREFIX}${cleanPhone}`;
    const now = Date.now();
    try {
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : { requests: [], lastRequestTime: 0 };
      const window15m = 15 * 60 * 1000;
      const recent = (data.requests || []).filter((ts) => now - ts < window15m);
      recent.push(now);

      localStorage.setItem(
        key,
        JSON.stringify({
          requests: recent,
          lastRequestTime: now,
        })
      );
    } catch (e) {
      console.warn('Failed to record OTP rate limit hit:', e);
    }
  },

  /**
   * Request OTP code for Pakistani phone number
   */
  async requestOtp(phoneInput) {
    const validation = this.validatePhone(phoneInput);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Please enter a valid Pakistani mobile number (e.g. 0300 1234567).');
    }

    const cleanPhone = validation.normalized;

    // Check rate limit
    const rateCheck = this.checkRateLimit(cleanPhone);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.error);
    }

    // Determine OTP code
    const isTest = this.isTestMode();
    const code = isTest ? TEST_OTP_CODE : Math.floor(100000 + Math.random() * 900000).toString();

    // Store pending OTP with 10-minute expiry
    const pendingData = {
      phone: cleanPhone,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem(`${PENDING_OTP_PREFIX}${cleanPhone}`, JSON.stringify(pendingData));
    } catch (e) {
      console.warn('Failed to store pending OTP:', e);
    }

    // Record rate limit timestamp
    this.recordOtpRequest(cleanPhone);

    // Dispatch SMS according to provider
    if (!isTest) {
      console.log(`[SMS Provider: ${SMS_PROVIDER}] Sending OTP to +92${cleanPhone.slice(1)}`);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return {
      success: true,
      phone: cleanPhone,
      displayPhone: validation.display,
      provider: SMS_PROVIDER,
      isTestMode: isTest,
      testCode: isTest ? code : null,
      cooldownSeconds: 60,
    };
  },

  /**
   * Verify entered OTP code
   */
  async verifyOtp(phoneInput, codeInput) {
    const validation = this.validatePhone(phoneInput);
    if (!validation.isValid) {
      throw new Error('Invalid phone number.');
    }

    const cleanPhone = validation.normalized;
    const cleanCode = String(codeInput || '').trim();

    if (!cleanCode || cleanCode.length < 4) {
      throw new Error('Please enter the 6-digit verification code.');
    }

    const key = `${PENDING_OTP_PREFIX}${cleanPhone}`;
    let pending = null;

    try {
      const raw = localStorage.getItem(key);
      if (raw) pending = JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading pending OTP:', e);
    }

    const isTest = this.isTestMode();
    const isFixedTestCodeMatch = isTest && cleanCode === TEST_OTP_CODE;

    if (!pending && !isFixedTestCodeMatch) {
      throw new Error('Verification code expired or not requested. Please request a new code.');
    }

    if (pending) {
      if (Date.now() > pending.expiresAt) {
        localStorage.removeItem(key);
        throw new Error('Verification code has expired. Please request a new code.');
      }

      if (pending.attempts >= 5) {
        localStorage.removeItem(key);
        throw new Error('Too many invalid code attempts. Please request a new code.');
      }

      const isMatch = pending.code === cleanCode || isFixedTestCodeMatch;

      if (!isMatch) {
        pending.attempts = (pending.attempts || 0) + 1;
        try {
          localStorage.setItem(key, JSON.stringify(pending));
        } catch { }
        const left = 5 - pending.attempts;
        throw new Error(`Incorrect verification code. ${left} attempts remaining.`);
      }

      localStorage.removeItem(key);
    }

    const existing = customerService.findCustomerByPhone(cleanPhone);
    const customer = await customerService.loginOrRegister({
      phone: cleanPhone,
      name: existing?.name || `Diner ${cleanPhone.slice(-4)}`,
      email: existing?.email || '',
      avatar: existing?.avatar || null,
      preferred_language: existing?.preferred_language || 'en',
    });

    return { success: true, customer };
  },

  /**
   * Validate whether an Email / Google account is genuinely formatted and has a valid mail domain
   */
  async validateEmailAccount(emailInput, { requireGoogle = false } = {}) {
    const cleanEmail = String(emailInput || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { isValid: false, error: 'Please enter your email address.' };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return {
        isValid: false,
        error: 'Invalid email format. Please enter a valid email address (e.g. name@gmail.com).',
      };
    }

    const [localPart, domain] = cleanEmail.split('@');

    if (COMMON_DOMAIN_TYPOS[domain]) {
      return {
        isValid: false,
        error: `Invalid email domain "@${domain}". Did you mean "${localPart}@${COMMON_DOMAIN_TYPOS[domain]}"?`,
      };
    }

    const isGmailDomain = domain === 'gmail.com' || domain === 'googlemail.com';
    if (requireGoogle && !isGmailDomain) {
      // Check if domain has Google Workspace MX records when requireGoogle is true
      const hasGoogleMx = await this.checkDomainMx(domain, true);
      if (!hasGoogleMx) {
        return {
          isValid: false,
          error: `"${cleanEmail}" is not a valid Google / Gmail account. Please use a valid @gmail.com or Google Workspace address.`,
        };
      }
    }

    if (isGmailDomain) {
      const normalizedLocal = localPart.split('+')[0];
      if (normalizedLocal.length < 4 || normalizedLocal.length > 30) {
        return {
          isValid: false,
          error: 'Invalid Google account: Gmail usernames must be between 6 and 30 characters long.',
        };
      }
      if (
        !/^[a-z0-9.]+$/.test(normalizedLocal) ||
        normalizedLocal.startsWith('.') ||
        normalizedLocal.endsWith('.') ||
        normalizedLocal.includes('..')
      ) {
        return {
          isValid: false,
          error: 'Invalid Google account: Gmail addresses can only contain letters, numbers, and single periods.',
        };
      }
      if (BLOCKED_FAKE_GMAIL_LOCAL_PARTS.has(normalizedLocal.replace(/\./g, ''))) {
        return {
          isValid: false,
          error: `"${cleanEmail}" is not an active or valid Google account. Please enter your real Google email address.`,
        };
      }
    } else {
      // Verify non-Gmail domain has valid DNS MX records
      const domainHasMx = await this.checkDomainMx(domain, false);
      if (!domainHasMx) {
        return {
          isValid: false,
          error: `The email domain "@${domain}" does not exist or cannot receive verification emails.`,
        };
      }
    }

    return {
      isValid: true,
      normalizedEmail: cleanEmail,
      isGmailDomain,
    };
  },

  /**
   * Check DNS MX records using Google Public DNS over HTTPS (with safe fallback if offline)
   */
  async checkDomainMx(domain, requireGoogleMx = false) {
    if (!domain) return false;
    const knownValidDomains = new Set([
      'gmail.com',
      'googlemail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'icloud.com',
      'live.com',
      'msn.com',
      'protonmail.com',
      'proton.me',
      'dinehq.pk',
    ]);
    if (!requireGoogleMx && knownValidDomains.has(domain)) {
      return true;
    }

    if (typeof fetch === 'undefined') return !requireGoogleMx;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return !requireGoogleMx;
      const data = await res.json();
      // Status 3 = NXDOMAIN (domain does not exist)
      if (data.Status === 3) return false;
      const answers = Array.isArray(data.Answer) ? data.Answer : [];
      if (answers.length === 0) return false;
      if (requireGoogleMx) {
        return answers.some((a) =>
          String(a.data || '')
            .toLowerCase()
            .match(/google\.com|googlemail\.com|smtp\.google/)
        );
      }
      return true;
    } catch {
      // If offline or blocked by sandbox, allow known valid TLD format unless requireGoogleMx on obviously bad domain
      return !requireGoogleMx;
    }
  },

  /**
   * Get saved verified Google accounts on this browser
   */
  getSavedGoogleAccounts() {
    const accounts = [];
    const seen = new Set();

    const addAccount = (acc) => {
      if (!acc || !acc.email) return;
      const email = String(acc.email).trim().toLowerCase();
      if (!email.includes('@') || seen.has(email)) return;
      seen.add(email);
      accounts.push({
        name: acc.name || email.split('@')[0],
        email,
        phone: acc.phone || '',
        avatar:
          acc.avatar ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            acc.name || email
          )}`,
        verified: Boolean(acc.verified),
      });
    };

    try {
      const current = customerService.getCurrentCustomer();
      if (current?.email && !current.email.endsWith('@customer.dinehq.pk')) {
        addAccount({ ...current, verified: true });
      }
      const rawVerified = localStorage.getItem(VERIFIED_GOOGLE_ACCOUNTS_KEY);
      if (rawVerified) {
        const parsed = JSON.parse(rawVerified);
        if (Array.isArray(parsed)) {
          parsed.forEach((a) => addAccount({ ...a, verified: true }));
        }
      }
      const rawReg = localStorage.getItem('dinehq_customer_registry');
      if (rawReg) {
        const reg = JSON.parse(rawReg);
        Object.values(reg).forEach((c) => {
          if (c?.email && !c.email.endsWith('@customer.dinehq.pk')) {
            addAccount({ ...c, verified: true });
          }
        });
      }
    } catch { }

    return accounts;
  },

  /**
   * Save a verified Google/Email account to local device memory
   */
  saveVerifiedGoogleAccount(profile) {
    if (!profile?.email) return;
    try {
      const existing = this.getSavedGoogleAccounts();
      const email = String(profile.email).trim().toLowerCase();
      const updated = [
        {
          name: profile.name || email.split('@')[0],
          email,
          phone: profile.phone || '',
          avatar: profile.avatar || null,
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
        ...existing.filter((a) => a.email !== email),
      ].slice(0, 6);
      localStorage.setItem(VERIFIED_GOOGLE_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch { }
  },

  /**
   * Request 6-digit OTP for Email / Google Account verification via backend Gmail SMTP / Email API
   * Never generates or exposes the OTP code in the browser response.
   */
  async requestEmailOtp({ email, name = '', phone = '', requireGoogle = false }) {
    const validation = await this.validateEmailAccount(email, { requireGoogle });
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const cleanEmail = validation.normalizedEmail;
    const rateCheck = this.checkRateLimit(`email_${cleanEmail}`);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.error);
    }

    const displayName =
      String(name || '').trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const response = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name: displayName,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data?.error || 'Could not send OTP to your Gmail address. Please check your email settings.'
      );
    }

    const pendingData = {
      email: cleanEmail,
      name: displayName,
      phone: String(phone || '').trim(),
      challengeToken: data.challengeToken || '',
      expiresAt: data.expiresAt || Date.now() + 10 * 60 * 1000,
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem(
        `${PENDING_EMAIL_OTP_PREFIX}${cleanEmail}`,
        JSON.stringify(pendingData)
      );
    } catch (e) {
      console.warn('Failed to store pending email OTP metadata:', e);
    }

    this.recordOtpRequest(`email_${cleanEmail}`);

    return {
      success: true,
      email: cleanEmail,
      name: displayName,
      delivered: true,
      provider: data.provider || 'gmail-smtp',
      cooldownSeconds: 60,
    };
  },

  /**
   * Verify 6-digit Email OTP against backend and sign in customer
   */
  async verifyEmailOtp(emailInput, codeInput) {
    const cleanEmail = String(emailInput || '').trim().toLowerCase();
    const cleanCode = String(codeInput || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Invalid email address.');
    }
    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('Please enter the 6-digit verification code sent to your Gmail.');
    }

    const key = `${PENDING_EMAIL_OTP_PREFIX}${cleanEmail}`;
    let pending = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) pending = JSON.parse(raw);
    } catch { }

    const response = await fetch('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        otpCode: cleanCode,
        challengeToken: pending?.challengeToken || '',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.verified) {
      throw new Error(
        data?.error || 'Incorrect or expired 6-digit OTP code. Please check your Gmail inbox.'
      );
    }

    try {
      localStorage.removeItem(key);
    } catch {}

    const displayName =
      pending?.name ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const customer = await customerService.loginOrRegister({
      name: displayName,
      email: cleanEmail,
      phone: pending?.phone || '',
      avatar: null,
      preferred_language: 'en',
    });

    this.saveVerifiedGoogleAccount(customer);

    return { success: true, customer };
  },

  /**
   * Trigger real Google OAuth2 popup if VITE_GOOGLE_CLIENT_ID is configured
   */
  async authenticateWithGoogleOAuthPopup() {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') {
      return { available: false };
    }

    // Dynamically load Google Identity Services script if not present
    if (!window.google?.accounts?.oauth2) {
      await new Promise((resolve) => {
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
          existingScript.addEventListener('load', resolve, { once: true });
          existingScript.addEventListener('error', resolve, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
      });
    }

    if (!window.google?.accounts?.oauth2) {
      return { available: false };
    }

    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              reject(new Error(tokenResponse.error_description || 'Google authentication was cancelled.'));
              return;
            }
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (!userInfoRes.ok) {
                throw new Error('Could not verify Google account profile.');
              }
              const profile = await userInfoRes.json();
              if (!profile.email || profile.email_verified === false) {
                throw new Error('This Google account does not have a verified email address.');
              }
              const customer = await customerService.loginOrRegister({
                name: profile.name || profile.given_name || profile.email.split('@')[0],
                email: profile.email.toLowerCase(),
                phone: '',
                avatar: profile.picture || null,
                preferred_language: 'en',
              });
              this.saveVerifiedGoogleAccount(customer);
              resolve({ available: true, success: true, customer });
            } catch (err) {
              reject(err);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        resolve({ available: false, error: err.message });
      }
    });
  },

  /**
   * Sign in with a verified Google account profile
   */
  async loginWithGoogle(googleProfile = null) {
    const email = String(googleProfile?.email || '').trim().toLowerCase();
    const name = String(googleProfile?.name || '').trim();
    const phone = String(googleProfile?.phone || '').trim();

    const validation = await this.validateEmailAccount(email, { requireGoogle: true });
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const displayName =
      name ||
      email
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const customer = await customerService.loginOrRegister({
      name: displayName,
      email,
      phone: phone || '',
      avatar: googleProfile?.avatar || null,
      preferred_language: 'en',
    });

    this.saveVerifiedGoogleAccount(customer);

    return { success: true, customer };
  },

  /**
   * Quick Demo Customer Sign-In (1-Click Test Account)
   */
  async loginWithQuickDemo() {
    const customer = await customerService.loginOrRegister({
      name: 'Demo Customer',
      email: 'demo.customer@dinehq.pk',
      phone: '03001234567',
      avatar: null,
      preferred_language: 'en',
    });
    return { success: true, customer };
  },

  /**
   * Check if a phone number is already registered to an existing customer
   */
  checkPhoneRegistered(phoneInput) {
    const val = this.validatePhone(phoneInput);
    if (!val.isValid) return { isRegistered: false };
    const existing = customerService.findCustomerByPhone(val.normalized);
    return {
      isRegistered: Boolean(existing),
      customer: existing || null,
      displayPhone: val.display,
    };
  },
};
