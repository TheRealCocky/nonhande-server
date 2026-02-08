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

  async handleLoss(userId: string) {
    const user = await this.getOrSyncStatus(userId);
    if (user.hearts <= 0) throw new BadRequestException('Sem corações!');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        hearts: { decrement: 1 },
        lastHeartUpdate: user.hearts === user.maxHearts ? new Date() : undefined
      },
    });
  }

  /**
   * ✅ PROCESSA CONCLUSÃO DE LIÇÃO
   * Gere XP, Streak e regista o histórico.
   */
  async processLessonCompletion(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;
    const user = await this.getOrSyncStatus(userId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });

    if (!lesson) throw new NotFoundException('Lição não encontrada');

    // Se o score for baixo, o aluno não ganha recompensas (pode perder vida via frontend/mistake)
    if (score < 60) {
      return { success: false, message: 'Score insuficiente para XP.' };
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Calcular nova Streak
      const now = new Date();
      let newStreak = user.streak;

      if (!user.lastStreakUpdate) {
        newStreak = 1;
      } else {
        const diffHours = (now.getTime() - user.lastStreakUpdate.getTime()) / (1000 * 3600);
        if (diffHours >= 24 && diffHours <= 48) newStreak += 1;
        else if (diffHours > 48) newStreak = 1;
      }

      // 2. Registar lição concluída
      await tx.userLesson.create({
        data: { userId, lessonId, score }
      });

      // 3. Atualizar utilizador
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: lesson.xpReward },
          streak: newStreak,
          lastStreakUpdate: now,
          lastActive: now
        }
      });

      return {
        success: true,
        xpGained: lesson.xpReward,
        newTotalXp: updatedUser.xp,
        streak: updatedUser.streak
      };
    });
  }
}
