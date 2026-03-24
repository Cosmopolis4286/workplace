// Test environment setup
// Load test environment variables before running tests

import dotenv from 'dotenv'
import path from 'path'

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../.env.test') })

// Ensure all required environment variables are set
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'NODE_ENV'
]

// Set fallback values if not provided
const fallbackEnvVars = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  REDIS_URL: 'redis://localhost:6379',
  NODE_ENV: 'test',
  PORT: '3001',
  BCRYPT_ROUNDS: '10'
}

// Apply fallback values
Object.entries(fallbackEnvVars).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value
  }
})

// Verify all required variables are set
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.warn('⚠️ Missing environment variables:', missingVars.join(', '))
  console.warn('⚠️ Using fallback values for testing')
}

console.log('✅ Test environment variables loaded')
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`)
console.log(`🔧 DATABASE_URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`)
console.log(`🔧 REDIS_URL: ${process.env.REDIS_URL}`)
