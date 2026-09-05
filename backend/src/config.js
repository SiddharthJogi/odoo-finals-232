require('dotenv').config({ override: true });

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
  },
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
};
