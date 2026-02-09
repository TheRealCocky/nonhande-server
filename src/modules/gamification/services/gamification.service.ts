import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { ActivityType } from '@prisma/client';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';

@Injectable()
export class GamificationService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );
  private readonly bucketName = process.env.SUPABASE_BUCKET as string;

  constructor(private prisma: PrismaService) {}

  // --- 1. NAVEGAÇÃO E TRILHA (Agora com cálculo de bloqueio) ---

  /**
   * Retorna a trilha principal.
   * Modificado para incluir o progresso do usuário e determinar o que está bloqueado.
   */
  async getTrail(language: string, userId?: string) {
    const levels = await this.prisma.level.findMany({
      where: { language: language.toLowerCase() },
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
                // Trazemos o progresso para saber se a lição foi concluída
                userHistory: userId ? { where: { userId } } : false,
              },
            },
          },
        },
      },
    });

    if (!userId) return levels;

    // Lógica de Bloqueio (O que você pediu: Nível 2 só abre se o 1 terminar)
    let previousUnitCompleted = true;

    return levels.map(level => ({
      ...level,
      units: level.units.map(unit => {
        const isUnlocked = previousUnitCompleted;
        // Uma unidade está completa se todas as suas lições estão marcadas como completed
        const isCompleted = unit.lessons.length > 0 &&
          unit.lessons.every(l => l.userHistory && l.userHistory[0]?.completed);

        previousUnitCompleted = isCompleted;

        return {
          ...unit,
          isUnlocked,
          isCompleted,
        };
      })
    }));
  }

  /**
   * Detalhes da lição com "Save State"
   */
  async getLessonDetails(lessonId: string, userId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        activities: { orderBy: { order: 'asc' } },
        // Se o userId for enviado, pegamos onde ele parou (lastActivityOrder)
        userHistory: userId ? { where: { userId } } : false,
      },
    });

    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    return lesson;
  }

  // --- 2. GESTÃO DE CONTEÚDO (MANTIDO E CORRIGIDO) ---

  async addActivity(
    dto: any,
    files?: { audio?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    if (!dto.lessonId || dto.lessonId === 'undefined') {
      throw new BadRequestException('O lessonId é inválido.');
    }

    const content = typeof dto.content === 'string' ? JSON.parse(dto.content) : dto.content;

    // Processamento de arquivos para o Supabase
    if (files?.audio?.[0]) {
      const audioPath = `gamification/audio/${Date.now()}_${files.audio[0].originalname}`;
      content.audioUrl = await this.uploadToSupabase(audioPath, files.audio[0]);
    }

    if (files?.images && files.images.length > 0) {
      const uploadedUrls = await Promise.all(
        files.images.map(async (img, idx) => {
          const path = `gamification/visual/${Date.now()}_idx${idx}_${img.originalname}`;
          return await this.uploadToSupabase(path, img);
        })
      );

      if (dto.type === ActivityType.IMAGE_CHECK) {
        content.imageCorrect = uploadedUrls[0];
        content.imageWrong = uploadedUrls[1] || null;
      } else {
        content.imageUrl = uploadedUrls[0];
      }
    }

    return this.prisma.activity.create({
      data: {
        type: dto.type,
        order: Number(dto.order),
        question: dto.question,
        content: content,
        lessonId: dto.lessonId.trim(),
      },
    });
  }

  // --- 3. PROCESSAMENTO DE RESULTADOS (Sincronizado com o novo UserLesson) ---

  /**
   * Finaliza a lição e desbloqueia o progresso
   */
  async completeLesson(userId: string, lessonId: string, score: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      // Usamos upsert para o caso de já termos um registro de "save state"
      await tx.userLesson.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          completed: true,
          completedAt: new Date(),
          score: score,
          lastActivityOrder: 999 // Representa fim da lição
        },
        create: {
          userId,
          lessonId,
          score,
          completed: true,
          completedAt: new Date(),
          lastActivityOrder: 999
        }
      });

      if (score >= 60) {
        return tx.user.update({
          where: { id: userId },
          data: {
            xp: { increment: lesson.xpReward },
            lastActive: new Date(),
          },
        });
      }

      return { message: 'Lição concluída com score baixo.' };
    });
  }

  // --- MÉTODOS AUXILIARES ---

  private async uploadToSupabase(path: string, file: Express.Multer.File): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new BadRequestException(`Erro Supabase: ${error.message}`);
    return this.supabase.storage.from(this.bucketName).getPublicUrl(path).data.publicUrl;
  }

  async createLevel(data: { title: string; order: number; language: string }) { return this.prisma.level.create({ data }); }
  async createUnit(data: { title: string; order: number; levelId: string }) { return this.prisma.unit.create({ data }); }
  async createLesson(data: { title: string; order: number; unitId: string; xpReward: number; }) { return this.prisma.lesson.create({ data }); }
  async deleteLevel(id: string) { return this.prisma.level.delete({ where: { id } }); }
  async updateLevel(id: string, data: UpdateLevelDto){ return this.prisma.level.update({ where: { id }, data }); }
  async deleteLesson(id: string) { return this.prisma.lesson.delete({ where: { id } }); }
  async updateLesson(id: string, data: UpdateLessonDto) { return this.prisma.lesson.update({ where: { id }, data }); }
}
