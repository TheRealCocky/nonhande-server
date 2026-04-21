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

    // Mapeamento para o DTO
    return {
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
  async calculateClassGlobalStats(): Promise<ClassGlobalStatsDto> {
    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        lessonProgress: true,
        wordProgress: true,
        ChatHistory: true,
      },
      orderBy: { xp: 'desc' },
      take: 15, // O teu grupo de teste
    });

    // 1. Mapear cada estudante para o formato StudentReportDto
    const topStudents: StudentReportDto[] = students.map((s) => ({
      name: s.name,
      xp: s.xp,
      streak: s.streak,
      successRate: s.lessonProgress.length > 0
        ? (s.lessonProgress.filter(p => p.completed).length / s.lessonProgress.length) * 100
        : 0,
      wordsMastered: s.wordProgress.filter(wp => wp.mastered).length,
      aiInteractions: s.ChatHistory.length,
    }));

    // 2. Calcular Médias Globais (KPIs para a Monografia)
    const totalXp = students.reduce((acc, curr) => acc + curr.xp, 0);
    const averageXp = students.length > 0 ? totalXp / students.length : 0;

    return {
      totalStudents: students.length,
      averageXp: averageXp,
      mostDifficultLesson: 'Lição 3.2 - Verbos Complexos', // Poderias calcular isto dinamicamente
      topStudents: topStudents,
    };
  }
}