import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateWordDto } from './dto/create-word.dto';
import { from, Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DictionaryService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );

  private readonly bucketName = process.env.SUPABASE_BUCKET as string;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache, // 👈 Injeção do Cache
  ) {}

  /**
   * Limpa o cache para garantir que os dados novos apareçam no feed e termos
   */
  private async clearDictionaryCache() {
    const keys: string[] = await this.cacheManager.store.keys();
    const dictionaryKeys = keys.filter(
      (key) => key.startsWith('feed_') || key.startsWith('term_'),
    );
    await Promise.all(dictionaryKeys.map((key) => this.cacheManager.del(key)));
  }

  /**
   * 1. CRIAR: Com invalidação de cache
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

        return from(
          this.handleFiles(data.language ?? 'Nhaneca-Humbe', audioFile, imageFile),
        ).pipe(
          switchMap(({ audioUrl, imageUrl }) => {
            const examplesData = data.examples ? JSON.parse(data.examples) : [];
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
            ).pipe(
              tap(async () => await this.clearDictionaryCache()), // 👈 Limpa cache
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
   * 2. ATUALIZAR: Com invalidação de cache
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

      const examplesDataRaw = data.examples ? JSON.parse(data.examples as any) : undefined;
      const cleanExamples = examplesDataRaw?.map((ex: any) => ({
        text: ex.text,
        translation: ex.translation,
      }));

      const processTags = (raw: any) => {
        if (!raw) return undefined;
        return typeof raw === 'string'
          ? (raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').map(t => t.trim()).filter(Boolean))
          : raw;
      };

      const finalTags = processTags(data.tags);
      const finalSearchTags = processTags(data.searchTags);

      const updatedWord = await this.prisma.word.update({
        where: { id },
        data: {
          term: data.term,
          infinitive: data.infinitive,
          meaning: data.meaning,
          category: data.category,
          language: data.language,
          grammaticalType: data.grammaticalType,
          culturalNote: data.culturalNote,
          tags: finalTags,
          searchTags: finalSearchTags,
          audioUrl,
          imageUrl,
          examples: cleanExamples ? { deleteMany: {}, create: cleanExamples } : undefined,
        },
        include: { examples: true },
      });

      await this.clearDictionaryCache(); // 👈 Limpa cache após update
      return updatedWord;
    } catch (error: any) {
      throw new BadRequestException(`Falha ao atualizar: ${error.message}`);
    }
  }

  /**
   * 3. BUSCA E LISTAGEM: Cache no Feed
   */
  async findAll(page: number, limit: number, searchTerm?: string) {
    const cacheKey = `feed_${page}_${limit}_${searchTerm || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where = searchTerm ? {
      OR: [
        { term: { contains: searchTerm, mode: 'insensitive' as any } },
        { meaning: { contains: searchTerm, mode: 'insensitive' as any } },
        { infinitive: { contains: searchTerm, mode: 'insensitive' as any } },
        { searchTags: { has: searchTerm } },
      ]
    } : {};

    const [items, total] = await Promise.all([
      this.prisma.word.findMany({
        where, skip, take: limit,
        include: { examples: true },
        orderBy: { term: 'asc' },
      }),
      this.prisma.word.count({ where }),
    ]);

    const result = {
      items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };

    await this.cacheManager.set(cacheKey, result); // 👈 Guarda no cache
    return result;
  }

  /**
   * BUSCA POR TERMO: Cache na página dinâmica
   */
  async findByTerm(term: string) {
    const cacheKey = `term_${term.toLowerCase()}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const word = await this.prisma.word.findFirst({
      where: { term: { equals: term, mode: 'insensitive' } },
      include: { examples: true },
    });

    if (word) {
      await this.cacheManager.set(cacheKey, word); // 👈 Guarda no cache
    }
    return word;
  }

  /**
   * DELETE: Remove arquivos e invalida cache
   */
  async delete(id: string) {
    const word = await this.prisma.word.findUnique({ where: { id } });
    if (!word) throw new NotFoundException('Vocábulo não encontrado');

    if (word.audioUrl) await this.deleteFromSupabase(word.audioUrl);
    if (word.imageUrl) await this.deleteFromSupabase(word.imageUrl);

    await this.prisma.word.delete({ where: { id } });
    await this.clearDictionaryCache(); // 👈 Limpa cache
    return { success: true, message: `Termo "${word.term}" removido.` };
  }

  // --- MÉTODOS PRIVADOS AUXILIARES ---

  private async handleFiles(language: string, audio?: Express.Multer.File, image?: Express.Multer.File) {
    const audioUrl = audio ? await this.uploadToSupabase(audio, 'audios', language) : null;
    const imageUrl = image ? await this.uploadToSupabase(image, 'images', language) : null;
    return { audioUrl, imageUrl };
  }

  private async uploadToSupabase(file: Express.Multer.File, folder: string, language: string): Promise<string> {
    const langPath = language.toLowerCase().trim().replace(/\s+/g, '-');
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    const fullPath = `${langPath}/${folder}/${fileName}`;

    const { error } = await this.supabase.storage.from(this.bucketName).upload(fullPath, file.buffer, {
      contentType: file.mimetype,
    });

    if (error) throw new BadRequestException(`Erro Storage: ${error.message}`);
    return this.supabase.storage.from(this.bucketName).getPublicUrl(fullPath).data.publicUrl;
  }

  private async deleteFromSupabase(publicUrl: string) {
    const path = publicUrl.split(`${this.bucketName}/`)[1];
    if (path) await this.supabase.storage.from(this.bucketName).remove([path]);
  }
}

