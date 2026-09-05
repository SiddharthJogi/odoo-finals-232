const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env first, then fill missing values from the repository root .env.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  port: parseInt(process.env.PORT, 10),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'PeoplePay360 <no-reply@peoplepay360.local>',
  },
  resend: {
    apiKey: process.env.resend_api_key,
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
  },
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_KEY || process.env.API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};



