import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ProgressionService } from '../services/progression.service';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('progression')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  /**
   * 💓 STATUS COMPLETO (Vidas + Timer + Streak + XP)
   * Essencial para o Header do Next.js.
   * Recalcula as vidas automaticamente ao ser chamado.
   */
  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    // O método getFullStatus no Service já chama internamente
    // a regeneração de corações baseada no tempo.
    return this.progressionService.getFullStatus(userId);
  }

  /**
   * ✅ FINALIZAR LIÇÃO (Sucesso ou Falha)
   * Decide se o aluno ganha XP ou perde vida baseado no Score.
   */
  @Post('complete')
  async completeLesson(@Body() dto: CompleteLessonDto) {
    return this.progressionService.processLessonCompletion(dto);
  }

  /**
   * 💔 PERDER VIDA (Erro em tempo real)
   * Chamado pelo Frontend assim que o usuário erra um desafio "crítico".
   */
  @Post('mistake/:userId')
  async handleMistake(@Param('userId') userId: string) {
    const updatedUser = await this.progressionService.loseHeart(userId);
    return {
      message: 'Vida perdida!',
      heartsRemaining: updatedUser.hearts,
      lastHeartUpdate: updatedUser.lastHeartUpdate
    };
  }
}