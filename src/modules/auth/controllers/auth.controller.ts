import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req, Res,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * REGISTO DE UTILIZADOR PÚBLICO
   */
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  /**
   * 🛡️ CRIAÇÃO INTERNA SEGURA (ADMIN / TEACHER)
   * Apenas acessível via Postman com a chave secreta no Header
   */
  @Post('create-internal-user')
  async createInternal(
    @Body() createUserDto: CreateUserDto,
    @Headers('x-admin-secret') adminSecret: string,
  ) {
    const secret = process.env.ADMIN_CREATION_SECRET;

    // --- CÓDIGO DE TESTE TEMPORÁRIO ---
    if (!adminSecret || adminSecret !== secret) {
      throw new UnauthorizedException({
        message: 'Chave inválida',
        enviadoPeloPostman: adminSecret || 'nada',
        armazenadoNoServidor: secret || 'ESTÁ VAZIO NO RENDER'
      });
    }
    // ----------------------------------

    return this.authService.signupInternal(createUserDto);
  }

  /**
   * LOGIN DE UTILIZADOR
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * VERIFICAÇÃO DE CONTA (CÓDIGO OTP)
   */
  @Post('verify-code')
  async verify(@Body() body: { email: string; code: string }) {
    return this.authService.verifyAccount(body.email, body.code);
  }

  /**
   * SOLICITAR RECUPERAÇÃO DE PALAVRA-PASSE
   */
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  /**
   * REDEFINIR PALAVRA-PASSE
   */
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  /**
   * AUTENTICAÇÃO GOOGLE
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Redirecionamento automático para o Google
  }

  /**
   * CALLBACK DO GOOGLE
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const googleUser = req.user;
    const authData = await this.authService.googleLogin(googleUser);
    const token = authData.accessToken;

    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
}