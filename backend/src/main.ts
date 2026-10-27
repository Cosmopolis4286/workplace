import './config/env'; // valida variables de entorno antes de arrancar
import './common/money/decimal-json'; // Decimal -> number en las respuestas JSON
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join, posix } from 'path';
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: auditLogger,
  });

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

  // Archivos públicos subidos por usuarios (avatares, portadas, posts…).
  // uploads/service-requests es privado: se corta aquí antes del estático y
  // solo se sirve con auth en GET /api/services/requests/media/:filename.
  // Se compara contra la ruta decodificada y normalizada, igual que la
  // resolverá express.static (%2D, ./, // no deben saltarse el corte).
  app.use('/uploads', (req: any, res: any, next: () => void) => {
    let path: string;
    try {
      path = posix.normalize(decodeURIComponent(req.path)).toLowerCase();
    } catch {
      path = '';
    }
    if (!path || path.startsWith('/service-requests')) {
      res.status(404).json({ statusCode: 404, message: 'Not Found' });
      return;
    }
    next();
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    index: false,
  });

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
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      if (isDev && isPrivateLan(origin)) return callback(null, true);
      // Origen no permitido: responder sin cabeceras CORS (el navegador
      // bloquea). Lanzar un Error lo convertía en un 500 en cada preflight.
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // CORS alone does not prevent cross-site HTML form submissions (CSRF).
  // Enforce Origin on browser state-changing requests before controllers run.
  // Requests without Origin remain available to native/API clients; cookie
  // authentication should only be used by trusted browser origins.
  app.use((req: any, res: any, next: () => void) => {
    const method = String(req.method || 'GET').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const origin = req.headers.origin as string | undefined;

    const usesCookieAuth = Boolean(
      req.cookies?.access_token || req.cookies?.refresh_token
    );

    if (isStateChanging && (origin || usesCookieAuth)) {
      if (
        !origin ||
        (!allowedOrigins.includes(origin) && !(isDev && isPrivateLan(origin)))
      ) {
        res.status(403).json({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Origen no permitido',
        });
        return;
      }
    }

    next();
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

  // Adapter de Redis para Socket.IO: sin esto, las salas (user:*, commerce:*)
  // viven solo en memoria del proceso y un evento emitido desde una instancia
  // nunca llega a un cliente conectado a otra instancia. Necesario para poder
  // escalar el backend a más de un réplica.
  // Debe instalarse ANTES de app.init(): los gateways se enlazan al adapter
  // en init y uno instalado después se ignora. Por eso usa conexiones propias
  // en vez de RedisService, cuyo cliente nace en onModuleInit (dentro de init).
  const pubClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
  const subClient = pubClient.duplicate();

  class RedisIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: any) {
      const server = super.createIOServer(port, options);
      server.adapter(createAdapter(pubClient, subClient));
      return server;
    }
  }

  app.useWebSocketAdapter(new RedisIoAdapter(app));

  await app.init();
  const redisService = app.get(RedisService);

  // 🔥 Graceful shutdown setup
  const server = app.getHttpServer();

  const gracefulShutdown = (signal: string) => {
    console.log(`🔄 ${signal} received - starting graceful shutdown...`);

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
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Docker stop
  process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on http://0.0.0.0:${port}`);
}

bootstrap();
