# SYBA Privacy Policy

**Last Updated: March 4, 2026**

## Overview

SYBA ("Start Your Bitcoin Adoption") is a Bitcoin-first personal finance app. Your privacy is our top priority — SYBA is designed to keep your financial data on your device.

## Data Collection

**SYBA does not collect, store, or transmit your personal financial data to external servers.**

- **No tracking or analytics** — SYBA does not use any analytics SDKs, tracking pixels, or third-party analytics services.
- **No advertising** — SYBA does not display ads or share data with advertisers.
- **All financial data stays on your device** — Your financial records, settings, and preferences are stored locally on your device using AES-256-CBC encryption.

## App Security

SYBA uses a password-based security system to protect your data:

- **Password** — A password of at least 12 characters (including uppercase, lowercase, and numbers) is required to access the app. The password is verified using a SHA-256 hash — the original password is never stored.
- **Biometric authentication** — Optional Face ID or fingerprint authentication can be enabled for faster access. Biometric data is handled entirely by your device's operating system and is never accessed or stored by SYBA.
- **Auto-lock** — The app automatically locks after a configurable period of inactivity.
- **Failed attempts** — After 5 consecutive failed login attempts, the app locks for 5 minutes.

## Subscription Authentication

SYBA uses LNURL-auth for subscription management. This is a privacy-preserving authentication method based on Lightning Network:

- No email address, phone number, or personal information is required.
- Authentication is performed by scanning a QR code with a Lightning wallet, which generates a cryptographic signature.
- Only a `linking_key` (your wallet's public key) is stored on the server to identify your subscription — no personally identifiable information is associated with it.

## Subscription

SYBA offers a premium subscription paid via Lightning Network. Payment processing is handled through the Blink API via a proxy server. No credit card information or traditional payment data is collected by SYBA.

## Network Requests

SYBA makes the following network requests solely to provide core functionality:

| Destination | Purpose | Data Sent |
|---|---|---|
| Upbit / OKX / Coinbase API | Bitcoin and fiat exchange rate queries (auto-selected by region) | None (GET requests only) |
| Exchange rate API | USD/KRW exchange rate queries | None (GET requests only) |
| Supabase | Subscription management | Anonymous linking_key only (no email, name, or phone number) |
| Blink proxy server | Lightning payments for subscription | Payment amount and invoice (not financial data) |

- **Analytics/tracking SDKs**: None
- **Advertising SDKs**: None
- **Lightning API keys**: Not included in the app (stored on the server only)

## Data Security

- All locally stored financial data is encrypted using AES-256-CBC with a key derived from your password via PBKDF2 (100,000 iterations).
- Encryption keys are stored in iOS Keychain or Android Keystore, protected at the OS level.
- SYBA does not transmit your financial records over the internet.
- Password and biometric app lock options are available for additional security.

## Backup Files

Backup files are encrypted with AES-256-CBC. They cannot be decrypted without your password. The backup file format includes a salt (required for key derivation) and an IV (initialization vector), but neither can be used to access your data without the original password.

## Children's Privacy

SYBA is not directed at children under the age of 13. We do not knowingly collect any personal information from children.

## Changes to This Policy

We may update this Privacy Policy from time to time. Any changes will be reflected in the "Last Updated" date above.

## Contact

If you have any questions about this Privacy Policy, please open an issue on our GitHub repository:
https://github.com/AsadoConKimchi/syba_start_your_bitcoin_adoption/issues
