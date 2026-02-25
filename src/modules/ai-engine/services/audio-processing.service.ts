import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AudioProcessingService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - limite seguro
  private readonly ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/webm'];

  /**
   * 1. Preparação do Áudio para Transcrição (Ouvir o utilizador)
   * Valida o buffer para que a HuggingFaceStrategy (Grátis) possa transcrever.
   */
  async processAudioForTranscription(file: Express.Multer.File): Promise<Buffer> {
    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('Ficheiro de áudio não fornecido ou vazio.');
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException('O áudio é demasiado grande. Máximo permitido: 5MB.');
      }

      // Se o mimetype não for reconhecido, apenas logamos, mas deixamos passar o buffer
      if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
        console.warn(`[Nonhande IA] Formato de áudio não padrão detectado: ${file.mimetype}`);
      }

      return file.buffer;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Erro ao processar áudio: ' + error.message);
    }
  }

  /**
   * 2. Resposta de Voz (Falar com o utilizador)
   * Como vamos usar a voz nativa do navegador (Web Speech API),
   * este método no servidor deixa de precisar de gerar ficheiros ou gastar APIs pagas.
   */
  async textToSpeech(text: string): Promise<string | null> {
    // Retornamos null porque a Nonhande IA falará diretamente pelo dispositivo do Mestre
    return null;
  }
}