import { PrismaClient } from '@prisma/client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

let prisma: PrismaClient;
let app: NestFastifyApplication;

beforeAll(async () => {
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
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.$executeRaw`TRUNCATE TABLE "users", "appointments", "audit_logs" RESTART IDENTITY CASCADE`;
});

export { prisma, app };
