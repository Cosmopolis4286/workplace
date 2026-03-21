import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './app.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';
import { AuditLogger } from './audit/audit.logger';

async function bootstrap() {
  // ERROR FORZADO - Esto debe hacer fallar el deploy
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // ← Esto hará que el contenedor falle inmediatamente
  }

  // Instantiate a dedicated PrismaClient for the logger (pre-DI)
  const loggerPrisma = new PrismaClient();
  const auditLogger = new AuditLogger(loggerPrisma);

  const app = await NestFactory.create(AppModule, { logger: auditLogger });

  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: isDev ? true : process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.setGlobalPrefix('api');

  // Global audit interceptor
  const auditService = app.get(AuditService);
  app.useGlobalInterceptors(new AuditInterceptor(auditService));

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
