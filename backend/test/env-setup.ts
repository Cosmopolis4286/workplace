// Test environment setup
// Set test environment variables directly without dotenv

import path from 'path'

// Set test environment variables directly
const testEnvVars = {
  APP_ENV: 'test',
  PORT: '3001',
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  REDIS_URL: 'redis://localhost:6379',
  BCRYPT_ROUNDS: '10',
  UPLOAD_DIR: './uploads/test',
  MAX_FILE_SIZE: '5242880',
  EMAIL_SERVICE_HOST: 'localhost',
  EMAIL_SERVICE_PORT: '587',
  EMAIL_SERVICE_USER: 'test',
  EMAIL_SERVICE_PASS: 'test',
  CORS_ORIGIN: 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  LOG_LEVEL: 'error',
  ENABLE_METRICS: 'false',
  // Google OAuth test variables
  GOOGLE_CLIENT_ID: 'test-google-client-id-for-testing',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret-for-testing',
  GOOGLE_CALLBACK_URL: 'http://localhost:3001/auth/google/callback'
}

// Apply all environment variables
Object.entries(testEnvVars).forEach(([key, value]) => {
  process.env[key] = value
})

console.log('✅ Test environment variables loaded')
console.log(`🔧 APP_ENV: ${process.env.APP_ENV}`)
console.log(`🔧 DATABASE_URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`)
console.log(`🔧 REDIS_URL: ${process.env.REDIS_URL}`)
console.log(`🔧 JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`)
console.log(`🔧 JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ Missing'}`)
console.log(`🔧 GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`)
console.log(`🔧 GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`)
