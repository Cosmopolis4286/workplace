import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RecaptchaService } from '../../common/recaptcha/recaptcha.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecaptchaService', () => {
  let service: RecaptchaService;
  let secretValue: string | undefined;

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'RECAPTCHA_SECRET_KEY' ? secretValue : undefined
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    secretValue = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
  });

  it('passes when no secret key is configured (dev/test)', async () => {
    secretValue = undefined;
    const result = await service.verify(undefined, 'login');
    expect(result).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('rejects a missing token when secret key is configured', async () => {
    secretValue = 'test-secret';
    const result = await service.verify(undefined, 'login');
    expect(result).toBe(false);
  });

  it('accepts a valid token with matching action and good score', async () => {
    secretValue = 'test-secret';
    mockedAxios.post.mockResolvedValue({
      data: { success: true, action: 'login', score: 0.9 },
    });
    const result = await service.verify('valid-token', 'login');
    expect(result).toBe(true);
  });

  it('rejects when Google reports success: false', async () => {
    secretValue = 'test-secret';
    mockedAxios.post.mockResolvedValue({
      data: { success: false, 'error-codes': ['invalid-input-response'] },
    });
    const result = await service.verify('bad-token', 'login');
    expect(result).toBe(false);
  });

  it('rejects when the action does not match', async () => {
    secretValue = 'test-secret';
    mockedAxios.post.mockResolvedValue({
      data: { success: true, action: 'register', score: 0.9 },
    });
    const result = await service.verify('valid-token', 'login');
    expect(result).toBe(false);
  });

  it('rejects when the score is below the threshold', async () => {
    secretValue = 'test-secret';
    mockedAxios.post.mockResolvedValue({
      data: { success: true, action: 'login', score: 0.2 },
    });
    const result = await service.verify('valid-token', 'login');
    expect(result).toBe(false);
  });

  it('fails open when the request to Google throws', async () => {
    secretValue = 'test-secret';
    mockedAxios.post.mockRejectedValue(new Error('network error'));
    const result = await service.verify('valid-token', 'login');
    expect(result).toBe(true);
  });
});
