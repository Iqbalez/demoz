import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { SuperAdminGuard } from './super-admin.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const privateKey = process.env.JWT_PRIVATE_KEY;
        const publicKey = process.env.JWT_PUBLIC_KEY;

        if (privateKey && publicKey) {
          return {
            privateKey,
            publicKey,
            signOptions: { algorithm: 'RS256' as const },
          };
        }

        // Dev/backwards-compat fallback (HS256). Blueprint requires RS256 for production.
        return {
          secret: process.env.JWT_SECRET || 'SuperSecretKeyChangeInProduction123!',
          signOptions: { algorithm: 'HS256' as const },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService, SuperAdminGuard],
  exports: [AuthService, PassportModule, JwtModule, SuperAdminGuard],
})
export class AuthModule {}
