import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
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
  async googleAuthRedirect(@Req() req) {
    // req.user contém os dados validados pelo GoogleStrategy
    return this.authService.googleLogin(req.user);
  }
}