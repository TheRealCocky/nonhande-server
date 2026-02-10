import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';

@Injectable()
export class ProgressionService {
  constructor(private prisma: PrismaService) {}

  // 24 minutos para regenerar 1 coração
  private readonly REGEN_TIME = 24 * 60 * 1000;

  /**
   * ✅ SINCRONIZA CORAÇÕES E STATUS
   * Garante que o usuário receba corações por tempo decorrido e retorna o estado real do DB.
   */
  async getOrSyncStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.hearts >= user.maxHearts) {
      // Se os corações estão cheios, garantimos que o timer está resetado para o futuro
      return user;
    }

    const now = new Date();
    const lastUpdate = user.lastHeartUpdate || now;
    const elapsed = now.getTime() - lastUpdate.getTime();
    const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME);

    if (heartsToAdd > 0) {
      const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          hearts: newHearts,
          // Se encheu, para o timer. Se não, ajusta para o tempo que sobrou do resto da divisão
          lastHeartUpdate: newHearts === user.maxHearts ? null : new Date(lastUpdate.getTime() + (heartsToAdd * this.REGEN_TIME)),
        },
      });
    }
    return user;
  }

  /**
   * ✅ SALVA O PONTO DE CONTROLO
   * Chamado para persistir em qual atividade o aluno parou.
   */
  async saveActivityProgress(userId: string, lessonId: string, activityOrder: number) {
    return this.prisma.userLesson.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: { lastActivityOrder: activityOrder },
      create: {
        userId,
        lessonId,
        lastActivityOrder: activityOrder,
        score: 0,
        completed: false,
      },
    });
  }

  /**
   * ✅ STATUS DO GRID (UNIDADES)
   * Lógica para desbloqueio de unidades no mapa.
   */
  async getUnitGridStatus(userId: string, levelId: string) {
    const units = await this.prisma.unit.findMany({
      where: { levelId },
      orderBy: { order: 'asc' },
      include: { lessons: { select: { id: true } } },
    });

    const userLessons = await this.prisma.userLesson.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    });

    const completedLessonIds = new Set(userLessons.map((l) => l.lessonId));
    let previousUnitCompleted = true;

    return units.map((unit) => {
      const isUnlocked = previousUnitCompleted;
      const isCompleted = unit.lessons.length > 0 &&
        unit.lessons.every((lesson) => completedLessonIds.has(lesson.id));

      previousUnitCompleted = isCompleted;

      return {
        id: unit.id,
        title: unit.title,
        order: unit.order,
        isUnlocked,
        isCompleted,
        totalLessons: unit.lessons.length,
      };
    });
  }

  /**
   * ✅ GESTÃO DE ERROS (PERDA DE VIDA)
   */
  async handleLoss(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.hearts <= 0) throw new BadRequestException('Sem corações!');

    const now = new Date();

    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        hearts: { decrement: 1 },
        // Se ele tinha 5 e agora tem 4, o cronómetro de regeneração TEM de começar AGORA
        lastHeartUpdate: user.hearts === user.maxHearts ? now : user.lastHeartUpdate,
      },
    });
  }

  /**
   * ✅ FINALIZAÇÃO DA LIÇÃO (SOMA DE XP E STREAK)
   */
  async processLessonCompletion(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;

    // 1. Busca os dados da lição (User buscamos depois para garantir frescura)
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lição não encontrada');

    // 2. Trava de Score
    if (score < 60) {
      return { success: false, message: 'Score insuficiente', xpGained: 0 };
    }

    const xpToGain = Math.floor(lesson.xpReward > 0 ? lesson.xpReward : score);

    try {
      // 3. ATUALIZAÇÃO DO UTILIZADOR PRIMEIRO
      // Usamos o retorno direto do update que é o mais confiável no Prisma/Mongo
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: xpToGain },
          lastActive: new Date(),
        },
      });

      // 4. REGISTO DA LIÇÃO (Upsert)
      await this.prisma.userLesson.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: { completed: true, score, completedAt: new Date() },
        create: { userId, lessonId, completed: true, score, lastActivityOrder: 999 },
      });

      // LOG NO TERMINAL DO BACKEND PARA PROVA REAL
      console.log(`[XP_SISTEMA] User: ${userId} | Ganhou: ${xpToGain} | Total no DB: ${updatedUser.xp}`);

      return {
        success: true,
        xpGained: xpToGain,
        newTotalXp: updatedUser.xp, // Este valor TEM de ser > 0 agora
        streak: updatedUser.streak,
      };
    } catch (error) {
      console.error("Erro ao processar conclusão:", error);
      throw error;
    }
  }
}
