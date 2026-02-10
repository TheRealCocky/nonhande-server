import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Req, Body,
} from '@nestjs/common';
import { ProgressionService } from '../services/progression.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('progression')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  /**
   * ✅ OBTÉM O STATUS DE SOBREVIVÊNCIA
   * Sincroniza corações e retorna XP/Streak.
   * Pega o userId do Token JWT para total segurança.
   */
  @Get('status')
  async getStatus(@Req() req: any) {
    const userId = req.user.id;

    // Chama o service que já corrigimos para retornar dados frescos do DB
    const user = await this.progressionService.getOrSyncStatus(userId);

    const now = new Date();
    const lastUpdate = user.lastHeartUpdate || now;
    const elapsed = now.getTime() - lastUpdate.getTime();

    // Usamos a mesma constante do Service (24 minutos)
    const REGEN_TIME = 24 * 60 * 1000;

    let nextHeartInSeconds = 0;
    if (user.hearts < user.maxHearts) {
      // Cálculo do tempo restante para o próximo coração
      nextHeartInSeconds = Math.max(0, Math.floor((REGEN_TIME - (elapsed % REGEN_TIME)) / 1000));
    }

    return {
      hearts: user.hearts,
      maxHearts: user.maxHearts,
      xp: user.xp,
      streak: user.streak,
      nextHeartInSeconds,
      level: user.accessLevel // Útil para o frontend gerir permissões
    };
  }

  /**
   * ✅ REGISTA UM ERRO (PERDA DE VIDA)
   * Agora retorna o status atualizado para o Frontend sincronizar na hora.
   */
  @Post('mistake')
  async handleMistake(@Req() req: any) {
    const userId = req.user.id;
    const updatedUser = await this.progressionService.handleLoss(userId);

    return {
      message: 'Vida perdida no reino!',
      heartsRemaining: updatedUser.hearts
    };
  }

  /**
   * ✅ SALVA PROGRESSO PARCIAL (ATIVIDADE ATUAL)
   * Permite que o aluno continue exatamente de onde parou.
   */
  @Post('save-point/:lessonId/:activityOrder')
  async savePoint(
    @Param('lessonId') lessonId: string,
    @Param('activityOrder') activityOrder: string,
    @Req() req: any
  ) {
    const userId = req.user.id;

    await this.progressionService.saveActivityProgress(
      userId,
      lessonId,
      parseInt(activityOrder)
    );

    return { success: true };
  }
  /**
   * ✅ FINALIZA UMA LIÇÃO
   * Recebe o score e lessonId, calcula XP e Streak.
   */
  @Post('complete')
  async completeLesson(
    @Body() dto: { lessonId: string; score: number },
    @Req() req: any
  ) {
    const userId = req.user.id;

    // Chamamos o serviço que já tem a transação blindada
    return await this.progressionService.processLessonCompletion({
      userId,
      lessonId: dto.lessonId,
      score: dto.score,
    });
  }

}