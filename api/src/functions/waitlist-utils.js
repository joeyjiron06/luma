const crypto = require('node:crypto');
const { Resend } = require('resend');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

function normalizeEmail(rawEmail) {
  return String(rawEmail || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getWaitlistConfig() {
  return {
    resendApiKey: getRequiredEnv('RESEND_API_KEY'),
    resendAudienceId: getRequiredEnv('RESEND_AUDIENCE_ID'),
    resendFromEmail: getRequiredEnv('RESEND_FROM_EMAIL'),
    tokenSecret: getRequiredEnv('WAITLIST_TOKEN_SECRET'),
    tokenTtlSeconds: Number(process.env.WAITLIST_TOKEN_TTL_SECONDS || TOKEN_TTL_SECONDS)
  };
}

function createResendClient(apiKey) {
  return new Resend(apiKey);
}

function buildToken(email, tokenSecret, ttlSeconds) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${email}.${expiresAt}`;
  const payloadB64 = base64UrlEncode(payload);
  const signature = crypto
    .createHmac('sha256', tokenSecret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

function verifyToken(token, tokenSecret) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing_token' };
  }

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) {
    return { valid: false, reason: 'invalid_format' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', tokenSecret)
    .update(payloadB64)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let payload;
  try {
    payload = base64UrlDecode(payloadB64);
  } catch (_) {
    return { valid: false, reason: 'invalid_payload' };
  }

  const lastDotIndex = payload.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return { valid: false, reason: 'invalid_payload' };
  }

  const email = payload.slice(0, lastDotIndex);
  const expiresAtRaw = payload.slice(lastDotIndex + 1);
  const expiresAt = Number(expiresAtRaw);

  if (!email || !Number.isFinite(expiresAt)) {
    return { valid: false, reason: 'invalid_payload' };
  }

  if (Math.floor(Date.now() / 1000) > expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, email };
}

function buildConfirmUrl(confirmBaseUrl, token) {
  const base = new URL(confirmBaseUrl);
  base.pathname = '/confirm.html';
  base.search = '';
  base.searchParams.set('token', token);
  return base.toString();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isAlreadyExistsError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.statusCode === 409 || message.includes('already');
}

module.exports = {
  buildConfirmUrl,
  buildToken,
  createResendClient,
  escapeHtml,
  getWaitlistConfig,
  isAlreadyExistsError,
  isValidEmail,
  normalizeEmail,
  verifyToken
};
