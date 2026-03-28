import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

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

  private loadTemplate(templateName: string, variables: Record<string, string>): string {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    Object.entries(variables).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
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
            <h2>Hola, ${firstName}</h2>
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

  async sendEmailVerification(email: string, token: string, firstName: string) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    try {
      const html = this.loadTemplate('email-verification', {
        firstName,
        verifyUrl
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
}
