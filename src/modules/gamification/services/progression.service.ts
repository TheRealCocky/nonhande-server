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

  private readonly REGEN_TIME = 24 * 60 * 1000; // 24 minutos

  async getOrSyncStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.hearts < user.maxHearts) {
      const now = new Date();
      const lastUpdate = user.lastHeartUpdate || now;
      const elapsed = now.getTime() - lastUpdate.getTime();
      const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME);

      if (heartsToAdd > 0) {
        const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
        const nextUpdate = new Date(lastUpdate.getTime() + heartsToAdd * this.REGEN_TIME);

        return await this.prisma.user.update({
          where: { id: userId },
          data: {
            hearts: newHearts,
            lastHeartUpdate: newHearts === user.maxHearts ? now : nextUpdate,
          },
        });
      }
    }
    return user;
  }

  /**
   * ✅ SALVA O ESTADO ATUAL (AVANÇAR/RECUAR)
   * Chamado a cada atividade concluída para garantir que o aluno não perca o progresso se sair.
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
   * ✅ OBTÉM O ESTADO DO GRID PARA UM NÍVEL (LEVEL)
   * Calcula quais Unidades estão bloqueadas ou completas.
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
    let previousUnitCompleted = true; // Primeira unidade está sempre aberta

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

  async handleLoss(userId: string) {
    const user = await this.getOrSyncStatus(userId);
    if (user.hearts <= 0) throw new BadRequestException('Sem corações!');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        hearts: { decrement: 1 },
        lastHeartUpdate: user.hearts === user.maxHearts ? new Date() : undefined,
      },
    });
  }

  async processLessonCompletion(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;
    const user = await this.getOrSyncStatus(userId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });

    if (!lesson) throw new NotFoundException('Lição não encontrada');

    if (score < 60) {
      return { success: false, message: 'Score insuficiente para XP.' };
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      let newStreak = user.streak;

      if (!user.lastStreakUpdate) {
        newStreak = 1;
      } else {
        const diffHours = (now.getTime() - user.lastStreakUpdate.getTime()) / (1000 * 3600);
        if (diffHours >= 24 && diffHours <= 48) newStreak += 1;
        else if (diffHours > 48) newStreak = 1;
      }

      // ✅ UPSERT: Se o registro de progresso (save state) já existia, atualiza para completo.
      await tx.userLesson.upsert({
        where: {
          userId_lessonId: { userId, lessonId },
        },
        update: {
          completed: true,
          completedAt: now,
          score: score,
        },
        create: {
          userId,
          lessonId,
          completed: true,
          completedAt: now,
          score: score,
          lastActivityOrder: 999, // Indica que passou por todas
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: lesson.xpReward },
          streak: newStreak,
          lastStreakUpdate: now,
          lastActive: now,
        },
      });

      return {
        success: true,
        xpGained: lesson.xpReward,
        newTotalXp: updatedUser.xp,
        streak: updatedUser.streak,
      };
    });
  }
}
