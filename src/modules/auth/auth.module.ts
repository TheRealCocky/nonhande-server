import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { MailerService } from './services/mailer.service'; // Novo import
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'angoia_secret_2025',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MailerService, // Adicionado aqui para o AuthService poder usá-lo
    GoogleStrategy,
    JwtStrategy
  ],
  exports: [AuthService], // Exportamos caso outros módulos precisem
})
export class AuthModule {}