const nodemailer = require('nodemailer');
const config = require('../../config');

function createTransport() {
  const options = {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
  };
  if (config.smtp.user && config.smtp.pass) {
    options.auth = { user: config.smtp.user, pass: config.smtp.pass };
  }
  return nodemailer.createTransport(options);
}

function isConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

async function sendWelcomeEmail({ email, name, temporaryPassword }) {
  const transport = createTransport();
  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Your PeoplePay360 account',
    text: `Hello ${name},\n\nYour PeoplePay360 account has been created.\n\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease sign in and change this password immediately.`,
  });
}

module.exports = { isConfigured, sendWelcomeEmail };