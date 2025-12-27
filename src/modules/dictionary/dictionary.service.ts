import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import { CreateWordDto } from './dto/create-word.dto';
import { from, Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class DictionaryService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
  );

  constructor(private prisma: PrismaService) {}

  private async uploadToSupabase(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    const { data, error } = await this.supabase.storage
      .from('nonhande-content')
      .upload(`${folder}/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(`Erro no Storage: ${error.message}`);

    return this.supabase.storage
      .from('nonhande-content')
      .getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
  }

  /**
   * MÉTODO CREATE (Versão Stream)
   * Agora inclui o mapeamento completo do teu DTO
   */
  create(
    data: CreateWordDto,
    audioFile?: Express.Multer.File,
    imageFile?: Express.Multer.File,
  ): Observable<any> {
    return from(this.handleFiles(audioFile, imageFile)).pipe(
      switchMap(({ audioUrl, imageUrl }) => {
        // Tratamento dos Exemplos (String JSON -> Array)
        const examplesData = data.examples ? JSON.parse(data.examples) : [];

        // Tratamento das Tags (Caso venham como String via FormData)
        let tagsData = data.tags;
        if (typeof data.tags === 'string') {
          tagsData = (data.tags as string).split(',').map(tag => tag.trim());
        }

        return from(this.prisma.word.create({
          data: {
            term: data.term,
            meaning: data.meaning,
            category: data.category,
            language: data.language || 'Nhaneca-Humbe',
            grammaticalType: data.grammaticalType,
            culturalNote: data.culturalNote,
            tags: tagsData, // Incluído conforme o teu DTO
            audioUrl,
            imageUrl,
            examples: {
              create: examplesData.map((ex: any) => ({
                text: ex.text,
                translation: ex.translation,
              })),
            },
          },
          include: { examples: true },
        }));
      }),
      catchError(err => {
        console.error('Erro no Stream:', err);
        return throwError(() => new BadRequestException(`Erro no fluxo de dados: ${err.message}`));
      })
    );
  }

  private async handleFiles(audio?: Express.Multer.File, image?: Express.Multer.File) {
    const audioUrl = audio ? await this.uploadToSupabase(audio, 'audios') : null;
    const imageUrl = image ? await this.uploadToSupabase(image, 'images') : null;
    return { audioUrl, imageUrl };
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.word.findMany({
        skip,
        take: limit,
        include: { examples: true },
        orderBy: { term: 'asc' }
      }),
      this.prisma.word.count(),
    ]);
    return { items, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findByTerm(term: string) {
    return this.prisma.word.findFirst({
      where: { term: { equals: term, mode: 'insensitive' } },
      include: { examples: true },
    });
  }
}
