import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './app.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';
import { AuditLogger } from './audit/audit.logger';

async function bootstrap() {
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

  // 🔥 Graceful shutdown setup
  const server = app.getHttpServer();
  
  // Handle SIGTERM (Docker stop)
  process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received - starting graceful shutdown...');
    
    // Stop accepting new connections
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      // Close database connections
      const prismaService = app.get('PrismaService');
      await prismaService.$disconnect();
      console.log('✅ Database connections closed');
      
      // Close Redis connections
      const redisService = app.get('RedisService');
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
      
      const prismaService = app.get('PrismaService');
      await prismaService.$disconnect();
      console.log('✅ Database connections closed');
      
      const redisService = app.get('RedisService');
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
