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
  private readonly REGEN_TIME = 24 * 60 * 1000; // 1 coração a cada 24 min

  constructor(private prisma: PrismaService) {}

  // --- 1. GESTÃO DE STATUS E VIDAS (Sincronização Profissional) ---
  async getUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.hearts < user.maxHearts) {
      const now = new Date();
      const lastUpdate = user.lastHeartUpdate || now;
      const elapsed = now.getTime() - lastUpdate.getTime();
      const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME);

      if (heartsToAdd > 0) {
        const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
        // Calcula o próximo tick de regeneração baseado no tempo que sobrou
        const nextUpdate = new Date(lastUpdate.getTime() + heartsToAdd * this.REGEN_TIME);

        return await this.prisma.user.update({
          where: { id: userId },
          data: {
            hearts: newHearts,
            lastHeartUpdate: newHearts === user.maxHearts ? now : nextUpdate,
          },
        });
      }
    }
    return user;
  }

  // --- 2. NAVEGAÇÃO E TRILHA (Com suporte a AccessType) ---
  async getTrail(language: string) {
    return this.prisma.level.findMany({
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
                access: true, // Importante para o cadeado Premium
              },
            },
          },
        },
      },
    });
  }

  async getLessonDetails(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        activities: { // Atualizado de challenges para activities
          orderBy: { order: 'asc' }
        }
      },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    return lesson;
  }

  // --- 3. CRIAÇÃO DE CONTEÚDO (Suporte a Teoria e 2 Imagens) ---

  async createLevel(data: { title: string; order: number; language: string }) {
    return this.prisma.level.create({ data });
  }

  async createUnit(data: { title: string; order: number; levelId: string }) {
    return this.prisma.unit.create({ data });
  }

  async createLesson(data: {
    title: string;
    order: number;
    unitId: string;
    xpReward: number;
  }) {
    return this.prisma.lesson.create({ data });
  }

  /**
   * Adiciona uma Atividade (Pode ser Teoria ou Desafio)
   * Suporta upload de áudio e múltiplas imagens (para o modo IMAGE_CHECK)
   */
  async addActivity(
    dto: any,
    files?: { audio?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const content = typeof dto.content === 'string' ? JSON.parse(dto.content) : dto.content;

    // 1. Processamento de Áudio
    if (files?.audio && files.audio[0]) {
      const audioPath = `gamification/audio/${Date.now()}_${files.audio[0].originalname}`;
      content.audioUrl = await this.uploadToSupabase(audioPath, files.audio[0]);
    }

    // 2. Processamento de Imagens (Suporte para 1 ou 2 imagens)
    if (files?.images && files.images.length > 0) {
      const uploadedUrls = await Promise.all(
        files.images.map(async (img, idx) => {
          const path = `gamification/visual/${Date.now()}_idx${idx}_${img.originalname}`;
          return await this.uploadToSupabase(path, img);
        })
      );

      if (dto.type === ActivityType.IMAGE_CHECK) {
        // No modo IMAGE_CHECK, a primeira imagem enviada é a Certa, a segunda é a Errada
        content.imageCorrect = uploadedUrls[0];
        content.imageWrong = uploadedUrls[1] || null;
      } else {
        // Para THEORY ou outros tipos, usa apenas a primeira imagem
        content.imageUrl = uploadedUrls[0];
      }
    }

    return this.prisma.activity.create({
      data: {
        type: dto.type,
        order: Number(dto.order),
        question: dto.question,
        content: content,
        lessonId: dto.lessonId,
      },
    });
  }

  private async uploadToSupabase(
    path: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new BadRequestException(`Erro Supabase: ${error.message}`);

    return this.supabase.storage.from(this.bucketName).getPublicUrl(path).data.publicUrl;
  }

  // --- 4. PROCESSAMENTO DE RESULTADOS (Com Transação) ---
  async completeLesson(userId: string, lessonId: string, score: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');

    // Usamos Transação para garantir que XP e Histórico sejam salvos juntos
    return this.prisma.$transaction(async (tx) => {
      await tx.userLesson.create({
        data: { userId, lessonId, score },
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

      return { message: 'Lição concluída, mas score baixo.' };
    });
  }
  async deleteLevel(id: string) {
    return this.prisma.level.delete({ where: { id } });
  }
  async updateLevel(id: string, data: UpdateLevelDto){
    return this.prisma.level.update({ where: { id }, data });
  }
  async deleteLesson(id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }
  async updateLesson(id: string, data: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data });
  }
}
