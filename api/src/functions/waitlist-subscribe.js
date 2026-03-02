const { app } = require('@azure/functions');
const {
  buildConfirmUrl,
  buildToken,
  createResendClient,
  escapeHtml,
  getWaitlistConfig,
  isAlreadyExistsError,
  isValidEmail,
  normalizeEmail
} = require('./waitlist-utils');

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const requestLogByIp = new Map();

function getRequestIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const firstIp = forwardedFor.split(',')[0].trim();
  return firstIp || 'unknown';
}

function isRateLimited(ipAddress) {
  const now = Date.now();
  const recentTimestamps = (requestLogByIp.get(ipAddress) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  recentTimestamps.push(now);
  requestLogByIp.set(ipAddress, recentTimestamps);

  return recentTimestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function createConfirmationEmailHtml(confirmUrl) {
  const safeUrl = escapeHtml(confirmUrl);
  return [
    '<div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#18181b;">',
    '<h2 style="margin:0 0 12px;">Confirm your Luma early access signup</h2>',
    '<p style="margin:0 0 16px;">Click below to confirm your email and secure your waitlist spot.</p>',
    `<p style="margin:0 0 20px;"><a href="${safeUrl}" style="background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Confirm email</a></p>`,
    `<p style="margin:0 0 8px;">Or copy and paste this URL:</p><p style="margin:0 0 16px;word-break:break-all;">${safeUrl}</p>`,
    '<p style="margin:0;color:#52525b;font-size:12px;">If you did not request this, you can safely ignore this email.</p>',
    '</div>'
  ].join('');
}

function getRequestBaseUrl(request) {
  const origin = request.headers.get('origin');
  if (origin) {
    return origin;
  }
  
  try {
    const parsed = new URL(request.url);
    if (parsed.origin && parsed.origin !== 'null') {
      return parsed.origin;
    }
  } catch (_) {
    // Fallback to forwarded headers below.
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  const protocol = forwardedProto || 'https';

  if (!host) {
    throw new Error('Unable to determine request base URL.');
  }

  return `${protocol}://${host}`;
}

app.http('waitlist-subscribe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const ipAddress = getRequestIp(request);
    if (isRateLimited(ipAddress)) {
      return {
        status: 429,
        jsonBody: {
          success: false,
          message: 'Too many requests. Please try again shortly.'
        }
      };
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return {
        status: 400,
        jsonBody: { success: false, message: 'Invalid request payload.' }
      };
    }

    const email = normalizeEmail(payload?.email);
    if (!isValidEmail(email)) {
      return {
        status: 400,
        jsonBody: { success: false, message: 'Please provide a valid email address.' }
      };
    }

    let config;
    try {
      config = getWaitlistConfig();
    } catch (error) {
      context.error('waitlist-subscribe config error', error);
      return {
        status: 500,
        jsonBody: { success: false, message: 'Service temporarily unavailable.' }
      };
    }

    const resend = createResendClient(config.resendApiKey);

    const createResult = await resend.contacts.create({
      audienceId: config.resendAudienceId,
      email,
      unsubscribed: true
    });

    if (createResult.error && !isAlreadyExistsError(createResult.error)) {
      context.error('waitlist-subscribe contact create failed', createResult.error);
      return {
        status: 502,
        jsonBody: { success: false, message: 'Unable to process signup right now.' }
      };
    }

    if (createResult.error && isAlreadyExistsError(createResult.error)) {
      const updateResult = await resend.contacts.update({
        audienceId: config.resendAudienceId,
        email,
        unsubscribed: true
      });

      if (updateResult.error) {
        context.error('waitlist-subscribe contact update failed', updateResult.error);
        return {
          status: 502,
          jsonBody: { success: false, message: 'Unable to process signup right now.' }
        };
      }
    }

    const token = buildToken(email, config.tokenSecret, config.tokenTtlSeconds);
    const confirmBaseUrl = getRequestBaseUrl(request);
    const confirmUrl = buildConfirmUrl(confirmBaseUrl, token);

    const emailResult = await resend.emails.send({
      from: config.resendFromEmail,
      to: email,
      subject: 'Confirm your early access signup',
      html: createConfirmationEmailHtml(confirmUrl),
      text: `Confirm your Luma early access signup: ${confirmUrl}`
    });

    if (emailResult.error) {
      context.error('waitlist-subscribe email send failed', emailResult.error);
      return {
        status: 502,
        jsonBody: { success: false, message: 'Unable to send confirmation email right now.' }
      };
    }

    return {
      status: 200,
      jsonBody: { success: true, message: 'Confirmation email sent.' }
    };
  }
});
