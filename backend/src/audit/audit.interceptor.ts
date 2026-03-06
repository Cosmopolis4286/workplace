import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { AuditService } from './audit.service'
import { AuditAction } from '@prisma/client'
import { Request } from 'express'

const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST:   AuditAction.CREATE,
  PUT:    AuditAction.UPDATE,
  PATCH:  AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
  GET:    AuditAction.VIEW,
}

// Map route prefixes to module names
function resolveModule(path: string): string {
  const segments = path.replace(/^\/api\//, '').split('/')
  const first = segments[0] ?? 'unknown'
  const moduleMap: Record<string, string> = {
    auth:            'auth',
    users:           'usuarios',
    menu:            'menu',
    inventory:       'inventario',
    orders:          'pedidos',
    customers:       'clientes',
    appointments:    'agendamientos',
    delivery:        'delivery',
    expenses:        'gastos',
    analytics:       'analytics',
    employees:       'empleados',
    branches:        'sucursales',
    settings:        'configuracion',
    notifications:   'notificaciones',
    catalog:         'catalogo',
    profiles:        'perfiles',
    permissions:     'permisos',
    audit:           'auditoria',
  }
  return moduleMap[first] ?? first
}

function buildSummary(method: string, path: string, user: any): string {
  const module = resolveModule(path)
  const action = METHOD_ACTION_MAP[method] ?? 'OTHER'
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'anónimo'
  return `[${action}] ${module} — ${name}`
}

// Skip read-only GET endpoints to avoid flooding audit log
const SKIP_GET_PATHS = ['/api/permissions/me', '/api/notifications/unread-count']

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>()
    const user = (req as any).user

    // Only audit authenticated requests
    if (!user) return next.handle()

    const method = req.method
    const path = req.path

    // Skip noisy GET endpoints
    if (method === 'GET' && SKIP_GET_PATHS.some(p => path.startsWith(p))) {
      return next.handle()
    }

    // Skip GET entirely (too noisy) — only write operations and auth
    const isWriteOp = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const isAuthPath = path.startsWith('/api/auth')
    if (!isWriteOp && !isAuthPath) return next.handle()

    const ip = req.ip ?? req.socket?.remoteAddress
    const userAgent = req.headers['user-agent'] ?? ''

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService.log({
            userId:     user.id,
            userEmail:  user.email,
            userRole:   user.role,
            action:     METHOD_ACTION_MAP[method] ?? AuditAction.OTHER,
            module:     resolveModule(path),
            summary:    buildSummary(method, path, user),
            details:    { method, path, body: sanitizeBody(req.body) },
            ip,
            userAgent,
            statusCode: 200,
          })
        },
        error: (err) => {
          this.auditService.log({
            userId:     user.id,
            userEmail:  user.email,
            userRole:   user.role,
            action:     METHOD_ACTION_MAP[method] ?? AuditAction.OTHER,
            module:     resolveModule(path),
            summary:    `[ERROR] ${buildSummary(method, path, user)}`,
            details:    { method, path, error: err?.message },
            ip,
            userAgent,
            statusCode: err?.status ?? 500,
          })
        },
      }),
    )
  }
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return undefined
  const safe = { ...body }
  for (const key of ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken']) {
    if (key in safe) safe[key] = '***'
  }
  return safe
}
