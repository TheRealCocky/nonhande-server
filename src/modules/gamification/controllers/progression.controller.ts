import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Req,
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
   * Removi o :userId da URL por segurança, pegamos direto do Token.
   */
  @Get('status')
  async getStatus(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.progressionService.getOrSyncStatus(userId);

    const now = new Date();
    const lastUpdate = user.lastHeartUpdate || now;
    const elapsed = now.getTime() - lastUpdate.getTime();
    const REGEN_TIME = 24 * 60 * 1000;

    let nextHeartInSeconds = 0;
    if (user.hearts < user.maxHearts) {
      nextHeartInSeconds = Math.max(0, Math.floor((REGEN_TIME - (elapsed % REGEN_TIME)) / 1000));
    }

    return {
      hearts: user.hearts,
      maxHearts: user.maxHearts,
      xp: user.xp,
      streak: user.streak,
      nextHeartInSeconds,
      level: user.accessLevel // Para o frontend saber se mostra cadeados premium
    };
  }

  /**
   * ✅ REGISTA UM ERRO (PERDA DE VIDA)
   * Chamado quando o aluno erra uma questão que retira coração.
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
   * Novo: Para o aluno continuar onde parou se fechar o app.
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
}