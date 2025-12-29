import {
  Controller, Post, Get, Patch, Delete, Body, Query, Param,
  UseInterceptors, UploadedFiles, UseGuards,
  BadRequestException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DictionaryService } from './dictionary.service';
import { CreateWordDto } from './dto/create-word.dto';
import { Observable } from 'rxjs';

// --- GUARDS E DECORATORS ---
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dictionary')
@UseGuards(JwtAuthGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  /**
   * 🟢 ADICIONAR PALAVRA (ADMIN & TEACHER)
   */
  @Post('add-word')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]))
  addWord(
    @UploadedFiles() files: { audio?: Express.Multer.File[], image?: Express.Multer.File[] },
    @Body() createWordDto: CreateWordDto
  ): Observable<any> {
    if (!files.audio?.[0]) {
      throw new BadRequestException('O áudio da pronúncia é obrigatório.');
    }

    return this.dictionaryService.create(
      createWordDto,
      files.audio[0],
      files.image?.[0],
    );
  }

  /**
   * 🟡 EDITAR PALAVRA (ADMIN & TEACHER)
   * Patch permite atualização parcial dos dados.
   */
  @Patch('update/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]))
  async updateWord(
    @Param('id') id: string,
    @UploadedFiles() files: { audio?: Express.Multer.File[], image?: Express.Multer.File[] },
    @Body() updateWordDto: Partial<CreateWordDto>
  ) {
    return this.dictionaryService.update(
      id,
      updateWordDto,
      files.audio?.[0],
      files.image?.[0],
    );
  }

  /**
   * 🔴 APAGAR PALAVRA (ADMIN & TEACHER)
   */
  @Delete('delete/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async deleteWord(@Param('id') id: string) {
    return this.dictionaryService.delete(id);
  }

  /**
   * 🔵 LISTAR TODAS (Acesso para todos os autenticados)
   */
  @Get('all')
  async getAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.dictionaryService.findAll(Number(page), Number(limit));
  }

  /**
   * 🔍 BUSCAR ESPECÍFICA (Acesso para todos os autenticados)
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
