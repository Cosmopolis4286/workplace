# 🛡️ Application-Level Resilience Patterns

## 🧠 Por Qué Resiliencia a Nivel Aplicación

**Problema actual:**
- ❌ `depends_on` solo garantiza startup order
- ❌ Si un servicio cae después → aplicación rota
- ❌ No hay recuperación automática de fallos
- ❌ Usuarios experimentan errores 500/502

**Solución:**
- ✅ Resiliencia integrada en la aplicación
- ✅ Recuperación automática de fallos
- ✅ Experiencia de usuario estable
- ✅ Sistema auto-curativo

---

## 🔄 Patrones de Resiliencia Implementables

### 1. Database Resilience

#### Connection Pooling con Retry
```typescript
// backend/src/database/connection.ts
import { PrismaClient } from '@prisma/client';
import { retry } from 'ts-retry-promise';

class DatabaseService {
  private prisma: PrismaClient;
  private isConnected = false;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async connect(): Promise<void> {
    try {
      await retry(
        async () => {
          await this.prisma.$connect();
          this.isConnected = true;
        },
        {
          retries: 5,
          delay: 1000,
          factor: 2,
          maxDelay: 10000,
        }
      );
    } catch (error) {
      console.error('Failed to connect to database after retries:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.isConnected = false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Circuit breaker pattern
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.isConnected) {
      if (fallback) {
        return fallback();
      }
      throw new Error('Database not connected');
    }

    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.error('Database operation failed:', error);
      this.isConnected = false;
      
      // Attempt reconnection
      setTimeout(() => this.connect(), 5000);
      
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }
}

export const db = new DatabaseService();
```

#### Retry Strategy para Queries
```typescript
// backend/src/utils/database-retry.ts
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    fallback?: () => Promise<T>;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, fallback } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        if (fallback) {
          console.warn(`Database operation failed after ${retries} retries, using fallback`);
          return fallback();
        }
        throw error;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${retries}), retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Should not reach here');
}
```

### 2. Redis Resilience

#### Connection con Reconnect
```typescript
// backend/src/cache/redis-client.ts
import Redis from 'ioredis';

class RedisService {
  private client: Redis;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('error', (error) => {
      console.error('Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.warn('Redis connection closed');
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max Redis reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      this.client.connect().catch(error => {
        console.error(`Redis reconnect attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      return null; // Graceful degradation
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get failed:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected) {
      return; // Silent failure for cache
    }

    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set failed:', error);
      // Silent failure for cache operations
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

export const redis = new RedisService();
```

### 3. HTTP Client Resilience

#### Retry con Circuit Breaker
```typescript
// backend/src/utils/http-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ResilientHttpClient {
  private client: AxiosInstance;
  private circuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
  };

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        // Add retry count to headers
        config.headers['X-Retry-Count'] = String(config.headers['X-Retry-Count'] || 0);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const retryCount = parseInt(error.config?.headers?.['X-Retry-Count'] || '0');
        
        if (retryCount < 3 && this.shouldRetry(error)) {
          const delay = Math.pow(2, retryCount) * 1000;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          error.config.headers['X-Retry-Count'] = String(retryCount + 1);
          return this.client.request(error.config);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true; // Network errors
    }

    const { status } = error.response;
    return [429, 500, 502, 503, 504].includes(status);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const response = await this.client.get<T>(url, config);
      this.onSuccess();
      return response.data;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const response = await this.client.post<T>(url, data, config);
      this.onSuccess();
      return response.data;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isCircuitBreakerOpen(): boolean {
    const { failures, lastFailureTime, state } = this.circuitBreakerState;
    const now = Date.now();

    if (state === 'OPEN') {
      if (now - lastFailureTime > 60000) { // 1 minute timeout
        this.circuitBreakerState.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }

    return false;
  }

  private onSuccess(): void {
    this.circuitBreakerState.failures = 0;
    this.circuitBreakerState.state = 'CLOSED';
  }

  private onFailure(): void {
    this.circuitBreakerState.failures++;
    this.circuitBreakerState.lastFailureTime = Date.now();

    if (this.circuitBreakerState.failures >= 5) {
      this.circuitBreakerState.state = 'OPEN';
    }
  }
}

