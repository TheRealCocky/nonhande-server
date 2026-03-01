import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
@Controller('ai/media')
@UseGuards(JwtAuthGuard)
export class AiMediaController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file'))
  async handleVoice(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string // ✨ Agora recebemos o userId do body
  ) {
    // 1. Validação básica de entrada
    if (!file) {
      throw new BadRequestException('Nenhum ficheiro de áudio enviado.');
    }

    // 2. Garantir que temos um identificador para a memória
    // Se não vier do frontend, usamos um fallback para não quebrar o código
    const activeUserId = userId || 'anonymous_user';

    // 3. Chama o orquestrador passando o arquivo E o ID do usuário
    // Isso resolve o erro TS2554
    return await this.orchestrator.handleVoiceQuery(file, activeUserId);
  }
}