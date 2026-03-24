import { PrismaClient } from '@prisma/client';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

let prisma: PrismaClient;
let app: NestExpressApplication;

beforeAll(async () => {
  // Verify environment variables are loaded
  console.log('🔧 Setting up test environment...');
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔧 JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`🔧 JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ Missing'}`);

  // Setup test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Setup NestJS test app
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
  
  console.log('✅ Test environment setup completed');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  if (app) {
    await app.close();
  }
  
  if (prisma) {
    await prisma.$disconnect();
  }
  
  console.log('✅ Test environment cleanup completed');
});

beforeEach(async () => {
  // Clean database before each test
  if (prisma) {
    try {
      await prisma.$executeRaw`TRUNCATE TABLE "users", "appointments", "audit_logs" RESTART IDENTITY CASCADE`;
    } catch (error) {
      console.warn('⚠️ Could not clean database:', error.message);
    }
  }
});

export { prisma, app };
