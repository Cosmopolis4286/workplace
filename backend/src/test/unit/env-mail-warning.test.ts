import { warnMissingMail } from '../../config/mail-warning';

describe('warnMissingMail', () => {
  const base = { APP_ENV: 'production' };
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it('avisa en producción si falta la configuración SMTP', () => {
    expect(warnMissingMail({ ...base, MAIL_HOST: 'smtp.x' })).toEqual([
      'MAIL_USER',
      'MAIL_PASS',
    ]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('no avisa en producción con SMTP completo', () => {
    expect(
      warnMissingMail({
        ...base,
        MAIL_HOST: 'smtp.x',
        MAIL_USER: 'u',
        MAIL_PASS: 'p',
      })
    ).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('no avisa fuera de producción', () => {
    expect(warnMissingMail({ APP_ENV: 'development' })).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
