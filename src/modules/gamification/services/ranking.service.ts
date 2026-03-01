import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  /**
   * 🏆 LÍDERES GERAIS (Global)
   * Retorna os utilizadores com mais XP na plataforma.
   */
  async getGlobalRanking(limit: number = 10) {
    return this.prisma.user.findMany({
      where: {
        role: 'STUDENT', // Filtramos para não aparecerem ADMINS no ranking
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        xp: true,
        streak: true,
      },
      orderBy: {
        xp: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 🔥 LÍDERES DE STREAK
   * Para incentivar a consistência (quem estuda todos os dias).
   */
  async getStreakRanking(limit: number = 10) {
    return this.prisma.user.findMany({
      where: { streak: { gt: 0 } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        streak: true,
      },
      orderBy: {
        streak: 'desc',
      },
      take: limit,
    });
  }
  /**
   * 🎯 POSIÇÃO DO UTILIZADOR
   * Calcula a posição exata do aluno no ranking global.
   */
  async getUserPosition(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, name: true }
    });

    if (!user) return null;

    // Contamos quantos alunos têm XP estritamente maior que o dele
    const higherXpCount = await this.prisma.user.count({
      where: {
        role: 'STUDENT',
        xp: { gt: user.xp }
      }
    });

    // A posição é o número de pessoas à frente + 1
    const position = higherXpCount + 1;

    // Opcional: Buscar quem está imediatamente acima para "picar" o aluno
    const nextUser = await this.prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        xp: { gt: user.xp }
      },
      orderBy: { xp: 'asc' }, // O mais próximo acima dele
      select: { name: true, xp: true }
    });

    return {
      position,
      currentXp: user.xp,
      nextTarget: nextUser ? {
        name: nextUser.name,
        xpDiff: nextUser.xp - user.xp
      } : null // Se for null, ele é o #1 de Angola!
    };
  }
}