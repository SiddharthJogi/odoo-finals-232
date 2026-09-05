const config = require('../../config');

function isConfigured() {
  return Boolean(config.resend.apiKey);
}

async function sendWelcomeEmail({ email, name, temporaryPassword }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resend.from,
      to: [email],
      subject: 'Your PeoplePay360 account',
      text: `Hello ${name},\n\nYour PeoplePay360 account has been created.\n\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease sign in and change this password immediately.`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API returned ${response.status}: ${details}`);
  }
}

module.exports = { isConfigured, sendWelcomeEmail };