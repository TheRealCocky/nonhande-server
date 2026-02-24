import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaywallGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPaywallCheckRequired = this.reflector.get<boolean>('check_paywall', context.getHandler());
    if (!isPaywallCheckRequired) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Injetado pelo JwtAuthGuard

    // 1. ISENÇÃO MESTRE: Admin e Teacher não pagam imposto no reino
    if (user.role === 'ADMIN' || user.role === 'TEACHER') return true;

    // 2. Se for Estudante, vamos checar o alvo (Lesson ou Level)
    const lessonId = request.params.id;

    if (lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { unit: { include: { level: true } } }
      });

      if (!lesson) return true;

      // REGRA: Se o Nível for >= 3 OU a lição for marcada como PREMIUM
      const isAdvancedLevel = lesson.unit.level.order >= 3;
      const isPremiumLesson = lesson.access === 'PREMIUM';

      if (isAdvancedLevel || isPremiumLesson) {
        // Se o estudante for FREE, barramos
        if (user.accessLevel === 'FREE') {
          throw new ForbiddenException({
            message: 'PAYWALL_REQUIRED',
            level: lesson.unit.level.order,
            error: 'Este conteúdo exige subscrição Premium.'
          });
        }
      }
    }

    return true;
  }
}
