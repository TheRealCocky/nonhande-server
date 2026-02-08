import {
  Controller,
  Get,
  Post,
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

  @Post('level')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async createLevel(@Body() data: { title: string; order: number; language: string }) {
    return this.gamificationService.createLevel(data);
  }

  @Post('unit')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createUnit(@Body() data: { title: string; order: number; levelId: string }) {
    return this.gamificationService.createUnit(data);
  }

  @Post('lesson')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createLesson(@Body() data: { title: string; order: number; unitId: string; xpReward: number }) {
    return this.gamificationService.createLesson(data);
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
    @Body() dto: any, // Recomendo criar um CreateActivityDto
    @UploadedFiles() files: { audio?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    return this.gamificationService.addActivity(dto, files);
  }
}
