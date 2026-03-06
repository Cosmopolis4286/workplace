import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { AuditInterceptor } from './audit/audit.interceptor'
import { AuditService } from './audit/audit.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug'] })

  const isDev = process.env.NODE_ENV !== 'production'
  app.enableCors({
    origin: isDev ? true : (process.env.FRONTEND_URL || 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api')

  // Global audit interceptor
  const auditService = app.get(AuditService)
  app.useGlobalInterceptors(new AuditInterceptor(auditService))

  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')
  console.log(`Backend running on http://0.0.0.0:${port}`)
}
bootstrap()
