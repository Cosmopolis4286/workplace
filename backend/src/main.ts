import './config/env'; // valida variables de entorno antes de arrancar
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';
import { AuditLogger } from './audit/audit.logger';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  // Instantiate a dedicated PrismaClient for the logger (pre-DI)
  const loggerPrisma = new PrismaClient();
  const auditLogger = new AuditLogger(loggerPrisma);

  const app = await NestFactory.create(AppModule, { logger: auditLogger });

  app.use(
    helmet({
      // API-only backend (no HTML views) — CSP/COEP can break cross-origin
      // asset loading (avatars under /uploads) from the Nuxt frontend.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(cookieParser());

  // La app Android (Capacitor, androidScheme: 'https') sirve el WebView desde
  // el origen https://localhost, distinto del dominio del FRONTEND_URL web.
  // Nunca reflejar origin:true con credentials:true — siempre validar contra
  // una whitelist explícita, incluso en desarrollo, para evitar exponer
  // cookies httpOnly a cualquier origen si APP_ENV queda mal configurado.
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://localhost',
  ];
  app.enableCors({
    origin: allowedOrigins,
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

  // 🔥 Graceful shutdown setup
  const server = app.getHttpServer();
  
  // Handle SIGTERM (Docker stop)
  process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received - starting graceful shutdown...');
    
    // Stop accepting new connections
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      // Close database connections
      const prismaService = app.get(PrismaService);
      await prismaService.$disconnect();
      console.log('✅ Database connections closed');
      
      // Close Redis connections
      const redisService = app.get(RedisService);
      await redisService.disconnect();
      console.log('✅ Redis connections closed');
      
      // Close app
      await app.close();
      console.log('✅ NestJS app closed');
      
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  });
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received - starting graceful shutdown...');
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      const prismaService = app.get(PrismaService);
      await prismaService.$disconnect();
      console.log('✅ Database connections closed');
      
      const redisService = app.get(RedisService);
      await redisService.disconnect();
      console.log('✅ Redis connections closed');
      
      await app.close();
      console.log('✅ NestJS app closed');
      
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on http://0.0.0.0:${port}`);
}

bootstrap();
