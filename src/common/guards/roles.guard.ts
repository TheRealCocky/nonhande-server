import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Pega os roles definidos no decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Se a rota não tiver @Roles(), permite o acesso
    if (!requiredRoles) {
      return true;
    }

    // 3. Pega o usuário que o JwtStrategy colocou na requisição
    const { user } = context.switchToHttp().getRequest();

    // 4. Valida se o usuário existe e se o role dele está na lista permitida
    const hasRole = user && requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException('Acesso negado: Nível de permissão insuficiente.');
    }

    return true;
  }
}