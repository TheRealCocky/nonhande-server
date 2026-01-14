import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GamificationService } from '../services/gamification.service'; // 🚀 Import corrigido
import { ProgressionService } from '../services/progression.service'; // 🚀 Adicionado para gerir vidas
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';
import { CreateChallengeDto } from '../dto/create-challenge.dto';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly progressionService: ProgressionService,
  ) {}

  // --- 🧑‍🎓 ÁREA DO ESTUDANTE (GAMEPLAY) ---

  /**
   * Status de Vidas, XP e Streak
   * O Frontend chama isto para atualizar o Header com o timer regressivo
   */
  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    return this.progressionService.getFullStatus(userId);
  }

  /**
   * Mapa da Trilha (Levels -> Units -> Lessons)
   * Ex: GET /gamification/trail?lang=nhaneca
   */
  @Get('trail')
  async getTrail(@Query('lang') lang: string) {
    return this.gamificationService.getTrail(lang || 'nhaneca');
  }

  /**
   * Carregar lição e os seus desafios (exercícios)
   */
  @Get('lesson/:id')
  async getLesson(@Param('id') id: string) {
    return this.gamificationService.getLessonDetails(id);
  }

  /**
   * Finalizar lição: Calcula se ganhou XP ou perdeu vida
   */
  @Post('complete')
  async complete(@Body() dto: CompleteLessonDto) {
    return this.progressionService.processLessonCompletion(dto);
  }

  // --- 🛠️ ÁREA DO TEACHER/ADMIN (CONTEÚDO) ---

  @Post('level')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async createLevel(@Body() data: any) {
    return this.gamificationService.createLevel(data);
  }

  @Post('unit')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createUnit(@Body() data: any) {
    return this.gamificationService.createUnit(data);
  }

  @Post('lesson')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  async createLesson(@Body() data: any) {
    return this.gamificationService.createLesson(data);
  }

  /**
   * Criar Desafio com Upload de Áudio para o Supabase
   */
  @Post('challenge')
  @Roles('ADMIN', 'TEACHER')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async createChallenge(
    @Body() dto: CreateChallengeDto,
    @UploadedFile() audio?: Express.Multer.File
  ) {
    return this.gamificationService.addChallenge(dto, audio);
  }
}
