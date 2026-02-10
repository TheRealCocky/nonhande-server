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
  /**
   * ✅ FINALIZAÇÃO DA LIÇÃO (XP, STREAK E CORAÇÕES)
   */
  async processLessonCompletion(dto: CompleteLessonDto & { hearts?: number }) {
    const { userId, lessonId, score, hearts } = dto;

    // 1. Buscamos o usuário e a lição (Frescos)
    const [user, lesson] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.lesson.findUnique({ where: { id: lessonId } })
    ]);

    if (!user || !lesson) throw new NotFoundException('Dados não encontrados');

    // Se o score for baixo, retornamos o status atual sem prémio
    if (score < 60) {
      return { success: false, xpGained: 0, newTotalXp: user.xp, hearts: user.hearts };
    }

    // 2. Cálculos: XP e Streak
    const xpToGain = Math.floor(lesson.xpReward > 0 ? lesson.xpReward : score);
    const novoXpTotal = (user.xp || 0) + xpToGain;
    const now = new Date();

    try {
      // 3. UPDATE FORÇADO
      // Atualizamos XP, Streak e sincronizamos os corações finais da lição
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          xp: novoXpTotal,
          // ✅ Sincroniza os corações: se o user perdeu vida na lição, salvamos aqui
          // Usamos Math.min para garantir que ele não ganha corações extra por erro de lógica
          hearts: hearts !== undefined ? Math.min(user.hearts, hearts) : user.hearts,
          lastActive: now,
          streak: { increment: 1 },
          // Se ele terminou com menos corações que o máximo, garantimos que o timer de regen existe
          lastHeartUpdate: (hearts !== undefined && hearts < user.maxHearts && !user.lastHeartUpdate)
            ? now
            : user.lastHeartUpdate
        },
      });

      // 4. MARCAR LIÇÃO COMO CONCLUÍDA (UserLesson)
      await this.prisma.userLesson.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: { completed: true, score, completedAt: now },
        create: { userId, lessonId, completed: true, score, lastActivityOrder: 999 },
      });

      console.log(`[GAME_SINK] User: ${userId} | XP: ${updatedUser.xp} | Hearts: ${updatedUser.hearts}`);

      return {
        success: true,
        xpGained: xpToGain,
        newTotalXp: updatedUser.xp,
        streak: updatedUser.streak,
        hearts: updatedUser.hearts
      };
    } catch (error) {
      console.error("❌ Erro ao finalizar lição no MongoDB:", error);
      throw error;
    }
  }
}
