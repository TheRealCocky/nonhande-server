import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { MailerService } from './mailer.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as validator from 'email-validator';
import { Role } from '@prisma/client'; // Importação essencial para o TS

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  /**
   * REGISTO PÚBLICO (SIGNUP)
   */
  async signup(dto: CreateUserDto) {
    if (!validator.validate(dto.email)) {
      throw new BadRequestException('E-mail inválido.');
    }

    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) throw new BadRequestException('E-mail já registado.');

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password!, salt);

    await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      verificationCode,
      role: 'STUDENT',
      isVerified: false,
    });

    await this.mailerService.sendVerificationEmail(dto.email, verificationCode);
    return { message: 'Verifica o teu e-mail para ativar a conta.' };
  }

  /**
   * CRIAÇÃO INTERNA (ADMIN/TEACHER)
   */
  async signupInternal(dto: CreateUserDto) {
    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) throw new BadRequestException('Este e-mail já existe.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password!, salt);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role as Role, // CORREÇÃO DO ERRO TS2322
      isVerified: true,
    });

    return { message: `Usuário ${user.role} criado com sucesso!`, email: user.email };
  }

  /**
   * VERIFICAÇÃO DE E-MAIL
   */
  async verifyAccount(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.verificationCode !== code) {
      throw new BadRequestException('Código inválido.');
    }

    const updatedUser = await this.usersService.update(user.id, {
      isVerified: true,
      verificationCode: null, // O UsersService agora lida com Prisma.UserUpdateInput
    });

    return this.generateTokenResponse(updatedUser);
  }

  /**
   * LOGIN MANUAL
   */
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.password) throw new UnauthorizedException('Credenciais inválidas.');
    if (!user.isVerified) throw new UnauthorizedException('Conta não verificada.');

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Senha incorreta.');

    return this.generateTokenResponse(user);
  }

  /**
   * ESQUECI A PALAVRA-PASSE
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Se este e-mail estiver registado, receberás um link.');
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'password-reset' },
      { expiresIn: '15m' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    await this.mailerService.sendResetPasswordEmail(user.email, resetLink);

    return { message: 'Link de recuperação enviado para o teu e-mail.' };
  }

  /**
   * RESETAR PALAVRA-PASSE
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token) as any;
      if (payload.purpose !== 'password-reset') {
        throw new BadRequestException('Token inválido para esta operação.');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await this.usersService.update(payload.sub, {
        password: hashedPassword,
      });

      return { message: 'A tua palavra-passe foi atualizada com sucesso!' };
    } catch (error) {
      throw new UnauthorizedException('O link de recuperação é inválido ou já expirou.');
    }
  }

  /**
   * LOGIN GOOGLE
   */
  async googleLogin(userData: any) {
    const user = await this.usersService.findOrCreateGoogleUser({
      ...userData,
      isVerified: true,
    });
    return this.generateTokenResponse(user);
  }

  /**
   * GERADOR DE TOKEN JWT
   */
  private generateTokenResponse(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
    };
  }
}