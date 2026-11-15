import { appConfig } from '../../config/app-config';
import { envErrors, envWarnings } from '../../config/env.schema';

const VALID = {
  DATABASE_URL: 'postgresql://u:p@postgres:5432/db',
  REDIS_HOST: 'redis',
  REDIS_PASSWORD: 'x',
  JWT_SECRET: '0123456789abcdef0',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: '0123456789abcdef0',
  JWT_REFRESH_EXPIRES_IN: '7d',
  ENCRYPTION_KEY: 'a'.repeat(64),
  FRONTEND_URL: 'http://localhost:3000',
};

describe('env.schema — validación de arranque', () => {
  it('acepta una configuración válida, con opcionales vacíos', () => {
    expect(
      envWarnings({
        ...VALID,
        PROTECTED_PAYMENTS_ENABLED: '',
        PLATFORM_VAT_RATE: '',
        FIREBASE_SERVICE_ACCOUNT_JSON: '',
      })
    ).toEqual([]);
    expect(envErrors(VALID)).toEqual([]);
    expect(
      envWarnings({ ...VALID, BNPL_ENABLED: 'false', PLATFORM_VAT_RATE: '0' })
    ).toEqual([]);
  });

  it('avisa de cada opcional mal escrita (sin impedir arrancar)', () => {
    const source = {
      ...VALID,
      PROTECTED_PAYMENTS_ENABLED: 'yes',
      PLATFORM_VAT_RATE: 'abc',
      CATALOG_ESCROW_RESPONSE_DAYS: '-1',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{malo',
    };
    expect(envErrors(source)).toEqual([]);
    const errors = envWarnings(source).join('\n');
    expect(errors).toContain('PROTECTED_PAYMENTS_ENABLED');
    expect(errors).toContain('PLATFORM_VAT_RATE');
    expect(errors).toContain('CATALOG_ESCROW_RESPONSE_DAYS');
    expect(errors).toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
  });

  it('exige lo obligatorio', () => {
    const { DATABASE_URL: _omit, ...rest } = VALID;
    expect(envErrors(rest).join('\n')).toContain('DATABASE_URL');
  });
});

describe('appConfig — lectura única de variables', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('valores por defecto cuando no están definidas', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.PLATFORM_VAT_RATE;
    delete process.env.REDIS_PORT;
    expect(appConfig.frontendUrl()).toBe('http://localhost:3000');
    expect(appConfig.platformVatRate()).toBe(16);
    expect(appConfig.redis().port).toBe(6379);
    expect(appConfig.catalogEscrow()).toEqual({
      responseDays: 3,
      autoReleaseDays: 7,
    });
  });

  it('quita la barra final de FRONTEND_URL (enlaces de correo y CORS)', () => {
    process.env.FRONTEND_URL = 'https://playrke.com/';
    expect(appConfig.frontendUrl()).toBe('https://playrke.com');
  });

  it('una variable vacía cuenta como no definida', () => {
    process.env.PLATFORM_VAT_RATE = '';
    process.env.MAIL_FROM_NAME = '  ';
    expect(appConfig.platformVatRate()).toBe(16);
    expect(appConfig.mail().fromName).toBe('WorkPlace Manager');
  });

  it('los interruptores solo se encienden con "true" y se leen en cada llamada', () => {
    process.env.PROTECTED_PAYMENTS_ENABLED = 'TRUE';
    expect(appConfig.features.protectedPayments()).toBe(false);
    process.env.PROTECTED_PAYMENTS_ENABLED = 'true';
    expect(appConfig.features.protectedPayments()).toBe(true);
    delete process.env.PROTECTED_PAYMENTS_ENABLED;
    expect(appConfig.features.protectedPayments()).toBe(false);
  });

  it('IVA: 0 lo desactiva y un valor inválido cuenta como 0', () => {
    process.env.PLATFORM_VAT_RATE = '0';
    expect(appConfig.platformVatRate()).toBe(0);
    process.env.PLATFORM_VAT_RATE = '-5';
    expect(appConfig.platformVatRate()).toBe(0);
  });

  it('la clave privada de Firebase admite \\n escapados en una línea', () => {
    process.env.FIREBASE_PRIVATE_KEY = 'linea1\\nlinea2';
    expect(appConfig.firebase().privateKey).toBe('linea1\nlinea2');
  });
});
