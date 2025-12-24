import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * REGISTO MANUAL
   * Rota: POST /auth/signup
   * Valida se o email é verdadeiro e a senha tem +6 caracteres
   */
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  /**
   * LOGIN MANUAL
   * Rota: POST /auth/login
   * Usa o LoginDto para validar o formato dos dados antes de autenticar
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * LOGIN VIA GOOGLE (INÍCIO)
   * Rota: GET /auth/google
   * Redireciona o utilizador para a página de consentimento do Google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // O NestJS e o Passport tratam do redirecionamento automaticamente
  }
  @Post('verify')
  async verify(@Body() body: { email: string; code: string }) {
    // Chamamos o serviço passando o email e o código que o utilizador recebeu
    return this.authService.verifyAccount(body.email, body.code);
  }
  /**
   * GOOGLE CALLBACK (RETORNO)
   * Rota: GET /auth/google/callback
   * O Google envia os dados do utilizador para aqui após a autorização
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    // req.user contém os dados validados pela GoogleStrategy
    return this.authService.googleLogin(req.user);
  }
}