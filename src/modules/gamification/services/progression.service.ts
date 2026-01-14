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

  private readonly REGEN_TIME_PER_HEART = 24 * 60 * 1000;

  async processLessonCompletion(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;
    const user = await this.computeAndGetUpdatedUser(userId);

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');

    if (score < 60) {
      const updatedUser = await this.loseHeart(userId);
      return {
        success: false,
        message: 'Pontuação insuficiente. Perdeste um coração!',
        heartsRemaining: updatedUser.hearts,
        xpGained: 0
      };
    }

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

  async computeAndGetUpdatedUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.hearts < user.maxHearts) {
      const now = new Date();
      // ✅ CORREÇÃO: Fallback para 'now' se for null
      const lastUpdate = user.lastHeartUpdate || now;
      const elapsed = now.getTime() - lastUpdate.getTime();
      const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME_PER_HEART);

      if (heartsToAdd > 0) {
        const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
        const nextUpdate = new Date(lastUpdate.getTime() + (heartsToAdd * this.REGEN_TIME_PER_HEART));

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
        lastHeartUpdate: user.hearts === user.maxHearts ? new Date() : undefined
      }
    });
  }

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

  async getFullStatus(userId: string) {
    const user = await this.computeAndGetUpdatedUser(userId);
    const now = new Date();
    // ✅ CORREÇÃO: Fallback para 'now' se for null
    const lastUpdate = user.lastHeartUpdate || now;
    const elapsed = now.getTime() - lastUpdate.getTime();

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