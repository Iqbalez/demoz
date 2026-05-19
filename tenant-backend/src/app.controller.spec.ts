import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AuthService } from './auth/auth.service';

describe('AppController', () => {
  let appController: AppController;

  const mockAuthService = {
    generateToken: jest.fn().mockResolvedValue('mocked_token'),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Welcome to the dashboard!"', () => {
      expect(appController.getDashboard()).toBe('Welcome to the dashboard!');
    });
  });
});
