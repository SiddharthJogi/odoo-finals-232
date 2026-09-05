const nodemailer = require('nodemailer');
const config = require('../../config');

function isConfigured() {
  return Boolean(config.resend.apiKey || (config.smtp.host && config.smtp.user && config.smtp.pass));
}

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

async function sendWithResend({ to, subject, text, attachments = [] }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resend.from,
      to: [to],
      subject,
      text,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : attachment.content,
      })),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API ${response.status}: ${details}`);
  }

  return response.json();
}

async function sendEmail(message) {
  if (config.resend.apiKey) {
    return sendWithResend(message);
  }
  return transporter.sendMail({
    from: config.smtp.from,
    ...message,
  });
}

async function sendWelcomeEmail({ email, name, temporaryPassword }) {
  const info = await sendEmail({
    to: email,
    subject: 'Your PeoplePay360 account',
    text: `Hello ${name},\n\nYour PeoplePay360 account has been created.\n\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease sign in and change this password immediately.`,
  });

  return info;
}

async function sendPayslipEmail({ email, name, payrunName, pdfBuffer }) {
  const info = await sendEmail({
    to: email,
    subject: `Your Payslip for ${payrunName}`,
    text: `Hello ${name},\n\nPlease find attached your payslip for ${payrunName}.\n\nBest regards,\nPeoplePay360 Team`,
    attachments: [
      {
        filename: 'Payslip.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
  return info;
}

module.exports = { isConfigured, sendWelcomeEmail, sendPayslipEmail };