import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClassGlobalStatsDto, StudentReportDto } from './dto/class-report.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Retorna a performance detalhada de um estudante (Versão com ActivityLog)
   */
  async getStudentPerformance(userId: string): Promise<StudentReportDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Estudante não encontrado');

    // Busca os counts reais de atividade
    const [vocabCount, aiCount] = await Promise.all([
      this.prisma.activityLog.count({ where: { userId, type: 'SEARCH_WORD' } }),
      this.prisma.activityLog.count({ where: { userId, type: 'CHAT_QUERY' } })
    ]);

    return {
      id: user.id,
      name: user.name,
      xp: user.xp || 0,
      streak: user.streak || 0,
      successRate: 0, 
      wordsMastered: vocabCount, 
      aiInteractions: aiCount,    
    };
  }

  /**
   * ✅ Retorna as estatísticas globais da turma (Versão com ActivityLog)
   */
 async calculateClassGlobalStats(groupId?: string): Promise<ClassGlobalStatsDto> {
  const where: Prisma.UserWhereInput = { role: Role.STUDENT };
  if (groupId) { where.groupId = groupId; }

  const students = await this.prisma.user.findMany({
    where,
    include: { lessonProgress: true },
    orderBy: { xp: 'desc' },
    take: 15,
  });

  const studentIds = students.map(s => s.id);

  // Consulta ÚNICA para buscar todas as contagens de todos os alunos de uma vez
  const logs = await this.prisma.activityLog.groupBy({
    by: ['userId', 'type'],
    where: { userId: { in: studentIds } },
    _count: true,
  });

  // Mapeia os logs para acesso rápido (hash map)
  const getCount = (userId: string, type: 'SEARCH_WORD' | 'CHAT_QUERY') => {
    return logs.find(l => l.userId === userId && l.type === type)?._count || 0;
  };

  const topStudents: StudentReportDto[] = students.map((s) => {
    const completedLessons = s.lessonProgress?.filter((p) => p.completed).length || 0;
    const totalLessons = s.lessonProgress?.length || 0;

    return {
      id: s.id,
      name: s.name,
      xp: s.xp || 0,
      streak: s.streak || 0,
      successRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
      wordsMastered: getCount(s.id, 'SEARCH_WORD'),
      aiInteractions: getCount(s.id, 'CHAT_QUERY'),
    };
  });

  return {
    totalStudents: students.length,
    averageXp: students.length > 0 ? students.reduce((acc, curr) => acc + curr.xp, 0) / students.length : 0,
    mostDifficultLesson: 'Lição 3.2 - Verbos Complexos',
    topStudents: topStudents,
  };
}
}