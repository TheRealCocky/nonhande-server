import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';

@Injectable()
export class ProgressionService {
  constructor(private prisma: PrismaService) {}

  private readonly REGEN_TIME_PER_HEART = 24 * 60 * 1000; // 24 minutos = 1 coração

  /**
   * 🏆 PROCESSAR CONCLUSÃO DE LIÇÃO
   */
  async processLessonCompletion(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;

    // 1. Recalcula corações por tempo antes de validar o resultado
    const user = await this.computeAndGetUpdatedUser(userId);

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');

    // 2. Lógica de Erro (Score < 60%)
    if (score < 60) {
      const updatedUser = await this.loseHeart(userId); // Chamada interna corrigida
      return {
        success: false,
        message: 'Pontuação insuficiente. Perdeste um coração!',
        heartsRemaining: updatedUser.hearts,
        xpGained: 0
      };
    }

    // 3. Lógica de Sucesso (Score >= 60%)
    const finalUser = await this.updateUserStats(user, lesson.xpReward);

    await this.prisma.userLesson.create({
      data: { userId, lessonId, score }
    });

    return {
      success: true,
      message: 'Lição concluída!',
      xpGained: lesson.xpReward,
      currentXp: finalUser.xp,
      currentStreak: finalUser.streak,
      hearts: finalUser.hearts
    };
  }

  /**
   * 💓 RECALCULAR E OBTER USUÁRIO (O motor de regeneração)
   */
  async computeAndGetUpdatedUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.hearts < user.maxHearts) {
      const now = new Date();
      const elapsed = now.getTime() - user.lastHeartUpdate.getTime();
      const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME_PER_HEART);

      if (heartsToAdd > 0) {
        const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
        const nextUpdate = new Date(user.lastHeartUpdate.getTime() + (heartsToAdd * this.REGEN_TIME_PER_HEART));

        return await this.prisma.user.update({
          where: { id: userId },
          data: {
            hearts: newHearts,
            lastHeartUpdate: newHearts === user.maxHearts ? now : nextUpdate
          }
        });
      }
    }
    return user;
  }

  /**
   * 💔 PERDA DE VIDA (Tornado PUBLIC para o Controller usar)
   */
  public async loseHeart(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.hearts <= 0) {
      throw new BadRequestException('Estás sem corações! Aguarda a regeneração.');
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        hearts: { decrement: 1 },
        // Se ele tinha o máximo de vidas, a contagem de tempo para recuperar começa agora
        lastHeartUpdate: user.hearts === user.maxHearts ? new Date() : undefined
      }
    });
  }

  /**
   * 🔥 XP E OFENSIVA (STREAK)
   */
  private async updateUserStats(user: any, xpReward: number) {
    const now = new Date();
    let newStreak = user.streak;

    if (!user.lastStreakUpdate) {
      newStreak = 1;
    } else {
      const lastUpdate = new Date(user.lastStreakUpdate);
      const diffInHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      if (diffInHours >= 24 && diffInHours <= 48) {
        newStreak += 1;
      } else if (diffInHours > 48) {
        newStreak = 1;
      }
    }

    return await this.prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: xpReward },
        streak: newStreak,
        lastStreakUpdate: now,
        lastActive: now
      }
    });
  }

  /**
   * 🔍 STATUS PARA O FRONTEND (Timer do Coração)
   */
  async getFullStatus(userId: string) {
    const user = await this.computeAndGetUpdatedUser(userId);
    const now = new Date();
    const elapsed = now.getTime() - user.lastHeartUpdate.getTime();

    let nextHeartIn = 0;
    if (user.hearts < user.maxHearts) {
      nextHeartIn = Math.floor((this.REGEN_TIME_PER_HEART - (elapsed % this.REGEN_TIME_PER_HEART)) / 1000);
    }

    return {
      hearts: user.hearts,
      maxHearts: user.maxHearts,
      xp: user.xp,
      streak: user.streak,
      nextHeartInSeconds: nextHeartIn
    };
  }
}