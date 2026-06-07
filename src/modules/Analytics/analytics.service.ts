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
    // 1. Busca TUDO o que existe sobre este user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ChatHistory: true, // A lista de conversas
        wordProgress: true, // A lista de palavras
      },
    });

    // LOG DE SEGURANÇA (Verifica o teu terminal/consola do backend)
    console.log("--- DEBUG PARA O USER: " + user?.name + " ---");
    console.log("1. Total de entradas no ChatHistory:", user?.ChatHistory?.length);
    console.log("2. Valor gravado no campo aiInteractions:", user?.aiInteractions);
    console.log("3. Total de palavras em wordProgress:", user?.wordProgress?.length);

    if (!user) throw new NotFoundException('Estudante não encontrado');

    return {
      id: user.id,
      name: user.name,
      xp: user.xp,
      streak: user.streak,
      successRate: 0, 
      // AQUI MUDAMOS PARA USAR O QUE VIER DA BD
      wordsMastered: user.wordProgress?.filter(wp => wp.mastered).length || 0,
      aiInteractions: user.ChatHistory?.length > 0 ? user.ChatHistory.length : (user.aiInteractions || 0),
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
  include: { lessonProgress: true, wordProgress: true, ChatHistory: true },
  orderBy: { xp: 'desc' },
  take: 15,
});

console.log('--- DEBUG DO PRIMEIRO ALUNO ---');
console.log('Nome:', students[0]?.name);
console.log('ChatHistory length:', students[0]?.ChatHistory.length);
console.log('aiInteractions (campo):', students[0]?.aiInteractions);
console.log('WordProgress length:', students[0]?.wordProgress.length);

    const topStudents: StudentReportDto[] = students.map((s) => {
  // Cálculo seguro
  const completedLessons = s.lessonProgress?.filter((p) => p.completed).length || 0;
  const totalLessons = s.lessonProgress?.length || 0;
  
  return {
    id: s.id,
    name: s.name,
    xp: s.xp || 0,
    streak: s.streak || 0,
    successRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
    // Se o ChatHistory estiver vazio, usa o campo aiInteractions do User como fallback
    wordsMastered: s.wordProgress?.filter((wp) => wp.mastered).length || 0,
    aiInteractions: s.ChatHistory?.length > 0 ? s.ChatHistory.length : (s.aiInteractions || 0),
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