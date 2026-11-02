/**
 * Server-Side Email OTP Generation, Verification & Real Gmail / SMTP / API Delivery
 * Zero external dependencies — uses built-in node:tls, node:crypto, node:fs, node:path.
 * Automatically hot-reloads .env so newly added keys work immediately without server restart.
 */

import tls from 'node:tls';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const otpMemoryStore = new Map();

/**
 * Hot-read .env and .env.local from project root so changes to GMAIL_USER / GMAIL_APP_PASSWORD
 * or RESEND_API_KEY take effect immediately without restarting Vite or Node.
 */
export function getEnvConfig() {
  const fileVars = {};
  const candidates = ['.env', '.env.local'];

  for (const filename of candidates) {
    try {
      const fullPath = path.resolve(process.cwd(), filename);
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          fileVars[key] = val;
        }
      }
    } catch {
      // Ignore file read errors in restricted environments
    }
  }

  const get = (key) => {
    const fromFile = fileVars[key];
    const fromProc = process.env[key];
    const val = fromFile !== undefined && fromFile !== '' ? fromFile : fromProc;
    return val ? String(val).trim() : '';
  };

  const gmailUser = get('GMAIL_USER') || get('SMTP_USER');
  // Google App Passwords are 16 chars often copied with spaces (e.g. "abcd efgh ijkl mnop")
  const rawGmailPass = get('GMAIL_APP_PASSWORD') || get('SMTP_PASS');
  const gmailAppPassword = rawGmailPass.replace(/\s+/g, '');

  const smtpHost = get('SMTP_HOST') || (gmailUser ? 'smtp.gmail.com' : '');
  const smtpPort = Number(get('SMTP_PORT') || 465);
  const resendApiKey = get('RESEND_API_KEY');
  const resendFrom = get('RESEND_FROM_EMAIL') || 'Dineflow <onboarding@resend.dev>';
  const brevoApiKey = get('BREVO_API_KEY');
  const secretKey =
    get('PASSWORD_ENCRYPTION_KEY') ||
    get('VITE_PASSWORD_ENCRYPTION_KEY') ||
    'dineflow-default-otp-secret-key-2025';

  return {
    gmailUser,
    gmailAppPassword,
    smtpHost,
    smtpPort,
    resendApiKey,
    resendFrom,
    brevoApiKey,
    secretKey,
  };
}

function isPlaceholderValue(val) {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.includes('your_email') ||
    lower.includes('your_gmail') ||
    lower.includes('your_16_char') ||
    lower.includes('your_app_password') ||
    lower.includes('xxxx') ||
    lower === 're_xxxxxxxxx'
  );
}

/**
 * Create a stateless HMAC-SHA256 challenge token so verification works across
 * both stateful dev servers and stateless Vercel serverless functions without
 * ever exposing the OTP code in the token payload.
 */
function createChallengeToken(email, otpCode, expiresAt, secretKey) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const payload = `${cleanEmail}|${expiresAt}`;
  const digest = crypto
    .createHmac('sha256', secretKey)
    .update(`${cleanEmail}|${otpCode}|${expiresAt}`)
    .digest('hex');
  return Buffer.from(`${payload}|${digest}`, 'utf8').toString('base64url');
}

