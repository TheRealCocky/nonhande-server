import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { GamificationService } from '../services/gamification.service';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';

// --- GUARDS E DECORATORS (Seguindo o padrão do Dicionário) ---
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('gamification')
@UseGuards(JwtAuthGuard) // 🔒 Proteção Global: Só entra quem tem Token válido
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * 🗺️ Mapa da Trilha
   * Acesso: STUDENT, TEACHER, ADMIN
   */
  @Get('trail')
  async getTrail() {
    return this.gamificationService.getTrail();
  }

  /**
   * 📖 Detalhes da Lição
   * Acesso: STUDENT, TEACHER, ADMIN
   */
  @Get('lesson/:id')
  async getLesson(@Param('id') id: string) { // ✨ Corrigido o mapeamento do ID
    return this.gamificationService.getLessonDetails(id);
  }

  /**
   * ✅ Concluir Lição
   * Acesso: STUDENT (para ganhar XP)
   */
  @Post('complete')
  async complete(@Body() completeLessonDto: CompleteLessonDto) {
    return this.gamificationService.completeLesson(completeLessonDto);
  }

  /**
   * 🛠️ Criar Desafio (Admin/Teacher)
   * 🔒 Proteção Especial: Bloqueado para estudantes.
   */
  @Post('challenge')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async createChallenge(@Body() createChallengeDto: CreateChallengeDto) {
    return this.gamificationService.addChallenge(createChallengeDto);
  }
}
