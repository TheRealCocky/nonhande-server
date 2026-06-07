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

    // 1. Busca todos os estudantes (ou um número maior)
    const students = await this.prisma.user.findMany({
      where,
      include: { lessonProgress: true },
    });

    // 2. Busca logs de TODOS
    const logs = await this.prisma.activityLog.groupBy({
      by: ['userId', 'type'],
      where: { type: { in: ['SEARCH_WORD', 'CHAT_QUERY'] } },
      _count: true,
    });

    // 3. Helper
    const getCount = (userId: string, type: 'SEARCH_WORD' | 'CHAT_QUERY') => {
      return logs.find(l => l.userId === userId && l.type === type)?._count || 0;
    };

    // 4. Mapeia e já calcula o score de atividade
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
        // Adicionamos um score de atividade para ordenar
        activityScore: aiCount + vocabCount 
      };
    });

    // 5. Ordena pelo que você quiser (Ex: Quem mais interage com a IA)
    processedStudents.sort((a, b) => b.activityScore - a.activityScore);

    // 6. Pega apenas os 15 mais ativos agora
    const topStudents = processedStudents.slice(0, 15);

    return {
      totalStudents: students.length,
      averageXp: students.length > 0 ? students.reduce((acc, curr) => acc + curr.xp, 0) / students.length : 0,
      mostDifficultLesson: 'Lição 3.2 - Verbos Complexos',
      topStudents: topStudents,
    };
  }
}