import { Injectable, Logger } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../../../prisma/prisma.service';

// Tokens que FCM ya no acepta (app desinstalada, token rotado): se borran
// para no volver a intentarlos en cada notificación.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export interface PushPayload {
  title: string;
  message: string;
  link?: string | null;
  type?: string;
}

/**
 * Push nativo (APK en segundo plano) vía Firebase Cloud Messaging. Se activa
 * solo si hay credenciales de cuenta de servicio:
 * FIREBASE_SERVICE_ACCOUNT_JSON (el JSON completo) o FIREBASE_PROJECT_ID +
 * FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY. Sin ellas es un no-op, así que
 * desarrollo y tests no necesitan Firebase. Ver frontend/docs/PUSH_NOTIFICATIONS.md.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private app: App | null | undefined;

  constructor(private readonly prisma: PrismaService) {}

  get enabled() {
    return this.getApp() !== null;
  }

  async sendToUser(userId: string, payload: PushPayload) {
    const app = this.getApp();
    if (!app) return;

    const devices = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (devices.length === 0) return;
    const tokens = devices.map((d) => d.token);

    try {
      const res = await getMessaging(app).sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.message },
        // data solo admite strings; `link` lo usa el plugin de la app para
        // navegar al tocar la notificación.
        data: {
          ...(payload.link ? { link: payload.link } : {}),
          ...(payload.type ? { type: payload.type } : {}),
        },
        android: {
          priority: 'high',
          notification: { channelId: 'default', sound: 'default' },
        },
      });

      const dead = res.responses
        .map((r, i) =>
          !r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)
            ? tokens[i]
            : null
        )
        .filter((t): t is string => t !== null);
      if (dead.length) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: dead } },
        });
      }
    } catch (err) {
      this.logger.warn(`No se pudo enviar el push: ${(err as Error).message}`);
    }
  }

  private getApp(): App | null {
    if (this.app !== undefined) return this.app;
    const credentials = this.readCredentials();
    if (!credentials) {
      this.app = null;
      return null;
    }
    try {
      this.app =
        getApps().find((a) => a.name === 'workplace-push') ??
        initializeApp({ credential: cert(credentials) }, 'workplace-push');
      this.logger.log('Push FCM activado');
    } catch (err) {
      this.logger.error(
        `Credenciales de Firebase inválidas, push desactivado: ${(err as Error).message}`
      );
      this.app = null;
    }
    return this.app;
  }

  private readCredentials() {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      try {
        const parsed = JSON.parse(json);
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      } catch {
        this.logger.error('FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido');
        return null;
      }
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
  }
}
