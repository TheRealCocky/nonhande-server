// src/modules/ai-engine/strategies/huggingface.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as process from 'node:process';

@Injectable()
export class HuggingFaceStrategy {
  private readonly hfToken = process.env.HF_TOKEN;
  // O modelo exato usado para indexar os 7074 documentos
  private readonly modelId = 'intfloat/multilingual-e5-large';
  // O modelo Whisper para transcrição de voz
  private readonly whisperModel = 'openai/whisper-large-v3';

  /**
   * Transcreve áudio para texto usando o Whisper Large v3
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Adicionamos parâmetros na URL para guiar o Whisper
      const url = new URL(`https://router.huggingface.co/hf-inference/models/${this.whisperModel}`);

      const response = await fetch(
        url.toString(),
        {
          headers: {
            Authorization: `Bearer ${this.hfToken}`,
            'Content-Type': 'audio/wav',
            'x-wait-for-model': 'true',
          },
          method: 'POST',
          body: new Uint8Array(audioBuffer),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      if (!result.text) {
        return 'Ouvimos o áudio, mas não detetámos fala clara.';
      }

      // Se ele ainda transcrever "Er det kombi", podemos fazer um pequeno
      // "Sanitizer" manual aqui antes de retornar para o Orquestrador
      let transcription = result.text;

      // Pequeno ajuste para sons comuns que o Whisper confunde
      if (transcription.toLowerCase().includes('kombi')) {
        transcription = transcription.replace(/kombi/gi, 'Ekumbi');
      }

      return transcription;
    } catch (error) {
      console.error('Erro Whisper HF:', error.message);
      throw new InternalServerErrorException('Falha na transcrição: ' + error.message);
    }
  }

  /**
   * Gera o vetor (embedding) de 1024 dimensões para busca no MongoDB
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // O modelo E5 exige o prefixo 'query: ' para buscas semânticas
      const input = `query: ${text}`;

      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${this.modelId}`,
        {
          headers: {
            Authorization: `Bearer ${this.hfToken}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          method: 'POST',
          body: JSON.stringify({ inputs: input }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Tratamento do retorno: O router pode devolver o array direto ou aninhado
      if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0]; // Retorna o primeiro vetor se vier como matriz
      }

      return result; // Retorna o array de numbers
    } catch (error) {
      throw new InternalServerErrorException('Falha ao gerar vetor via HuggingFace: ' + error.message);
    }
  }
}