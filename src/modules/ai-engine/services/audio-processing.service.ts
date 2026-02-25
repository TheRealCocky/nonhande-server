// src/modules/ai-engine/services/audio-processing.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class AudioProcessingService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - limite seguro para o Whisper gratuito
  private readonly ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/webm'];

  async processAudioForTranscription(file: Express.Multer.File): Promise<Buffer> {
    try {
      // 1. Validação de existência
      if (!file || !file.buffer) {
        throw new BadRequestException('Ficheiro de áudio não fornecido ou vazio.');
      }

      // 2. Validação de Tamanho
      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException('O áudio é demasiado grande. Máximo permitido: 5MB.');
      }

      // 3. Validação de Formato
      if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
        // Log para debug, mas deixamos passar se o buffer parecer áudio
        console.warn(`Formato de áudio não padrão: ${file.mimetype}`);
      }

      // Por agora, retornamos o buffer direto.
      // Se o Whisper falhar muito, aqui instalaremos o 'fluent-ffmpeg'
      // para converter tudo para WAV 16kHz mono.
      return file.buffer;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Erro no processamento técnico do áudio: ' + error.message);
    }
  }
}