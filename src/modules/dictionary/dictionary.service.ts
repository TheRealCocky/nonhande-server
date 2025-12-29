import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateWordDto } from './dto/create-word.dto';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class DictionaryService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );

  private readonly bucketName =
    process.env.SUPABASE_BUCKET || 'Nonhande_dataset';

  constructor(private prisma: PrismaService) {}

  /**
   * 1. CRIAR: Com verificação de duplicidade e upload de ficheiros
   */
  create(
    data: CreateWordDto,
    audioFile?: Express.Multer.File,
    imageFile?: Express.Multer.File,
  ): Observable<any> {
    return from(
      this.prisma.word.findFirst({
        where: { term: { equals: data.term, mode: 'insensitive' } },
      }),
    ).pipe(
      switchMap((existingWord) => {
        if (existingWord) {
          throw new BadRequestException(
            `O termo "${data.term}" já existe no dicionário.`,
          );
        }

        return from(this.handleFiles(audioFile, imageFile)).pipe(
          switchMap(({ audioUrl, imageUrl }) => {
            const examplesData = data.examples ? JSON.parse(data.examples) : [];

            // Tratamento de tags para criação
            const rawTags = data.tags as unknown;
            const tagsData =
              typeof rawTags === 'string'
                ? rawTags.split(',').map((t) => t.trim())
                : (rawTags as string[]);

            return from(
              this.prisma.word.create({
                data: {
                  ...data,
                  tags: tagsData || [],
                  audioUrl,
                  imageUrl,
                  examples: {
                    create: examplesData.map(
                      (ex: { text: string; translation: string }) => ({
                        text: ex.text,
                        translation: ex.translation,
                      }),
                    ),
                  },
                },
                include: { examples: true },
              }),
            );
          }),
        );
      }),
      catchError((err) =>
        throwError(
          () =>
            err instanceof BadRequestException
              ? err
              : new BadRequestException(err.message),
        ),
      ),
    );
  }

  /**
   * 2. ATUALIZAR: Substitui ficheiros no Supabase e atualiza Prisma
   */
  async update(
    id: string,
    data: Partial<CreateWordDto>,
    audioFile?: Express.Multer.File,
    imageFile?: Express.Multer.File,
  ) {
    try {
      const existingWord = await this.prisma.word.findUnique({ where: { id } });
      if (!existingWord) throw new NotFoundException('Palavra não encontrada');

      let audioUrl = existingWord.audioUrl;
      let imageUrl = existingWord.imageUrl;

      if (audioFile) {
        if (audioUrl) await this.deleteFromSupabase(audioUrl);
        audioUrl = await this.uploadToSupabase(audioFile, 'audios');
      }

      if (imageFile) {
        if (imageUrl) await this.deleteFromSupabase(imageUrl);
        imageUrl = await this.uploadToSupabase(imageFile, 'images');
      }

      const examplesData = data.examples
        ? JSON.parse(data.examples)
        : undefined;

      // RESOLUÇÃO DO ERRO TS2339 (Tipagem de Tags)
      const rawTags = data.tags as unknown;
      const tagsData =
        typeof rawTags === 'string'
          ? rawTags.split(',').map((t) => t.trim())
          : (rawTags as string[]);

      return await this.prisma.word.update({
        where: { id },
        data: {
          term: data.term,
          meaning: data.meaning,
          category: data.category,
          grammaticalType: data.grammaticalType,
          culturalNote: data.culturalNote,
          tags: tagsData,
          audioUrl,
          imageUrl,
          examples: examplesData
            ? {
              deleteMany: {},
              create: examplesData,
            }
            : undefined,
        },
        include: { examples: true },
      });
    } catch (error: any) {
      console.error('❌ Erro no Service Update:', error);
      throw new BadRequestException(`Falha ao atualizar: ${error.message}`);
    }
  }

  /**
   * 3. APAGAR: Remove do Banco e limpa Storage
   */
  async delete(id: string) {
    const word = await this.prisma.word.findUnique({ where: { id } });
    if (!word) throw new NotFoundException('Vocábulo não encontrado');

    if (word.audioUrl) await this.deleteFromSupabase(word.audioUrl);
    if (word.imageUrl) await this.deleteFromSupabase(word.imageUrl);

    await this.prisma.word.delete({ where: { id } });
    return { success: true, message: `Termo "${word.term}" removido.` };
  }

  private async handleFiles(
    audio?: Express.Multer.File,
    image?: Express.Multer.File,
  ) {
    const audioUrl = audio
      ? await this.uploadToSupabase(audio, 'audios')
      : null;
    const imageUrl = image
      ? await this.uploadToSupabase(image, 'images')
      : null;
    return { audioUrl, imageUrl };
  }

  private async uploadToSupabase(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(`${folder}/${fileName}`, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw new BadRequestException(`Erro Storage: ${error.message}`);

    return this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
  }

  private async deleteFromSupabase(publicUrl: string) {
    const path = publicUrl.split(`${this.bucketName}/`)[1];
    if (path) await this.supabase.storage.from(this.bucketName).remove([path]);
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.word.findMany({
        skip,
        take: limit,
        include: { examples: true },
        orderBy: { term: 'asc' },
      }),
      this.prisma.word.count(),
    ]);
    return {
      items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findByTerm(term: string) {
    return this.prisma.word.findFirst({
      where: { term: { equals: term, mode: 'insensitive' } },
      include: { examples: true },
    });
  }
}
