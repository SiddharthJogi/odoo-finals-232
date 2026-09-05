const nodemailer = require('nodemailer');
const config = require('../../config');

function isConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
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

async function sendWelcomeEmail({ email, name, temporaryPassword }) {
  const info = await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Your PeoplePay360 account',
    text: `Hello ${name},\n\nYour PeoplePay360 account has been created.\n\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease sign in and change this password immediately.`,
  });

  return info;
}

async function sendPayslipEmail({ email, name, payrunName, pdfBuffer }) {
  const info = await transporter.sendMail({
    from: config.smtp.from,
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