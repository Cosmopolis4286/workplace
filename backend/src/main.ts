import './config/env'; // valida variables de entorno antes de arrancar
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createAdapter } from '@socket.io/redis-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AuditInterceptor } from './domains/identity-access/audit/audit.interceptor';
import { AuditService } from './domains/identity-access/audit/audit.service';
import { AuditLogger } from './domains/identity-access/audit/audit.logger';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  // Instantiate a dedicated PrismaClient for the logger (pre-DI)
  const loggerPrisma = new PrismaClient();
  const auditLogger = new AuditLogger(loggerPrisma);

  const app = await NestFactory.create(AppModule, { logger: auditLogger });

  // Hay exactamente un proxy (Traefik/nginx) delante del backend: solo ese
  // hop puede sobrescribir x-forwarded-for de forma confiable. Sin esto,
  // Express ignora el proxy y RateLimitGuard/ThrottlerGuard leen el header
  // crudo, que cualquier cliente puede falsificar para resetear su límite.
  app.set('trust proxy', 1);

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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = [frontendUrl, 'https://localhost'];

  // En desarrollo, el frontend (pnpm dev) corre en el host y puede probarse
  // desde otros dispositivos en la misma red (p.ej. http://192.168.x.x:3000).
  // Esa IP no se conoce de antemano, así que en dev (nunca en producción)
  // aceptamos cualquier IP privada que use el mismo puerto que FRONTEND_URL.
  const isDev = process.env.APP_ENV === 'development';
  const frontendPort = new URL(frontendUrl).port;
  const isPrivateLan = (origin: string): boolean => {
    try {
      const { hostname, port } = new URL(origin);
      if (port !== frontendPort) return false;
      return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (isDev && isPrivateLan(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'), false);
    },
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

  // Adapter de Redis para Socket.IO: sin esto, las salas (user:*, restaurant:*)
  // viven solo en memoria del proceso y un evento emitido desde una instancia
  // nunca llega a un cliente conectado a otra instancia. Necesario para poder
  // escalar el backend a más de un réplica.
  const redisService = app.get(RedisService);
  const pubClient = redisService.duplicate();
  const subClient = pubClient.duplicate();

  class RedisIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: any) {
      const server = super.createIOServer(port, options);
      server.adapter(createAdapter(pubClient, subClient));
      return server;
    }
  }

  app.useWebSocketAdapter(new RedisIoAdapter(app));

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
      await Promise.all([pubClient.quit(), subClient.quit()]);
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

      await Promise.all([pubClient.quit(), subClient.quit()]);
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
