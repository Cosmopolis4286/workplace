const sendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail })),
}));

import { MailService } from '../../domains/engagement/mail/mail.service';

describe('MailService — HTML escapado', () => {
  const service = new MailService();
  const evil = 'Ana <a href="https://evil.example">clic</a> $& $\'';
  const html = () => sendMail.mock.calls.at(-1)[0].html as string;

  beforeEach(() => sendMail.mockClear());

  it('escapa el nombre en la plantilla de verificación (sin $& interpretado)', async () => {
    await service.sendEmailVerification('v@test.local', 'tok', evil);
    expect(html()).not.toContain('<a href="https://evil');
    expect(html()).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
    expect(html()).toContain('$&amp; $&#39;');
  });

  it('escapa el nombre en el correo de restablecimiento', async () => {
    await service.sendPasswordReset('v@test.local', 'tok', evil);
    expect(html()).not.toContain('<a href="https://evil');
  });

  it('escapa el User-Agent de la alerta de seguridad (lo controla quien hace la request)', async () => {
    await service.sendSecurityAlert('v@test.local', 'Ana', 'password_changed', {
      ip: '1.2.3.4',
      userAgent: '<img src=x onerror=alert(1)>',
    });
    expect(html()).not.toContain('<img src=x');
    expect(html()).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
