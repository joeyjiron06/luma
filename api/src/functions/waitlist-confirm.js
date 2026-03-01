const { app } = require('@azure/functions');
const {
  createResendClient,
  getWaitlistConfig,
  isValidEmail,
  normalizeEmail,
  verifyToken
} = require('./waitlist-utils');

app.http('waitlist-confirm', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const token = request.query.get('token');

    let config;
    try {
      config = getWaitlistConfig();
    } catch (error) {
      context.error('waitlist-confirm config error', error);
      return {
        status: 500,
        jsonBody: { success: false, message: 'Service temporarily unavailable.' }
      };
    }

    const tokenCheck = verifyToken(token, config.tokenSecret);
    if (!tokenCheck.valid) {
      return {
        status: tokenCheck.reason === 'expired' ? 410 : 400,
        jsonBody: { success: false, message: 'Invalid or expired confirmation link.' }
      };
    }

    const email = normalizeEmail(tokenCheck.email);
    if (!isValidEmail(email)) {
      return {
        status: 400,
        jsonBody: { success: false, message: 'Invalid confirmation payload.' }
      };
    }

    const resend = createResendClient(config.resendApiKey);
    const updateResult = await resend.contacts.update({
      audienceId: config.resendAudienceId,
      email,
      unsubscribed: false
    });

    if (updateResult.error) {
      context.error('waitlist-confirm contact update failed', updateResult.error);
      return {
        status: 502,
        jsonBody: { success: false, message: 'Unable to confirm signup right now.' }
      };
    }

    return {
      status: 200,
      jsonBody: { success: true, message: 'Your email is confirmed.' }
    };
  }
});
