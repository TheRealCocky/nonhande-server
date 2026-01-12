import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';
import { CreateChallengeDto } from '../dto/create-challenge.dto';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 🗺️ BUSCAR TRILHA COMPLETA (Níveis -> Unidades -> Lições)
   * Essencial para renderizar o mapa de aprendizagem no Next.js
   */
  async getTrail() {
    return this.prisma.level.findMany({
      orderBy: { order: 'asc' },
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                xpReward: true,
                access: true,
              },
            },
          },
        },
      },
    });
  }
  /**
   * 📖 BUSCAR LIÇÃO COM DESAFIOS
   * Carrega os exercícios quando o aluno clica numa lição
   */
  async getLessonDetails(lessonId: string){
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        challenges: true,
      },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada no acervo.');
    return lesson;
  }

  /**
   * 🟡 FINALIZAR LIÇÃO (Usando DTO)
   */
  async completeLesson(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    // Registo de conclusão
    const completion = await this.prisma.userLesson.create({
      data: {
        userId,
        lessonId,
        score,
      },
    });
    // Atualização do perfil do estudante
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: lesson.xpReward },
        lastActive: new Date(),
      },
    });
    return {
      message: 'Progresso guardado com sucesso!',
      xpGained: lesson.xpReward,
      completion,
    };
  }
  /**
   * 🛠️ CRIAR DESAFIO (Usando DTO)
   * Útil para o painel administrativo do Teacher
   */
  async addChallenge(dto: CreateChallengeDto){
    return this.prisma.challenge.create({
      data: {
        type: dto.type,
        question: dto.question,
        content: dto.content as any,
        lessonId: dto.lessonId,
      },
    });
  }
}
