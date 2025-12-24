import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { MailerService } from './mailer.service'; // Importar o novo serviço
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as validator from 'email-validator';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService, // Injetado com sucesso
  ) {}

  /**
   * REGISTO (SIGNUP)
   * Agora gera um código e envia por e-mail em vez de logar direto
   */
  async signup(dto: CreateUserDto) {
    // 1. Validação rigorosa do e-mail
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

    // 2. Gerar código de verificação (6 dígitos)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Encriptar senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 4. Criar utilizador (isVerified será false por padrão no Service)
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      verificationCode,
    });

    // 5. Enviar e-mail real
    await this.mailerService.sendVerificationEmail(user.email, verificationCode);

    return {
      message: 'Registo realizado com sucesso! Verifica o código de 6 dígitos no teu e-mail para ativar a conta.'
    };
  }

  /**
   * VERIFICAÇÃO DE E-MAIL (OTP)
   */
  async verifyAccount(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    if (user.isVerified) {
      throw new BadRequestException('Esta conta já está ativa.');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Código de verificação incorreto.');
    }

    // Ativar e limpar o código
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

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Bloquear login se não estiver verificado
    if (!user.isVerified) {
      throw new UnauthorizedException('Por favor, verifique o seu e-mail antes de fazer login.');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Senha incorreta.');
    }

    return this.generateTokenResponse(user);
  }

  /**
   * LOGIN GOOGLE
   */
  async googleLogin(userData: any) {
    // No Google, o e-mail já vem verificado, então podemos marcar isVerified: true
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