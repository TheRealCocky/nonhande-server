import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req, Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * REGISTO DE UTILIZADOR
   * POST /auth/signup
   */
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  /**
   * LOGIN DE UTILIZADOR
   * POST /auth/login
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * VERIFICAÇÃO DE CONTA (CÓDIGO OTP)
   * POST /auth/verify-code
   * Este endpoint recebe o e-mail e o código de 6 dígitos enviado.
   */
  @Post('verify-code')
  async verify(@Body() body: { email: string; code: string }) {
    // Chama o método verifyAccount que existe no teu AuthService
    return this.authService.verifyAccount(body.email, body.code);
  }

  /**
   * AUTENTICAÇÃO GOOGLE
   * GET /auth/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // O Passport trata do redirecionamento para o Google
  }

  /**
   * CALLBACK DO GOOGLE
   * GET /auth/google/callback
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      // 1. O utilizador validado pelo Google está aqui
      const user = req.user;

      if (!user) {
        return res.redirect('https://nonhande.vercel.app/login?error=auth_failed');
      }

      // 2. Definir para onde enviar o utilizador (Vercel ou Localhost)
      // O NestJS deteta o ambiente pela variável NODE_ENV
      const frontendUrl = process.env.NODE_ENV === 'production'
        ? 'https://nonhande.vercel.app'
        : 'http://localhost:3000';

      // 3. Por agora, vamos apenas redirecionar com um parâmetro de sucesso
      // No futuro, aqui enviarás o Token JWT: `${frontendUrl}?token=${token}`
      console.log(`✅ Google Login Sucesso: ${user.email}`);

      return res.redirect(`${frontendUrl}/?login=success`);

    } catch (error) {
      console.error('❌ Erro no redirecionamento Google:', error);
      return res.redirect('https://nonhande.vercel.app/login?error=server_error');
    }
  }
}