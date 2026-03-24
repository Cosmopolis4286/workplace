import { PrismaClient } from '@prisma/client';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

let prisma: PrismaClient | null = null;
let app: NestExpressApplication | null = null;

beforeAll(async () => {
  // Verify environment variables are loaded
  console.log('🔧 Setting up test environment...');
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔧 JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`🔧 JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ Missing'}`);

  // Skip database connection for unit tests
  console.log('⚠️ Skipping database connection for unit tests');
  
  // Create a minimal test module without database dependencies
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [], // Don't import AppModule to avoid database connection
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
  
  console.log('✅ Test environment setup completed');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  if (app) {
    await app.close();
    app = null;
  }
  
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.warn('⚠️ Could not disconnect from database:', error.message);
    }
    prisma = null;
  }
  
  console.log('✅ Test environment cleanup completed');
});

beforeEach(async () => {
  // Skip database cleanup for unit tests
  console.log('⚠️ Skipping database cleanup for unit tests');
});

export { prisma, app };
