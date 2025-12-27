import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// 1. Definimos uma interface para o que esperamos do usuário no Request
interface UserWithRole {
  role: string;
  email?: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    // 2. Tipamos o Request para que o TS saiba que existe um 'user' do tipo 'UserWithRole'
    const request = context.switchToHttp().getRequest<{ user?: UserWithRole }>();
    const user = request.user;

    // 3. Agora o acesso a 'user.role' é seguro e o ESLint não vai reclamar
    const hasRole = user && requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Acesso negado: Nível de permissão insuficiente.',
      );
    }

    return true;
  }
}