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

  // 24 minutos para regenerar 1 coração
  private readonly REGEN_TIME = 24 * 60 * 1000;

  /**
   * ✅ SINCRONIZA CORAÇÕES E STATUS
   * Garante que o usuário receba corações por tempo decorrido e retorna o estado real do DB.
   */
  async getOrSyncStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.hearts >= user.maxHearts) {
      // Se os corações estão cheios, garantimos que o timer está resetado para o futuro
      return user;
    }

    const now = new Date();
    const lastUpdate = user.lastHeartUpdate || now;
    const elapsed = now.getTime() - lastUpdate.getTime();
    const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME);

    if (heartsToAdd > 0) {
      const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          hearts: newHearts,
          // Se encheu, para o timer. Se não, ajusta para o tempo que sobrou do resto da divisão
          lastHeartUpdate: newHearts === user.maxHearts ? null : new Date(lastUpdate.getTime() + (heartsToAdd * this.REGEN_TIME)),
        },
      });
    }
    return user;
  }

  /**
   * ✅ SALVA O PONTO DE CONTROLO
   * Chamado para persistir em qual atividade o aluno parou.
   */
  async saveActivityProgress(userId: string, lessonId: string, activityOrder: number) {
    return this.prisma.userLesson.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: { lastActivityOrder: activityOrder },
      create: {
        userId,
        lessonId,
        lastActivityOrder: activityOrder,
        score: 0,
        completed: false,
      },
    });
  }

  /**
   * ✅ STATUS DO GRID (UNIDADES)
   * Lógica para desbloqueio de unidades no mapa.
   */
  async getUnitGridStatus(userId: string, levelId: string) {
    const units = await this.prisma.unit.findMany({
      where: { levelId },
      orderBy: { order: 'asc' },
      include: { lessons: { select: { id: true } } },
    });

    const userLessons = await this.prisma.userLesson.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    });

    const completedLessonIds = new Set(userLessons.map((l) => l.lessonId));
    let previousUnitCompleted = true;

    return units.map((unit) => {
      const isUnlocked = previousUnitCompleted;
      const isCompleted = unit.lessons.length > 0 &&
        unit.lessons.every((lesson) => completedLessonIds.has(lesson.id));

      previousUnitCompleted = isCompleted;

      return {
        id: unit.id,
        title: unit.title,
        order: unit.order,
        isUnlocked,
        isCompleted,
        totalLessons: unit.lessons.length,
      };
    });
  }

  /**
   * ✅ GESTÃO DE ERROS (PERDA DE VIDA)
   */
  async handleLoss(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.hearts <= 0) throw new BadRequestException('Sem corações!');

    const now = new Date();

    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        hearts: { decrement: 1 },
        // Se ele tinha 5 e agora tem 4, o cronómetro de regeneração TEM de começar AGORA
        lastHeartUpdate: user.hearts === user.maxHearts ? now : user.lastHeartUpdate,
      },
    });
  }

  /**
   * ✅ FINALIZAÇÃO DA LIÇÃO (SOMA DE XP E STREAK)
   */
  async processLessonCompletion(dto: CompleteLessonDto) {
    const { userId, lessonId, score } = dto;

    // 1. Buscamos o usuário e a lição (Frescos)
    const [user, lesson] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.lesson.findUnique({ where: { id: lessonId } })
    ]);

    if (!user || !lesson) throw new NotFoundException('Dados não encontrados');
    if (score < 60) return { success: false, xpGained: 0, newTotalXp: user.xp };

    // 2. Cálculo manual do novo XP
    const xpToGain = Math.floor(lesson.xpReward > 0 ? lesson.xpReward : score);
    const novoXpTotal = (user.xp || 0) + xpToGain;

    try {
      // 3. UPDATE FORÇADO (Grava o valor final, não o incremento)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          xp: novoXpTotal, // Gravamos o número exato (ex: 150)
          lastActive: new Date(),
          streak: { increment: 1 }
        },
      });

      // 4. VERIFICAÇÃO FINAL (Leitura de confirmação)
      const doubleCheck = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, streak: true }
      });

      console.log(`[XP_SISTEMA] User: ${userId} | Ganhou: ${xpToGain} | Confirmado no DB: ${doubleCheck?.xp}`);

      return {
        success: true,
        xpGained: xpToGain,
        newTotalXp: doubleCheck?.xp || 0,
        streak: doubleCheck?.streak || 1,
      };
    } catch (error) {
      console.error("❌ Erro ao gravar no MongoDB:", error);
      throw error;
    }
  }
}
