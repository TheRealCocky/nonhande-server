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

  private readonly bucketName = process.env.SUPABASE_BUCKET as string;

  constructor(private prisma: PrismaService) {}

  /**
   * 1. CRIAR: Agora com suporte a infinitive e searchTags
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

        return from(this.handleFiles(data.language ?? 'Nhaneca-Humbe', audioFile, imageFile)).pipe(
          switchMap(({ audioUrl, imageUrl }) => {
            const examplesData = data.examples ? JSON.parse(data.examples) : [];

            // Como o DTO já faz o transform para Array, aqui apenas garantimos a tipagem
            const tagsData = Array.isArray(data.tags) ? data.tags : [];
            const searchTagsData = Array.isArray(data.searchTags) ? data.searchTags : [];

            return from(
              this.prisma.word.create({
                data: {
                  ...data,
                  infinitive: data.infinitive,
                  tags: tagsData,
                  searchTags: searchTagsData,
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
   * 2. ATUALIZAR: Refatorado para incluir novos campos
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

      const language = data.language || existingWord.language || 'Nhaneca-Humbe';

      if (audioFile) {
        if (audioUrl) await this.deleteFromSupabase(audioUrl);
        audioUrl = await this.uploadToSupabase(audioFile, 'audios', language);
      }

      if (imageFile) {
        if (imageUrl) await this.deleteFromSupabase(imageUrl);
        imageUrl = await this.uploadToSupabase(imageFile, 'images', language);
      }

      const examplesDataRaw = data.examples ? JSON.parse(data.examples) : undefined;
      const cleanExamples = examplesDataRaw?.map((ex: any) => ({
        text: ex.text,
        translation: ex.translation,
      }));

      return await this.prisma.word.update({
        where: { id },
        data: {
          term: data.term,
          infinitive: data.infinitive, // Atualizado
          meaning: data.meaning,
          category: data.category,
          language: data.language,
          grammaticalType: data.grammaticalType,
          culturalNote: data.culturalNote,
          tags: data.tags,
          searchTags: data.searchTags, // Atualizado
          audioUrl,
          imageUrl,
          examples: cleanExamples
            ? {
              deleteMany: {},
              create: cleanExamples,
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
   * 3. BUSCA E LISTAGEM: Agora filtra por term, meaning, infinitive e tags
   */
  async findAll(page: number, limit: number, searchTerm?: string) {
    const skip = (page - 1) * limit;

    // Filtro OR para busca inteligente
    const where = searchTerm ? {
      OR: [
        { term: { contains: searchTerm, mode: 'insensitive' as any } },
        { meaning: { contains: searchTerm, mode: 'insensitive' as any } },
        { infinitive: { contains: searchTerm, mode: 'insensitive' as any } },
        { searchTags: { has: searchTerm } }, // Busca dentro do array no MongoDB
      ]
    } : {};

    const [items, total] = await Promise.all([
      this.prisma.word.findMany({
        where,
        skip,
        take: limit,
        include: { examples: true },
        orderBy: { term: 'asc' },
      }),
      this.prisma.word.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  // --- MÉTODOS PRIVADOS AUXILIARES ---

  private async handleFiles(
    language: string,
    audio?: Express.Multer.File,
    image?: Express.Multer.File,
  ) {
    const audioUrl = audio
      ? await this.uploadToSupabase(audio, 'audios', language)
      : null;
    const imageUrl = image
      ? await this.uploadToSupabase(image, 'images', language)
      : null;
    return { audioUrl, imageUrl };
  }

  private async uploadToSupabase(
    file: Express.Multer.File,
    folder: string,
    language: string,
  ): Promise<string> {
    const langPath = language.toLowerCase().trim().replace(/\s+/g, '-');
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    const fullPath = `${langPath}/${folder}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fullPath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw new BadRequestException(`Erro Storage: ${error.message}`);

    return this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fullPath).data.publicUrl;
  }

  async delete(id: string) {
    const word = await this.prisma.word.findUnique({ where: { id } });
    if (!word) throw new NotFoundException('Vocábulo não encontrado');

    if (word.audioUrl) await this.deleteFromSupabase(word.audioUrl);
    if (word.imageUrl) await this.deleteFromSupabase(word.imageUrl);

    await this.prisma.word.delete({ where: { id } });
    return { success: true, message: `Termo "${word.term}" removido.` };
  }

  private async deleteFromSupabase(publicUrl: string) {
    const path = publicUrl.split(`${this.bucketName}/`)[1];
    if (path) await this.supabase.storage.from(this.bucketName).remove([path]);
  }

  async findByTerm(term: string) {
    return this.prisma.word.findFirst({
      where: { term: { equals: term, mode: 'insensitive' } },
      include: { examples: true },
    });
  }
}

