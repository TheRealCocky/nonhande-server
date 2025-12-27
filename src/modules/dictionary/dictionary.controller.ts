import {
  Controller, Post, Get, Body, Query, Param,
  UseInterceptors, UploadedFiles, UseGuards,
  BadRequestException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DictionaryService } from './dictionary.service';
import { CreateWordDto } from './dto/create-word.dto';
import { Observable } from 'rxjs'; // Importante para o Stream

// --- IMPORTAÇÕES DOS TEUS GUARDS ---
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dictionary')
@UseGuards(JwtAuthGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  /**
   * ADICIONAR PALAVRA
   * Agora retorna um Observable para lidar com o fluxo de upload
   */
  @Post('add-word')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]))
  addWord( // Retiramos o 'async'
    @UploadedFiles() files: { audio?: Express.Multer.File[], image?: Express.Multer.File[] },
    @Body() createWordDto: CreateWordDto
  ): Observable<any> { // Definimos o retorno como Observable
    if (!files.audio?.[0]) {
      throw new BadRequestException('O áudio da pronúncia é obrigatório.');
    }

    // Chamamos o service diretamente sem 'await'
    return this.dictionaryService.create(
      createWordDto,
      files.audio[0],
      files.image?.[0],
    );
  }

  /**
   * LISTAR TODAS (Mantém async pois o findAll usa Promises)
   */
  @Get('all')
  async getAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.dictionaryService.findAll(Number(page), Number(limit));
  }

  /**
   * BUSCAR UMA ESPECÍFICA
   */
  @Get('search/:term')
  async getOne(@Param('term') term: string) {
    const word = await this.dictionaryService.findByTerm(term);
    if (!word) {
      throw new BadRequestException('Palavra não encontrada.');
    }
    return word;
  }
}
