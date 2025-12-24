import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'angoia_secret_2025',
    });
  }

  async validate(payload: any) {
    // O payload é o que está encriptado no Token JWT
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado ou token inválido.');
    }

    // Retornamos o objeto que o RolesGuard vai inspecionar
    return {
      id: user.id,
      email: user.email,
      role: user.role, // ESSENCIAL para o @Roles('ADMIN') funcionar
      name: user.name
    };
  }
}