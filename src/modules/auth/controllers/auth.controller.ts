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
   */
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
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
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  /**
   * REDEFINIR PALAVRA-PASSE
   * POST /auth/reset-password
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
    // Redirecionamento automático
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