import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  NotFoundException,
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
    @Query('limit') limit: string = '10',
    @Query('search') search?: string // ⬅️ ADICIONADO: Captura o texto da busca
  ) {
    // Passamos o search para o service, que agora já sabe procurar em term, meaning e searchTags
    return this.dictionaryService.findAll(
      Number(page),
      Number(limit),
      search
    );
  }

  /**
   * 🔍 BUSCAR ESPECÍFICA (Por termo exato)
   * Útil para quando clicamos num Link Cruzado direto
   */
  @Get('search/:term')
  async getOne(@Param('term') term: string) {
    const word = await this.dictionaryService.findByTerm(term);
    if (!word) {
      throw new NotFoundException('Palavra não encontrada.');
    }
    return word;
  }
}