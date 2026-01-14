import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateChallengeDto } from '../dto/create-challenge.dto';

@Injectable()
export class GamificationService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );
  private readonly bucketName = process.env.SUPABASE_BUCKET as string;
  private readonly REGEN_TIME = 24 * 60 * 1000; // 1 coração a cada 24 min

  constructor(private prisma: PrismaService) {}

  // --- 1. GESTÃO DE STATUS E VIDAS ---

  async getUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    /** * Nota: Se após o 'npx prisma generate' o erro persistir,
     * use (user as any).hearts para forçar a tipagem, mas o ideal
     * é o Prisma reconhecer o novo Schema.
     */
    if (user.hearts < user.maxHearts) {
      const now = new Date();
      const elapsed = now.getTime() - user.lastHeartUpdate.getTime();
      const heartsToAdd = Math.floor(elapsed / this.REGEN_TIME);

      if (heartsToAdd > 0) {
        const newHearts = Math.min(user.maxHearts, user.hearts + heartsToAdd);
        const nextUpdate = new Date(user.lastHeartUpdate.getTime() + (heartsToAdd * this.REGEN_TIME));

        return await this.prisma.user.update({
          where: { id: userId },
          data: {
            hearts: newHearts,
            lastHeartUpdate: newHearts === user.maxHearts ? now : nextUpdate
          }
        });
      }
    }
    return user;
  }

  // --- 2. NAVEGAÇÃO E TRILHA ---

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
              select: { id: true, title: true, order: true, xpReward: true, access: true }
            }
          }
        }
      }
    });
  }

  async getLessonDetails(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { challenges: true }
    });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');
    return lesson;
  }

  // --- 3. CRIAÇÃO DE CONTEÚDO ---

  async createLevel(data: { title: string; order: number; language: string }) {
    return this.prisma.level.create({ data });
  }

  async createUnit(data: { title: string; order: number; levelId: string }) {
    return this.prisma.unit.create({ data });
  }

  async createLesson(data: { title: string; order: number; unitId: string; xpReward: number }) {
    return this.prisma.lesson.create({ data });
  }

  async addChallenge(dto: CreateChallengeDto, audioFile?: Express.Multer.File) {
    let content = typeof dto.content === 'string' ? JSON.parse(dto.content) : dto.content;

    if (audioFile) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
        include: { unit: { include: { level: true } } }
      });
      const lang = lesson?.unit.level.language || 'nhaneca';

      const path = `${lang}/gamification/${Date.now()}-${audioFile.originalname.replace(/\s+/g, '_')}`;

      // ✅ CORREÇÃO: Usar 'audioFile' em vez de 'file'
      const { error } = await this.supabase.storage.from(this.bucketName).upload(path, audioFile.buffer, {
        contentType: audioFile.mimetype,
      });

      if (error) throw new BadRequestException(`Erro Supabase: ${error.message}`);
      content.audioUrl = this.supabase.storage.from(this.bucketName).getPublicUrl(path).data.publicUrl;
    }

    return this.prisma.challenge.create({
      data: {
        type: dto.type,
        question: dto.question,
        content: content,
        lessonId: dto.lessonId
      }
    });
  }

  // --- 4. PROCESSAMENTO DE RESULTADOS ---

  async completeLesson(userId: string, lessonId: string, score: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lição não encontrada.');

    await this.prisma.userLesson.create({
      data: { userId, lessonId, score }
    });

    if (score >= 60) {
      return this.prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: lesson.xpReward },
          lastActive: new Date(),
        }
      });
    }

    return { message: 'Lição concluída, mas score insuficiente para recompensas.' };
  }
}