export const httpClient = new ResilientHttpClient();
```

### 4. Graceful Degradation

#### Fallback Strategies
```typescript
// backend/src/services/fallback-service.ts
export class FallbackService {
  static async getUserData(userId: string) {
    try {
      // Try primary source (database)
      return await db.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
    } catch (error) {
      console.warn('Database failed, trying cache fallback:', error);
      
      try {
        // Try cache fallback
        const cached = await redis.get(`user:${userId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        console.warn('Cache fallback failed:', cacheError);
      }
      
      // Final fallback - minimal user data
      return {
        id: userId,
        email: 'unknown@example.com',
        profile: null,
        _fallback: true,
      };
    }
  }

  static async sendMessage(message: any) {
    try {
      // Try primary notification service
      return await httpClient.post('/api/notifications', message);
    } catch (error) {
      console.warn('Primary notification failed, queuing for retry:', error);
      
      try {
        // Queue for later retry
        await redis.set(
          `notification_queue:${Date.now()}`,
          JSON.stringify(message),
          3600 // 1 hour TTL
        );
        
        return { status: 'queued', message: 'Notification queued for retry' };
      } catch (queueError) {
        console.error('Failed to queue notification:', queueError);
        return { status: 'failed', message: 'Notification failed completely' };
      }
    }
  }
}
```

### 5. Health Check Ampliado

#### Comprehensive Health Endpoint
```typescript
// backend/src/controllers/health.controller.ts
import { Request, Response } from 'express';
import { db } from '../database/connection';
import { redis } from '../cache/redis-client';

export class HealthController {
  static async ready(req: Request, res: Response) {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        memory: this.checkMemory(),
        disk: this.checkDisk(),
      },
    };

    const isHealthy = Object.values(checks.checks).every(check => check.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json(checks);
  }

  private static async checkDatabase() {
    try {
      const isHealthy = await db.healthCheck();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private static async checkRedis() {
    try {
      const isHealthy = await redis.healthCheck();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private static checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    return {
      status: memoryUsagePercent < 90 ? 'healthy' : 'unhealthy',
      usage: {
        total: totalMemory,
        used: usedMemory,
        percentage: memoryUsagePercent,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private static checkDisk() {
    // This would require a disk usage library
    // For now, return healthy
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## 🔄 Implementación en el Backend

### Middleware de Resiliencia
```typescript
// backend/src/middleware/resilience.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const resilienceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add resilience headers
  res.setHeader('X-Retry-After', '5');
  res.setHeader('X-RateLimit-Remaining', '100');
  
  // Handle graceful degradation
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      console.error(`Server error: ${req.method} ${req.path} - ${res.statusCode}`);
    }
  });

  next();
};
```

### Error Handler Global
```typescript
// backend/src/middleware/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Unhandled error:', error);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.name === 'ValidationError' ? 400 : 500;
  
  res.status(statusCode).json({
    error: {
      message: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};
```

---

## 📊 Monitoreo de Resiliencia

### Métricas Clave
```typescript
// backend/src/metrics/resilience.metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const resilienceMetrics = {
  // Database metrics
  dbConnectionsTotal: new Counter({
    name: 'db_connections_total',
    help: 'Total number of database connections',
    labelNames: ['status'],
  }),

  dbQueryDuration: new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation'],
  }),

  // Redis metrics
  redisOperationsTotal: new Counter({
    name: 'redis_operations_total',
    help: 'Total number of Redis operations',
    labelNames: ['operation', 'status'],
  }),

  // HTTP client metrics
  httpClientRequestsTotal: new Counter({
    name: 'http_client_requests_total',
    help: 'Total number of HTTP client requests',
    labelNames: ['method', 'status', 'service'],
  }),

  httpClientRequestDuration: new Histogram({
    name: 'http_client_request_duration_seconds',
    help: 'HTTP client request duration',
    labelNames: ['service'],
  }),

  // Circuit breaker metrics
  circuitBreakerState: new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
    labelNames: ['service'],
  }),
};

// Register all metrics
Object.values(resilienceMetrics).forEach(metric => register.registerMetric(metric));
```

---

## 🚀 Estrategia de Implementación

### Fase 1: Implementación Inmediata
1. **Database retry logic** - Prioridad alta
2. **Redis reconnection** - Prioridad alta
3. **Health checks ampliados** - Prioridad media

### Fase 2: Mejoras Mediano Plazo
1. **Circuit breaker pattern** - Prioridad media
2. **Graceful degradation** - Prioridad media
3. **Métricas de resiliencia** - Prioridad baja

### Fase 3: Optimización Avanzada
1. **Bulkhead pattern** - Prioridad baja
2. **Timeout management** - Prioridad baja
3. **Chaos engineering** - Prioridad baja

---

## 📋 Checklist de Resiliencia

- [ ] Database connection retry implementado
- [ ] Redis reconnection automático
- [ ] Circuit breaker para servicios externos
- [ ] Health checks completos
- [ ] Graceful degradation strategies
- [ ] Error handling centralizado
- [ ] Métricas de resiliencia
- [ ] Logging de fallos y recuperaciones
- [ ] Timeout configurados
- [ ] Fallbacks implementados

---

**🏁 Veredicto:** La resiliencia a nivel aplicación es CRÍTICA para producción. `depends_on` solo garantiza startup order, no runtime reliability.
