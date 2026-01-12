import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateWordDto } from './dto/create-word.dto';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager'; // Correção TS1272

@Injectable()
export class DictionaryService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );

  private readonly bucketName = process.env.SUPABASE_BUCKET as string;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Limpa o cache de forma segura para evitar erros de versão do cache-manager
   */
  private async clearDictionaryCache() {
    try {
      const store = (this.cacheManager as any).store;
      if (store && typeof store.keys === 'function') {
        const keys: string[] = await store.keys();
        const dictionaryKeys = keys.filter(
          (key) => key.startsWith('feed_') || key.startsWith('term_'),
        );

        if (dictionaryKeys.length > 0) {
          await Promise.all(
            dictionaryKeys.map((key) => this.cacheManager.del(key)),
          );
        }
      } else {
        // Fallback para reset total caso a store não suporte listagem de chaves
        if (typeof (this.cacheManager as any).reset === 'function') {
          await (this.cacheManager as any).reset();
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao limpar cache, continuando operação...');
    }
  }

  /**
   * 1. CRIAR: Com suporte a RxJS e limpeza de cache
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
              // SwitchMap garante que o cache é limpo antes de retornar
              switchMap(async (newWord) => {
                await this.clearDictionaryCache();
                return newWord;
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
   * 2. ATUALIZAR: Async/Await padrão
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

      const processTags = (raw: any) => {
        if (!raw) return undefined;
        return typeof raw === 'string'
          ? (raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').map(t => t.trim()).filter(Boolean))
          : raw;
      };

      const updatedWord = await this.prisma.word.update({
        where: { id },
        data: {
          ...data,
          tags: processTags(data.tags),
          searchTags: processTags(data.searchTags),
          audioUrl,
          imageUrl,
          examples: data.examples
            ? {
              deleteMany: {},
              create: JSON.parse(data.examples as any).map((ex: any) => ({
                text: ex.text,
                translation: ex.translation,
              })),
            }
            : undefined,
        },
        include: { examples: true },
      });

      await this.clearDictionaryCache();
      return updatedWord;
    } catch (error: any) {
      throw new BadRequestException(`Falha ao atualizar: ${error.message}`);
    }
  }

  /**
   * 3. FIND ALL: Com lógica de Cache Key
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
        { searchTags: { has: searchTerm } },
      ],
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

    const result = {
      items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };

    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * 4. FIND BY TERM: Cache para páginas individuais
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
      await this.cacheManager.set(cacheKey, word);
    }
    return word;
  }

  /**
   * 5. DELETE: Remove arquivos e limpa cache
   */
  async delete(id: string) {
    const word = await this.prisma.word.findUnique({ where: { id } });
    if (!word) throw new NotFoundException('Vocábulo não encontrado');

    if (word.audioUrl) await this.deleteFromSupabase(word.audioUrl);
    if (word.imageUrl) await this.deleteFromSupabase(word.imageUrl);

    await this.prisma.word.delete({ where: { id } });
    await this.clearDictionaryCache();
    return { success: true };
  }

  // --- PRIVADOS ---

  private async handleFiles(lang: string, audio?: Express.Multer.File, img?: Express.Multer.File) {
    const audioUrl = audio ? await this.uploadToSupabase(audio, 'audios', lang) : null;
    const imageUrl = img ? await this.uploadToSupabase(img, 'images', lang) : null;
    return { audioUrl, imageUrl };
  }

  private async uploadToSupabase(file: Express.Multer.File, folder: string, lang: string): Promise<string> {
    const path = `${lang.toLowerCase().replace(/\s+/g, '-')}/${folder}/${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    const { error } = await this.supabase.storage.from(this.bucketName).upload(path, file.buffer, {
      contentType: file.mimetype,
    });
    if (error) throw new BadRequestException(`Erro Storage: ${error.message}`);
    return this.supabase.storage.from(this.bucketName).getPublicUrl(path).data.publicUrl;
  }

  private async deleteFromSupabase(url: string) {
    const path = url.split(`${this.bucketName}/`)[1];
    if (path) await this.supabase.storage.from(this.bucketName).remove([path]);
  }
}

