import { validate } from 'class-validator';
import { ResetPasswordDto } from '../../domains/identity-access/auth/dto/reset-password.dto';

describe('ResetPasswordDto', () => {
  it('accepts a UUID token and a strong password', async () => {
    const dto = Object.assign(new ResetPasswordDto(), {
      token: '550e8400-e29b-41d4-a716-446655440000',
      password: 'SecurePassword123',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects malformed tokens and weak passwords', async () => {
    const dto = Object.assign(new ResetPasswordDto(), {
      token: 'not-a-uuid',
      password: 'password',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['token', 'password'])
    );
  });

  it('rejects passwords longer than bcrypt safe input length', async () => {
    const dto = Object.assign(new ResetPasswordDto(), {
      token: '550e8400-e29b-41d4-a716-446655440000',
      password: 'A1' + 'a'.repeat(72),
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});
