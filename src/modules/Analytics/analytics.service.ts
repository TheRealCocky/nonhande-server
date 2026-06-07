import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClassGlobalStatsDto, StudentReportDto } from './dto/class-report.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Retorna a performance detalhada de um estudante específico
   */
  async getStudentPerformance(userId: string): Promise<StudentReportDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        lessonProgress: true,
        ChatHistory: true,
        wordProgress: true,
      },
    });

    if (!user) throw new NotFoundException('Estudante não encontrado');

    const totalAttempted = user.lessonProgress.length;
    const totalCompleted = user.lessonProgress.filter((lp) => lp.completed).length;

    return {
      id: user.id,
      name: user.name,
      xp: user.xp,
      streak: user.streak,
      successRate: totalAttempted > 0 ? (totalCompleted / totalAttempted) * 100 : 0,
      wordsMastered: user.wordProgress.filter((wp) => wp.mastered).length,
      aiInteractions: user.ChatHistory.length,
    };
  }

  /**
   * ✅ Retorna as estatísticas globais da turma, com filtro opcional de Grupo
   */
  async calculateClassGlobalStats(groupId?: string): Promise<ClassGlobalStatsDto> {
    // Definindo o filtro com o tipo correto do Prisma
    const where: Prisma.UserWhereInput = { role: Role.STUDENT };
    
    if (groupId) {
      where.groupId = groupId;
    }

    const students = await this.prisma.user.findMany({
      where,
      include: {
        lessonProgress: true,
        wordProgress: true,
        ChatHistory: true,
      },
      orderBy: { xp: 'desc' },
      take: 15,
    });

    const topStudents: StudentReportDto[] = students.map((s) => {
      const completedLessons = s.lessonProgress.filter((p) => p.completed).length;
      const successRate = s.lessonProgress.length > 0 
        ? (completedLessons / s.lessonProgress.length) * 100 
        : 0;

      return {
        id: s.id,
        name: s.name,
        xp: s.xp,
        streak: s.streak,
        successRate: successRate,
        wordsMastered: s.wordProgress.filter((wp) => wp.mastered).length,
        aiInteractions: s.ChatHistory.length,
      };
    });

    const totalXp = students.reduce((acc, curr) => acc + curr.xp, 0);
    const averageXp = students.length > 0 ? totalXp / students.length : 0;

    return {
      totalStudents: students.length,
      averageXp: averageXp,
      mostDifficultLesson: 'Lição 3.2 - Verbos Complexos',
      topStudents: topStudents,
    };
  }
}