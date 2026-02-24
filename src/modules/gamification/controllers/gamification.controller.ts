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
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { GamificationService } from '../services/gamification.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

import { UpdateLevelDto } from '../dto/update-level.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { CheckPaywall } from '../decorators/paywall.decorator';
import { PaywallGuard } from '../guards/paywall.guard';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // --- 🧑‍🎓 ÁREA DO ESTUDANTE ---

  /**
   * ✅ OBTÉM A TRILHA PERSONALIZADA
   */
  @Get('trail')
  async getTrail(@Query('lang') lang: string, @Req() req: any) {

    const userId = req.user?.id;

    // Log para debug no terminal do VS Code
    console.log(`📡 Buscando trilha: Lang=${lang || 'nhaneca'} | User=${userId || 'GUEST/ADMIN'}`);

    return this.gamificationService.getTrail(lang || 'nhaneca', userId);
  }

  /**
   * ✅ OBTÉM DETALHES DA LIÇÃO
   */
  @Get('lesson/:id')
  @CheckPaywall()
  @UseGuards(PaywallGuard)
  async getLesson(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.gamificationService.getLessonDetails(id, userId);
  }

  // --- 🛠️ ÁREA DO TEACHER/ADMIN ---

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

  @Post('unit')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createUnit(@Body() data: { title: string; order: number; levelId: string }) {
    return this.gamificationService.createUnit(data);
  }

  @Post('lesson')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createLesson(
    @Body() data: { title: string; order: number; unitId: string; xpReward: number; },
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
   * ✅ CRIAÇÃO DE ATIVIDADE (Ajustado para múltiplos arquivos)
   */
  @Post('activity')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audio', maxCount: 1 },         // Áudio principal/correto
      { name: 'distractors', maxCount: 4 },  // Áudios errados para o desafio de escuta
      { name: 'images', maxCount: 4 },       // Até 4 imagens (para exercícios de múltipla escolha visual)
    ]),
  )
  async createActivity(
    @Body() dto: any,
    @UploadedFiles() files: {
      audio?: Express.Multer.File[];
      distractors?: Express.Multer.File[];
      images?: Express.Multer.File[]
    },
  ) {
    return this.gamificationService.addActivity(dto, files);
  }

  /**
   * ✅ ATUALIZAÇÃO DE ATIVIDADE
   */
  @Patch('activity/:id')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audio', maxCount: 1 },
      { name: 'distractors', maxCount: 4 },
      { name: 'images', maxCount: 4 },
    ]),
  )
  async updateActivity(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFiles() files: {
      audio?: Express.Multer.File[];
      distractors?: Express.Multer.File[];
      images?: Express.Multer.File[]
    },
  ) {
    return this.gamificationService.updateActivity(id, dto, files);
  }

  @Delete('activity/:id')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async deleteActivity(@Param('id') id: string) {
    return this.gamificationService.deleteActivity(id);
  }
}