function verifyChallengeToken(email, otpCode, challengeToken, secretKey) {
  if (!challengeToken) return { valid: false, reason: 'Missing verification session token.' };
  try {
    const decoded = Buffer.from(String(challengeToken), 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return { valid: false, reason: 'Invalid verification token.' };
    const [tokenEmail, expiresAtStr, expectedDigest] = parts;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const expiresAt = Number(expiresAtStr);

    if (tokenEmail !== cleanEmail) {
      return { valid: false, reason: 'Email address does not match the OTP request.' };
    }
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return { valid: false, reason: 'OTP has expired. Please request a new code.' };
    }

    const actualDigest = crypto
      .createHmac('sha256', secretKey)
      .update(`${cleanEmail}|${String(otpCode).trim()}|${expiresAt}`)
      .digest('hex');

    const aBuf = Buffer.from(actualDigest, 'hex');
    const bBuf = Buffer.from(expectedDigest, 'hex');
    if (aBuf.length !== bBuf.length || !crypto.timingSafeEqual(aBuf, bBuf)) {
      return { valid: false, reason: 'Invalid 6-digit OTP code. Please check your Gmail inbox and try again.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid verification token.' };
  }
}

/**
 * Send an email over SMTP using built-in node:tls (port 465 implicit TLS) or node:net.
 */
function sendSmtpEmail({ host, port, user, pass, fromEmail, toEmail, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const useImplicitTls = Number(port) === 465;
    const socket = useImplicitTls
      ? tls.connect({ host, port: Number(port), servername: host, rejectUnauthorized: true })
      : net.createConnection({ host, port: Number(port) });

    let buffer = '';
    let settled = false;
    let currentLines = [];
    let responseQueue = [];

    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      if (err) reject(err);
      else resolve(result);
    };

    socket.setTimeout(15000, () => {
      finish(new Error(`SMTP connection to ${host}:${port} timed out.`));
    });

    socket.on('error', (err) => {
      finish(new Error(`SMTP network error (${host}:${port}): ${err.message}`));
    });

    const waitForResponse = () =>
      new Promise((res, rej) => {
        responseQueue.push({ res, rej });
      });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
        buffer = buffer.slice(newlineIdx + 1);
        currentLines.push(line);
        // SMTP final line of a reply has 3 digits followed by a space (or end of line)
        if (/^\d{3}(\s|$)/.test(line)) {
          const fullReply = currentLines.join('\n');
          const code = Number(line.slice(0, 3));
          currentLines = [];
          const waiter = responseQueue.shift();
          if (waiter) {
            waiter.res({ code, message: fullReply });
          }
        }
      }
    });

    const sendCommand = async (cmd, expectedPrefix = [2, 3]) => {
      socket.write(`${cmd}\r\n`);
      const reply = await waitForResponse();
      const firstDigit = Math.floor(reply.code / 100);
      if (!expectedPrefix.includes(firstDigit)) {
        throw new Error(`SMTP error (${reply.code}): ${reply.message}`);
      }
      return reply;
    };

    (async () => {
      try {
        const greeting = await waitForResponse();
        if (Math.floor(greeting.code / 100) !== 2) {
          throw new Error(`SMTP greeting rejected: ${greeting.message}`);
        }

        await sendCommand('EHLO dineflow.local', [2]);
        await sendCommand('AUTH LOGIN', [3]);
        await sendCommand(Buffer.from(user, 'utf8').toString('base64'), [3]);
        try {
          await sendCommand(Buffer.from(pass, 'utf8').toString('base64'), [2]);
        } catch (authErr) {
          throw new Error(
            `Gmail/SMTP authentication failed for ${user}. Make sure GMAIL_APP_PASSWORD is a valid 16-character Google App Password (not your normal Gmail login password). Details: ${authErr.message}`
          );
        }

        await sendCommand(`MAIL FROM:<${fromEmail}>`, [2]);
        await sendCommand(`RCPT TO:<${toEmail}>`, [2]);
        await sendCommand('DATA', [3]);

        const boundary = `dineflow_${crypto.randomBytes(8).toString('hex')}`;
        const dateHeader = new Date().toUTCString();
        const messageId = `<${crypto.randomBytes(12).toString('hex')}@dineflow.local>`;

        const mimeMessage = [
          `From: "Dineflow Verification" <${fromEmail}>`,
          `To: <${toEmail}>`,
          `Subject: ${subject}`,
          `Date: ${dateHeader}`,
          `Message-ID: ${messageId}`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          'Content-Transfer-Encoding: 7bit',
          '',
          text,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset="UTF-8"',
          'Content-Transfer-Encoding: 7bit',
          '',
          html,
          '',
          `--${boundary}--`,
          '.',
        ].join('\r\n');

        await sendCommand(mimeMessage, [2]);
        try {
          await sendCommand('QUIT', [2]);
        } catch {
          // Ignore quit error after 250 OK on DATA
        }
        finish(null, { delivered: true, provider: 'gmail-smtp' });
      } catch (err) {
        finish(err);
      }
    })();
  });
}

/**
 * Send via Resend HTTP API if RESEND_API_KEY is configured.
 */
