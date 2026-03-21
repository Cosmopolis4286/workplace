import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('AppModule', () => {
  let app: TestingModule;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  it('should have the app module', () => {
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });
});
