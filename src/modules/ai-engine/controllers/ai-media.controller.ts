// src/modules/ai-engine/controllers/ai-media.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';

@Controller('ai/media')
export class AiMediaController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file')) // 'file' é o nome do campo no Postman/Frontend
  async handleVoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new InternalServerErrorException('Nenhum ficheiro de áudio enviado.');
    }

    // Chama o orquestrador que vai usar o Whisper e depois o RAG do MongoDB
    return await this.orchestrator.handleVoiceQuery(file);
  }
}