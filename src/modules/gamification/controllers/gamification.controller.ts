import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { GamificationService } from '../services/gamification.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

// Importação dos DTOs corrigida (assumindo que saímos de controllers/ para a raiz do módulo e entramos em dto/)
import { UpdateLevelDto } from '../dto/update-level.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // --- 🧑‍🎓 ÁREA DO ESTUDANTE ---

  @Get('trail')
  async getTrail(@Query('lang') lang: string) {
    return this.gamificationService.getTrail(lang || 'nhaneca');
  }

  @Get('lesson/:id')
  async getLesson(@Param('id') id: string) {
    return this.gamificationService.getLessonDetails(id);
  }

  // --- 🛠️ ÁREA DO TEACHER/ADMIN ---

  // NÍVEIS
  @Post('level')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async createLevel(@Body() data: { title: string; order: number; language: string }) {
    return this.gamificationService.createLevel(data);
  }

  @Patch('level/:id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async updateLevel(@Param('id') id: string, @Body() data: UpdateLevelDto) {
    return this.gamificationService.updateLevel(id, data);
  }

  @Delete('level/:id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async deleteLevel(@Param('id') id: string) {
    return this.gamificationService.deleteLevel(id);
  }

  // UNIDADES
  @Post('unit')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createUnit(@Body() data: { title: string; order: number; levelId: string }) {
    return this.gamificationService.createUnit(data);
  }

  // LIÇÕES
  @Post('lesson')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createLesson(
    @Body()
    data: {
      title: string;
      order: number;
      unitId: string;
      xpReward: number;
    },
  ) {
    return this.gamificationService.createLesson(data);
  }

  @Patch('lesson/:id')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async updateLesson(@Param('id') id: string, @Body() data: UpdateLessonDto) {
    return this.gamificationService.updateLesson(id, data);
  }

  @Delete('lesson/:id')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async deleteLesson(@Param('id') id: string) {
    return this.gamificationService.deleteLesson(id);
  }

  /**
   * CRIAÇÃO DE ATIVIDADE (Teoria ou Desafio)
   * Suporta 1 áudio e até 2 imagens (para o modo IMAGE_CHECK)
   */
  @Post('activity')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audio', maxCount: 1 },
      { name: 'images', maxCount: 2 },
    ]),
  )
  async createActivity(
    @Body() dto: any,
    @UploadedFiles() files: { audio?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    return this.gamificationService.addActivity(dto, files);
  }
}
