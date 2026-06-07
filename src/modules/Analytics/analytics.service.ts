import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClassGlobalStatsDto, StudentReportDto } from './dto/class-report.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Retorna a performance detalhada de um estudante específico
   * Tipado com StudentReportDto
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
      wordsMastered: user.wordProgress.filter(wp => wp.mastered).length,
      aiInteractions: user.ChatHistory.length,
    };
  }

  /**
   * ✅ Retorna as estatísticas globais da turma de 15 alunos
   * Tipado com ClassGlobalStatsDto
   */
 /**
   * ✅ Retorna as estatísticas, com filtro opcional de Grupo
   */
  async calculateClassGlobalStats(groupId?: string): Promise<ClassGlobalStatsDto> {
    // 1. Montar a query dinâmica
    const whereClause: any = { role: 'STUDENT' };
    if (groupId) {
      whereClause.groupId = groupId; // Apenas alunos deste grupo
    }

    const students = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        lessonProgress: true,
        wordProgress: true,
        ChatHistory: true,
      },
      orderBy: { xp: 'desc' },
      take: 15, 
    });

    // 2. Mapeamento dos estudantes (mantém a lógica anterior)
    const topStudents: StudentReportDto[] = students.map((s) => ({
      id: s.id,
      name: s.name,
      xp: s.xp,
      streak: s.streak,
      successRate: s.lessonProgress.length > 0
        ? (s.lessonProgress.filter(p => p.completed).length / s.lessonProgress.length) * 100
        : 0,
      wordsMastered: s.wordProgress.filter(wp => wp.mastered).length,
      aiInteractions: s.ChatHistory.length,
    }));

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