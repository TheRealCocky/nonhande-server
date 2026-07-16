import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as process from 'node:process';

@Injectable()
export class HuggingFaceStrategy {
  private readonly hfToken = process.env.HF_TOKEN;
  private readonly modelId = 'intfloat/multilingual-e5-large';
  private readonly whisperModel = 'openai/whisper-large-v3';

  // 🎯 O Mistral 7B é o que menos falha no Router gratuito
  private readonly chatModel = 'mistralai/Mistral-7B-Instruct-v0.3';

  /**
   * Transcreve áudio para texto usando o Whisper Large v3
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const url = `https://router.huggingface.co/hf-inference/models/${this.whisperModel}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.hfToken}`,
          'Content-Type': 'audio/wav',
          'x-wait-for-model': 'true', // Garante que o modelo carregue
        },
        method: 'POST',
        body: new Uint8Array(audioBuffer),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return result.text || 'Ouvimos o áudio, mas não detetámos fala clara.';
    } catch (error) {
      console.error('Erro Whisper HF:', error.message);
      throw new InternalServerErrorException('Falha na transcrição: ' + error.message);
    }
  }

  /**
   * Gera o vetor (embedding) para busca no MongoDB
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const input = `query: ${text}`;
      const url = `https://router.huggingface.co/hf-inference/models/${this.modelId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true',
        },
        method: 'POST',
        body: JSON.stringify({ inputs: input }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
    } catch (error) {
      throw new InternalServerErrorException('Falha ao gerar vetor via HF: ' + error.message);
    }
  }

}