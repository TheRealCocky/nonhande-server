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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  /**
   * REGISTO (SIGNUP)
   */
  async signup(dto: CreateUserDto) {
    if (!validator.validate(dto.email)) {
      throw new BadRequestException('Por favor, insira um e-mail real e válido.');
    }

    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) {
      throw new BadRequestException('Este e-mail já está registado no Nonhande.');
    }

    if (!dto.password) {
      throw new BadRequestException('A senha é obrigatória.');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      verificationCode,
    });

    await this.mailerService.sendVerificationEmail(user.email, verificationCode);

    return {
      message: 'Registo realizado com sucesso! Verifica o código no teu e-mail.'
    };
  }

  /**
   * VERIFICAÇÃO DE E-MAIL (OTP)
   */
  async verifyAccount(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Utilizador não encontrado.');
    if (user.isVerified) throw new BadRequestException('Esta conta já está ativa.');
    if (user.verificationCode !== code) throw new BadRequestException('Código incorreto.');

    const updatedUser = await this.usersService.update(user.id, {
      isVerified: true,
      verificationCode: null,
    });

    return this.generateTokenResponse(updatedUser);
  }

  /**
   * LOGIN MANUAL
   */
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.password) throw new UnauthorizedException('Credenciais inválidas.');
    if (!user.isVerified) throw new UnauthorizedException('Por favor, verifique o seu e-mail.');

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Senha incorreta.');

    return this.generateTokenResponse(user);
  }

  /**
   * ESQUECI A PALAVRA-PASSE (Solicitação)
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Por segurança, não confirmamos se o e-mail existe ou não para evitar "email harvesting"
    // Mas no teu caso (MVP), podemos lançar erro se preferires
    if (!user) {
      throw new BadRequestException('Se este e-mail estiver registado, receberás um link de recuperação.');
    }

    // Gerar token JWT de recuperação (expira em 15 minutos)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'password-reset' },
      { expiresIn: '15m' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    // Chamada ao teu MailerService (precisas de criar este método lá)
    await this.mailerService.sendResetPasswordEmail(user.email, resetLink);

    return { message: 'Link de recuperação enviado para o teu e-mail.' };
  }

  /**
   * RESETAR PALAVRA-PASSE (Aplicação)
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      // 1. Validar o token
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'password-reset') {
        throw new BadRequestException('Token inválido para esta operação.');
      }

      // 2. Encriptar a nova senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 3. Atualizar na base de dados
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