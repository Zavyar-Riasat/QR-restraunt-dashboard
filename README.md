# Dineflow Restaurant Platform

Fast, modern, offline-resilient restaurant point-of-sale, customer QR ordering, marketplace discovery, and doorstep delivery dispatch system.

## Reversible Password Encryption & Security Architecture

Passwords for restaurant managers are encrypted at rest using **AES-256-GCM (Node.js `crypto`)** with a unique cryptographically random 12-byte initialization vector (IV) per password and 16-byte authentication tag. This allows authorized master administrators to view manager credentials when providing phone/on-site onboarding assistance, while ensuring zero plain-text passwords ever exist in storage, logs, error messages, or client bundles.

### Critical Key Backup Notice

> [!WARNING]
> **IMPORTANT**: Keep `PASSWORD_ENCRYPTION_KEY` backed up securely in your production secrets manager (e.g. Vercel Environment Variables, AWS Secrets Manager, Doppler).
> **Losing `PASSWORD_ENCRYPTION_KEY` makes all stored passwords permanently unreadable and unrecoverable.**
>
> - The key MUST be exactly 32 bytes (64 hex characters or 32 raw ASCII characters).
> - Never commit `.env` or `PASSWORD_ENCRYPTION_KEY` to git or version control.
> - Never send `PASSWORD_ENCRYPTION_KEY` or ciphertext to browser bundles or client API responses.

## Key Security Controls

1. **AES-256-GCM Authenticated Encryption**: Ciphertext, random IV, and auth tag stored as `aes-256-gcm:iv:tag:ciphertext`.
2. **Constant-Time Verification**: Server-side logins compare passwords in constant time via `crypto.timingSafeEqual` to prevent side-channel timing attacks.
3. **Session Invalidation**: Whenever a password is changed or reset, active sessions for that account are immediately invalidated across all devices.
4. **Brute-Force Rate Limiting & Lockout**: 5 consecutive failed login attempts trigger a 15-minute temporary lockout.
5. **Audited Master Admin Access**: Password viewing is restricted to the platform master admin role, auto-hides from the console after 15 seconds, and records an immutable audit log entry (admin email, restaurant, target user, timestamp, IP address).
6. **Mandatory Password Reset**: Master admin password resets generate strong passwords and set `must_change_password = true`, requiring the owner to choose their own password on next login.