async function sendResendEmail({ apiKey, fromEmail, toEmail, subject, html, text }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend API error (${response.status})`);
  }
  return { delivered: true, provider: 'resend', id: data.id };
}

/**
 * Build email HTML & plain text for the 6-digit OTP.
 */
function buildOtpEmailTemplate({ recipientName, email, otpCode }) {
  const displayName = recipientName ? String(recipientName).trim() : email.split('@')[0];
  const subject = `${otpCode} is your Dineflow verification code`;
  const text = [
    `Hi ${displayName},`,
    '',
    `Your 6-digit verification code for Dineflow is: ${otpCode}`,
    '',
    'This code will expire in 10 minutes.',
    'If you did not request this code, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #fffaf5; border: 1px solid #f2e4d8; border-radius: 18px; padding: 32px 28px; color: #1f1610;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #FF6B2C, #E84A15); color: #ffffff; font-weight: 800; font-size: 15px; padding: 8px 16px; border-radius: 999px; letter-spacing: 0.04em;">
          DINEFLOW ACCOUNT VERIFICATION
        </div>
      </div>
      <h2 style="margin: 0 0 10px; font-size: 22px; font-weight: 800; text-align: center; color: #1f1610;">
        Verify your Google Email
      </h2>
      <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #6c584c; text-align: center;">
        Hi <strong>${displayName}</strong>, enter the 6-digit verification code below to sign in to your customer account:
      </p>
      <div style="background: #ffffff; border: 2px dashed #FF6B2C; border-radius: 14px; padding: 20px; text-align: center; margin: 0 0 22px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #9c8577; margin-bottom: 6px;">
          Your 6-Digit Verification OTP
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 34px; font-weight: 800; letter-spacing: 0.28em; color: #E84A15;">
          ${otpCode}
        </div>
      </div>
      <p style="margin: 0 0 8px; font-size: 12px; color: #8c786a; text-align: center;">
        This code expires in <strong>10 minutes</strong>. Never share this code with anyone.
      </p>
      <p style="margin: 0; font-size: 11px; color: #a8968a; text-align: center;">
        Requested for ${email}
      </p>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Generate a 6-digit OTP, send it to the user's email address via Gmail SMTP or Resend,
 * and return only the non-reversible challengeToken (NEVER the otpCode).
 */
export async function dispatchEmailOtp({ email, name }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const err = new Error('Please enter a valid email address.');
    err.statusCode = 400;
    throw err;
  }

  const env = getEnvConfig();
  const hasGmailSmtp =
    !isPlaceholderValue(env.gmailUser) && !isPlaceholderValue(env.gmailAppPassword);
  const hasResend = !isPlaceholderValue(env.resendApiKey);

  if (!hasGmailSmtp && !hasResend) {
    const err = new Error(
      'Email OTP sender is not configured yet. Please add GMAIL_USER and GMAIL_APP_PASSWORD (your 16-character Google App Password) in your .env file so Dineflow can email the OTP to Gmail.'
    );
    err.statusCode = 503;
    err.code = 'EMAIL_CONFIG_MISSING';
    throw err;
  }

  const otpCode = String(crypto.randomInt(100000, 1000000));
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  const { subject, text, html } = buildOtpEmailTemplate({
    recipientName: name,
    email: cleanEmail,
    otpCode,
  });

  let deliveryResult;
  if (hasGmailSmtp) {
    deliveryResult = await sendSmtpEmail({
      host: env.smtpHost || 'smtp.gmail.com',
      port: env.smtpPort || 465,
      user: env.gmailUser,
      pass: env.gmailAppPassword,
      fromEmail: env.gmailUser,
      toEmail: cleanEmail,
      subject,
      html,
      text,
    });
  } else {
    deliveryResult = await sendResendEmail({
      apiKey: env.resendApiKey,
      fromEmail: env.resendFrom,
      toEmail: cleanEmail,
      subject,
      html,
      text,
    });
  }

  // Save in memory and generate HMAC challenge token
  otpMemoryStore.set(cleanEmail, {
    otpCode,
    expiresAt,
    attempts: 0,
  });

  const challengeToken = createChallengeToken(cleanEmail, otpCode, expiresAt, env.secretKey);

  return {
    success: true,
    delivered: true,
    provider: deliveryResult.provider,
    email: cleanEmail,
    expiresAt,
    challengeToken,
  };
}

/**
 * Verify a 6-digit OTP submitted by the user against either in-memory store or HMAC challengeToken.
 */
export function verifyDispatchedEmailOtp({ email, otpCode, challengeToken }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOtp = String(otpCode || '').trim();

  if (!cleanEmail || !/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, error: 'Please enter a valid 6-digit OTP code.' };
  }

  const record = otpMemoryStore.get(cleanEmail);
  if (record) {
    if (Date.now() > record.expiresAt) {
      otpMemoryStore.delete(cleanEmail);
      return { valid: false, error: 'OTP has expired. Please request a new verification code.' };
    }
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 6) {
      otpMemoryStore.delete(cleanEmail);
      return { valid: false, error: 'Too many incorrect attempts. Please request a new OTP code.' };
    }
    if (record.otpCode !== cleanOtp) {
      return {
        valid: false,
        error: 'Invalid 6-digit OTP code. Please check your Gmail inbox and try again.',
      };
    }
    otpMemoryStore.delete(cleanEmail);
    return { valid: true };
  }

  // Fallback to stateless HMAC verification (for serverless environments)
  const env = getEnvConfig();
  const check = verifyChallengeToken(cleanEmail, cleanOtp, challengeToken, env.secretKey);
  if (!check.valid) {
    return { valid: false, error: check.reason };
  }
  return { valid: true };
}

