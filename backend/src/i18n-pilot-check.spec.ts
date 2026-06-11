import { Test } from '@nestjs/testing';
import { I18nModule, I18nService, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';

describe('i18n pilot setup', () => {
  let i18n: I18nService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: 'es',
          loaderOptions: {
            path: join(__dirname, 'i18n'),
            watch: false,
          },
          resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
        }),
      ],
    }).compile();

    i18n = moduleRef.get(I18nService);
  });

  it('resuelve mensajes en espanol (idioma por defecto)', () => {
    expect(i18n.t('auth.login.invalid_credentials', { lang: 'es' })).toBe('Credenciales incorrectas');
    expect(i18n.t('auth.login.blocked', { lang: 'es' })).toBe('Demasiados intentos fallidos. Espera 15 minutos.');
  });

  it('resuelve mensajes en ingles', () => {
    expect(i18n.t('auth.login.invalid_credentials', { lang: 'en' })).toBe('Invalid credentials');
    expect(i18n.t('auth.login.blocked', { lang: 'en' })).toBe('Too many failed attempts. Wait 15 minutes.');
  });

  it('interpola y pluraliza el mensaje de rate limit (es)', () => {
    const wait1 = i18n.t('common.rate_limit.wait_minutes', { lang: 'es', args: { count: 1 } });
    const wait15 = i18n.t('common.rate_limit.wait_minutes', { lang: 'es', args: { count: 15 } });
    expect(wait1).toBe('1 minuto');
    expect(wait15).toBe('15 minutos');

    const msg = i18n.t('common.rate_limit.exceeded', { lang: 'es', args: { wait: wait15 } });
    expect(msg).toBe('Demasiadas solicitudes. Intenta de nuevo en 15 minutos.');
  });

  it('interpola y pluraliza el mensaje de rate limit (en)', () => {
    const wait1 = i18n.t('common.rate_limit.wait_seconds', { lang: 'en', args: { count: 1 } });
    const wait30 = i18n.t('common.rate_limit.wait_seconds', { lang: 'en', args: { count: 30 } });
    expect(wait1).toBe('1 second');
    expect(wait30).toBe('30 seconds');

    const msg = i18n.t('common.rate_limit.exceeded', { lang: 'en', args: { wait: wait30 } });
    expect(msg).toBe('Too many requests. Try again in 30 seconds.');
  });

  it('resuelve mensajes de error compartidos (es/en)', () => {
    expect(i18n.t('common.errors.access_denied', { lang: 'es' })).toBe('Acceso denegado');
    expect(i18n.t('common.errors.access_denied', { lang: 'en' })).toBe('Access denied');
  });

  it('resuelve mensajes del modulo branches (es/en)', () => {
    expect(i18n.t('branches.not_found', { lang: 'es' })).toBe('Sucursal no encontrada');
    expect(i18n.t('branches.not_found', { lang: 'en' })).toBe('Branch not found');
    expect(i18n.t('branches.name_taken', { lang: 'es' })).toBe('Ya existe una sucursal con ese nombre');
    expect(i18n.t('branches.name_taken', { lang: 'en' })).toBe('A branch with that name already exists');
  });
});
