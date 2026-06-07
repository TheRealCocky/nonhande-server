import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClassGlobalStatsDto, StudentReportDto } from './dto/class-report.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Retorna a performance detalhada de um estudante (Versão otimizada)
   */
  async getStudentPerformance(userId: string): Promise<StudentReportDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Estudante não encontrado');

    // Busca os counts reais de atividade diretamente no log
    const [vocabCount, aiCount] = await Promise.all([
      this.prisma.activityLog.count({ where: { userId, type: 'SEARCH_WORD' } }),
      this.prisma.activityLog.count({ where: { userId, type: 'CHAT_QUERY' } })
    ]);

    return {
      id: user.id,
      name: user.name,
      xp: user.xp || 0,
      streak: user.streak || 0,
      successRate: 0, // Placeholder se não houver progresso na lição individual
      wordsMastered: vocabCount, 
      aiInteractions: aiCount,    
    };
  }

  /**
   * ✅ Retorna as estatísticas globais da turma (Performance Otimizada)
   */
async calculateClassGlobalStats(groupId?: string): Promise<ClassGlobalStatsDto> {
  const where: Prisma.UserWhereInput = { role: Role.STUDENT };
  if (groupId) { where.groupId = groupId; }

  const students = await this.prisma.user.findMany({
    where,
    include: { lessonProgress: true },
  });

  const studentIds = students.map(s => s.id);

  // 🔍 DEBUG TEMPORÁRIO
  const rawCount = await this.prisma.activityLog.count({
    where: { type: 'CHAT_QUERY' }
  });


  const logs = await this.prisma.activityLog.findMany({
    where: {
      userId: { in: studentIds },
      type: { in: ['SEARCH_WORD', 'CHAT_QUERY'] },
    },
    select: {
      userId: true,
      type: true,
    },
  });



  const logMap = new Map<string, { SEARCH_WORD: number; CHAT_QUERY: number }>();

  for (const log of logs) {
    const uid = log.userId.toString();
    if (!logMap.has(uid)) {
      logMap.set(uid, { SEARCH_WORD: 0, CHAT_QUERY: 0 });
    }
    const entry = logMap.get(uid)!;
    if (log.type === 'SEARCH_WORD') entry.SEARCH_WORD++;
    if (log.type === 'CHAT_QUERY') entry.CHAT_QUERY++;
  }

  const getCount = (userId: string, type: 'SEARCH_WORD' | 'CHAT_QUERY'): number => {
    return logMap.get(userId.toString())?.[type] || 0;
  };

  let processedStudents = students.map((s) => {
    const aiCount = getCount(s.id, 'CHAT_QUERY');
    const vocabCount = getCount(s.id, 'SEARCH_WORD');
    const completedLessons = s.lessonProgress?.filter((p) => p.completed).length || 0;
    const totalLessons = s.lessonProgress?.length || 0;

    return {
      id: s.id,
      name: s.name,
      xp: s.xp || 0,
      streak: s.streak || 0,
      successRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
      wordsMastered: vocabCount,
      aiInteractions: aiCount,
      activityScore: aiCount + vocabCount,
    };
  });

  processedStudents.sort((a, b) => b.activityScore - a.activityScore);
  const topStudents = processedStudents.slice(0, 15);

  return {
    totalStudents: students.length,
    averageXp: students.length > 0
      ? students.reduce((acc, curr) => acc + curr.xp, 0) / students.length
      : 0,
    mostDifficultLesson: 'Lição 3.2 - Verbos Complexos',
    topStudents,
  };
}
}