import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  private get fromAddress() {
    const name = process.env.MAIL_FROM_NAME || 'WorkPlace Manager';
    const addr = process.env.MAIL_USER || 'noreply@workplacemanager.com';
    return `"${name}" <${addr}>`;
  }

  private loadTemplate(
    templateName: string,
    variables: Record<string, string>
  ): string {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.html`
    );
    let template = fs.readFileSync(templatePath, 'utf-8');

    Object.entries(variables).forEach(([key, value]) => {
      // Valores escapados (el nombre lo elige el usuario) y vía función: un
      // string de reemplazo interpretaría secuencias como $& o $'.
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), () =>
        escapeHtml(value)
      );
    });

    return template;
  }

  async sendPasswordReset(email: string, token: string, firstName: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recover-password?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Restablecer contraseña — WorkPlace Manager',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hola, ${escapeHtml(firstName)}</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el botón a continuación. El enlace expira en <strong>1 hora</strong>.</p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Restablecer contraseña
            </a>
            <p style="margin-top:24px;color:#6b7280;font-size:14px">
              Si no solicitaste esto, ignora este correo.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send password reset email to ${email}: ${err.message}`
      );
    }
  }

  async sendSecurityAlert(
    email: string,
    firstName: string,
    event: 'password_changed' | 'email_changed' | 'password_reset',
    context?: { ip?: string; userAgent?: string }
  ) {
    const messages: Record<
      typeof event,
      { subject: string; title: string; body: string }
    > = {
      password_changed: {
        subject: 'Tu contraseña fue cambiada — WorkPlace Manager',
        title: 'Contraseña actualizada',
        body: 'Tu contraseña fue cambiada exitosamente.',
      },
      password_reset: {
        subject: 'Tu contraseña fue restablecida — WorkPlace Manager',
        title: 'Contraseña restablecida',
        body: 'Tu contraseña fue restablecida usando el enlace de recuperación.',
      },
      email_changed: {
        subject: 'Tu correo electrónico fue actualizado — WorkPlace Manager',
        title: 'Correo electrónico actualizado',
        body: 'La dirección de correo de tu cuenta fue actualizada.',
      },
    };
    const { subject, title, body } = messages[event];
    const meta = [
      context?.ip ? `IP: ${context.ip}` : null,
      context?.userAgent ? `Dispositivo: ${context.userAgent}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hola, ${escapeHtml(firstName)}</h2>
            <h3>${title}</h3>
            <p>${body}</p>
            ${meta ? `<p style="color:#6b7280;font-size:13px">${escapeHtml(meta)}</p>` : ''}
            <p style="margin-top:24px;color:#6b7280;font-size:14px">
              Si no realizaste este cambio, contacta a soporte de inmediato y restablece tu contraseña.
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send security alert (${event}) to ${email}: ${err.message}`
      );
    }
  }

  async sendEmailVerification(email: string, token: string, firstName: string) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    try {
      const html = this.loadTemplate('email-verification', {
        firstName,
        verifyUrl,
      });

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Verifica tu correo — WorkPlace Manager',
        html,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send verification email to ${email}: ${err.message}`
      );
    }
  }

  async sendKycStatusUpdate(
    email: string,
    firstName: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) {
    const isApproved = status === 'APPROVED';
    const subject = isApproved
      ? 'Tu identidad fue verificada — WorkPlace Manager'
      : 'No pudimos verificar tu identidad — WorkPlace Manager';
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hola, ${escapeHtml(firstName)}</h2>
            ${
              isApproved
                ? `<p>¡Buenas noticias! Tu identidad ha sido <strong>verificada</strong> exitosamente. Ya puedes realizar retiros y transferencias sin restricciones.</p>`
                : `<p>No pudimos verificar tu identidad con los documentos enviados.</p>
                   ${rejectionReason ? `<p style="color:#dc2626"><strong>Motivo:</strong> ${escapeHtml(rejectionReason)}</p>` : ''}
                   <p>Puedes volver a intentarlo desde tu perfil con documentos más claros.</p>`
            }
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send KYC status email to ${email}: ${err.message}`
      );
    }
  }

  async sendDriverInvitation(
    email: string,
    commerceName: string,
    token: string
  ) {
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/driver-invitation/${token}`;
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: `${commerceName} te invitó a ser repartidor — WorkPlace Manager`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>¡Hola!</h2>
            <p><strong>${escapeHtml(commerceName)}</strong> te invitó a unirte como repartidor en WorkPlace Manager.</p>
            <p>Para aceptar, crea o inicia sesión con tu cuenta y verifica tu identidad — es un requisito para poder recibir entregas.</p>
            <p><a href="${acceptUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Aceptar invitación</a></p>
            <p style="color:#6b7280;font-size:12px">Este enlace expira en 7 días.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send driver invitation email to ${email}: ${err.message}`
      );
    }
  }

  async sendDriverGraceExpiringReminder(
    email: string,
    driverName: string,
    daysLeft: number
  ) {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: `Acción requerida: ${driverName} necesita verificar su identidad — WorkPlace Manager`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hola</h2>
            <p>Tu repartidor <strong>${escapeHtml(driverName)}</strong> todavía no tiene una cuenta verificada en WorkPlace Manager.</p>
            <p>En <strong>${daysLeft} día${daysLeft === 1 ? '' : 's'}</strong> dejará de poder recibir nuevas entregas si no se registra y verifica su identidad.</p>
            <p>Invítalo desde tu panel de repartidores en la sección Delivery.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send driver grace reminder email to ${email}: ${err.message}`
      );
    }
  }

  async sendProposedCategoryStatusUpdate(
    email: string,
    firstName: string,
    categoryName: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) {
    const isApproved = status === 'APPROVED';
    const subject = isApproved
      ? 'Tu categoría propuesta fue aprobada — WorkPlace Manager'
      : 'Tu categoría propuesta fue rechazada — WorkPlace Manager';
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hola, ${escapeHtml(firstName)}</h2>
            ${
              isApproved
                ? `<p>¡Buenas noticias! Tu categoría propuesta "<strong>${escapeHtml(categoryName)}</strong>" fue <strong>aprobada</strong> y ya está disponible en los filtros de búsqueda.</p>`
                : `<p>Tu categoría propuesta "<strong>${escapeHtml(categoryName)}</strong>" fue rechazada.</p>
                   ${rejectionReason ? `<p style="color:#dc2626"><strong>Motivo:</strong> ${escapeHtml(rejectionReason)}</p>` : ''}`
            }
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send proposed category status email to ${email}: ${err.message}`
      );
    }
  }

  async sendServiceRequestReminder(
    email: string,
    firstName: string,
    providerName: string,
    serviceName: string
  ) {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Tu solicitud sigue esperando respuesta — WorkPlace Manager',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Hola, ${escapeHtml(firstName)}</h2>
            <p>Tu solicitud de "<strong>${escapeHtml(serviceName)}</strong>" con <strong>${escapeHtml(providerName)}</strong> lleva más de 24 horas sin respuesta.</p>
            <p>Puedes seguir esperando o explorar otros proveedores disponibles para este servicio.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(
        `Could not send service request reminder email to ${email}: ${err.message}`
      );
    }
  }
}
