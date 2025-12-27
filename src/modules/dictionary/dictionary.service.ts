import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateWordDto } from './dto/create-word.dto';
import { from, Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class DictionaryService {
  // 🛡️ Usamos a SECRET_KEY para garantir permissões de escrita no Storage
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );

  constructor(private prisma: PrismaService) {}

  /**
   * Envia ficheiros para o Supabase Storage
   */
  private async uploadToSupabase(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;

    // 💡 Usa o nome do teu "Ouro": Nonhande_dataset
    const bucketName = process.env.SUPABASE_BUCKET || 'Nonhande_dataset';

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(`${folder}/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('❌ Erro no Supabase Storage:', error.message);
      throw new BadRequestException(`Erro no Storage: ${error.message}`);
    }

    // Retorna a URL pública para ser guardada na base de dados (Prisma)
    return this.supabase.storage
      .from(bucketName)
      .getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
  }

  /**
   * Criação de novo vocábulo (Fluxo RxJS)
   */
  create(
    data: CreateWordDto,
    audioFile?: Express.Multer.File,
    imageFile?: Express.Multer.File,
  ): Observable<any> {
    return from(this.handleFiles(audioFile, imageFile)).pipe(
      switchMap(({ audioUrl, imageUrl }) => {
        // Conversão segura de Exemplos (JSON -> Array)
        const examplesData = data.examples ? JSON.parse(data.examples) : [];

        // Tratamento de Tags
        let tagsData = data.tags || [];
        if (typeof data.tags === 'string') {
          tagsData = (data.tags as string).split(',').map(tag => tag.trim());
        }

        // Persistência no Prisma (PostgreSQL)
        return from(this.prisma.word.create({
          data: {
            term: data.term,
            meaning: data.meaning,
            category: data.category,
            language: data.language || 'Nhaneca-Humbe',
            grammaticalType: data.grammaticalType,
            culturalNote: data.culturalNote,
            tags: tagsData,
            audioUrl,
            imageUrl,
            examples: {
              create: examplesData.map((ex: { text: string; translation: string }) => ({
                text: ex.text,
                translation: ex.translation,
              })),
            },
          },
          include: { examples: true },
        }));
      }),
      catchError(err => {
        console.error('❌ Erro no Fluxo de Dados:', err);
        return throwError(() => new BadRequestException(`Erro no fluxo: ${err.message}`));
      })
    );
  }

  /**
   * Processamento de ficheiros antes da criação
   */
  private async handleFiles(audio?: Express.Multer.File, image?: Express.Multer.File) {
    const audioUrl = audio ? await this.uploadToSupabase(audio, 'audios') : null;
    const imageUrl = image ? await this.uploadToSupabase(image, 'images') : null;
    return { audioUrl, imageUrl };
  }

  /**
   * Listagem de palavras com paginação
   */
  async findAll(page: number, limit: number) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.word.findMany({
        skip,
        take: limit,
        include: { examples: true },
        orderBy: { term: 'asc' }
      }),
      this.prisma.word.count(),
    ]);
    return {
      items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Procura por termo específico
   */
  async findByTerm(term: string) {
    return this.prisma.word.findFirst({
      where: { term: { equals: term, mode: 'insensitive' } },
      include: { examples: true },
    });
  }
}
