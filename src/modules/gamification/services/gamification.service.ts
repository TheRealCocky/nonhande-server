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

  // --- MÉTODOS DE NAVEGAÇÃO ---

  async getTrail(language: string, userId?: string) {
    const trail = await this.prisma.level.findMany({
      where: {
        // Filtro por linguagem (ex: nhaneca)
        language: { equals: language, mode: 'insensitive' }
      },
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                activities: { select: { id: true } },
                // ✨ A PEÇA QUE FALTAVA: Injetar o histórico do utilizador logado
                userHistory: userId ? {
                  where: { userId: userId },
                  select: {
                    completed: true,
                    score: true,
                    lastActivityOrder: true
                  }
                } : false,
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' },
    });

    if (!trail || trail.length === 0) {
      console.warn(`Nenhuma trail encontrada para a língua: ${language}`);
    }

    // Agora o retorno já leva o progresso, permitindo que o StudentMap
    // destranque as lições e unidades corretamente.
    return trail;
  }

  async getLessonDetails(lessonId: string, userId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        activities: { orderBy: { order: 'asc' } },
        userHistory: userId ? { where: { userId } } : false,
      },
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    return lesson;
  }

  private async getLanguageByLesson(lessonId: string): Promise<string> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { unit: { include: { level: true } } }
    });
    return lesson?.unit?.level?.language?.toLowerCase() || 'general';
  }

  // --- GESTÃO DE CONTEÚDO ---

  async addActivity(
    dto: any,
    files?: { audio?: Express.Multer.File[]; distractors?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    if (!dto.lessonId || dto.lessonId === 'undefined') throw new BadRequestException('O lessonId é inválido.');

    const lang = await this.getLanguageByLesson(dto.lessonId);
    const content = typeof dto.content === 'string' ? JSON.parse(dto.content) : dto.content;

    const metadata = dto.metadata
      ? (typeof dto.metadata === 'string' ? JSON.parse(dto.metadata) : dto.metadata)
      : null;

    this.validateActivityContent(dto.type, dto.question, content);

    if (files?.audio?.[0]) {
      const audioPath = `Nonhande_dataset/${lang}/gamification/audio/${Date.now()}_main_${files.audio[0].originalname}`;
      content.audioUrl = await this.uploadToSupabase(audioPath, files.audio[0]);
    }

    if (files?.distractors && files.distractors.length > 0) {
      content.audioOptions = await Promise.all(
        files.distractors.map(async (file, idx) => {
          const path = `Nonhande_dataset/${lang}/gamification/audio/${Date.now()}_dist_${idx}_${file.originalname}`;
          return await this.uploadToSupabase(path, file);
        })
      );
    }

    if (files?.images && files.images.length > 0) {
      const uploadedUrls = await Promise.all(
        files.images.map(async (img, idx) => {
          const path = `Nonhande_dataset/${lang}/gamification/visual/${Date.now()}_idx${idx}_${img.originalname}`;
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
        metadata: metadata,
        lessonId: dto.lessonId.trim(),
      },
    });
  }

  async updateActivity(
    id: string,
    dto: any,
    files?: { audio?: Express.Multer.File[]; distractors?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const existingActivity = await this.prisma.activity.findUnique({
      where: { id },
      include: { lesson: true }
    });
    if (!existingActivity) throw new NotFoundException('Atividade não encontrada.');

    const lang = await this.getLanguageByLesson(existingActivity.lessonId);
    const newContent = typeof dto.content === 'string' ? JSON.parse(dto.content) : dto.content;
    const oldContent = existingActivity.content as any;
    const newMetadata = dto.metadata
      ? (typeof dto.metadata === 'string' ? JSON.parse(dto.metadata) : dto.metadata)
      : undefined;

    this.validateActivityContent(dto.type, dto.question, newContent);

    newContent.audioUrl = oldContent?.audioUrl;
    newContent.audioOptions = oldContent?.audioOptions || [];
    newContent.imageCorrect = oldContent?.imageCorrect;
    newContent.imageWrong = oldContent?.imageWrong;
    newContent.imageUrl = oldContent?.imageUrl;

    if (files?.audio?.[0]) {
      const audioPath = `Nonhande_dataset/${lang}/gamification/audio/${Date.now()}_main_${files.audio[0].originalname}`;
      newContent.audioUrl = await this.uploadToSupabase(audioPath, files.audio[0]);
    }

    if (files?.distractors && files.distractors.length > 0) {
      const newAudios = await Promise.all(
        files.distractors.map(async (file, idx) => {
          const path = `Nonhande_dataset/${lang}/gamification/audio/${Date.now()}_dist_${idx}_${file.originalname}`;
          return await this.uploadToSupabase(path, file);
        })
      );
      newContent.audioOptions = [...newContent.audioOptions, ...newAudios];
    }

    return this.prisma.activity.update({
      where: { id },
      data: {
        type: dto.type,
        order: dto.order ? Number(dto.order) : undefined,
        question: dto.question,
        content: newContent,
        metadata: newMetadata,
      },
    });
  }

  private validateActivityContent(type: string, question: string, content: any) {
    if (type === 'FILL_BLANK' && !question.includes('_')) {
      throw new BadRequestException('Para COMPLETAR (Fill Blank), o enunciado deve conter um "_" (underline).');
    }
    if (type === 'PAIRS' && (!content.pairs || !Array.isArray(content.pairs))) {
      throw new BadRequestException('Para CORRESPONDÊNCIA (Pairs), forneça a lista de pares.');
    }
  }

  async deleteActivity(id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    return this.prisma.activity.delete({ where: { id } });
  }

  // --- ÚNICA IMPLEMENTAÇÃO DO UPLOAD ---
  private async uploadToSupabase(path: string, file: Express.Multer.File): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new BadRequestException(`Erro Supabase: ${error.message}`);
    return this.supabase.storage.from(this.bucketName).getPublicUrl(path).data.publicUrl;
  }

  // --- OUTROS MÉTODOS CRUD ---
  async createLevel(data: { title: string; order: number; language: string }) { return this.prisma.level.create({ data }); }
  async createUnit(data: { title: string; order: number; levelId: string }) { return this.prisma.unit.create({ data }); }
  async createLesson(data: { title: string; order: number; unitId: string; xpReward: number; }) { return this.prisma.lesson.create({ data }); }

  async deleteLevel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Encontrar todas as unidades deste nível
      const units = await tx.unit.findMany({
        where: { levelId: id },
        select: { id: true }
      });
      const unitIds = units.map(u => u.id);

      // 2. Encontrar todas as lições dessas unidades
      const lessons = await tx.lesson.findMany({
        where: { unitId: { in: unitIds } },
        select: { id: true }
      });
      const lessonIds = lessons.map(l => l.id);

      // 3. LIMPEZA DE PROGRESSO: Apagar registos de UserLesson
      // Esta é a parte que causava o erro P2014 no Prisma
      await tx.userLesson.deleteMany({
        where: { lessonId: { in: lessonIds } }
      });

      // 4. Apagar as atividades (Activities) vinculadas às lições
      await tx.activity.deleteMany({
        where: { lessonId: { in: lessonIds } }
      });

      // 5. Apagar Lições em cascata
      await tx.lesson.deleteMany({
        where: { id: { in: lessonIds } }
      });

      // 6. Apagar Unidades
      await tx.unit.deleteMany({
        where: { id: { in: unitIds } }
      });

      // 7. Finalmente, apagar o Nível
      return tx.level.delete({
        where: { id }
      });
    });
  }


  async updateLevel(id: string, data: UpdateLevelDto){ return this.prisma.level.update({ where: { id }, data }); }
  async deleteLesson(id: string) { return this.prisma.lesson.delete({ where: { id } }); }
  async updateLesson(id: string, data: UpdateLessonDto) { return this.prisma.lesson.update({ where: { id }, data }); }
}
