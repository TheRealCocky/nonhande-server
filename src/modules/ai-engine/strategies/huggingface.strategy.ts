import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as process from 'node:process';

@Injectable()
export class HuggingFaceStrategy {
  private readonly hfToken = process.env.HF_TOKEN;
  // O modelo exato usado para indexar os documentos
  private readonly modelId = 'intfloat/multilingual-e5-large';
  // O modelo Whisper para transcrição de voz
  private readonly whisperModel = 'openai/whisper-large-v3';
  // 🎯 Plano B: Mistral é o mais estável para o Router no plano Free
  private readonly chatModel = 'mistralai/Mistral-7B-Instruct-v0.3';

  /**
   * Transcreve áudio para texto usando o Whisper Large v3
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // 🎯 Atualizado para router.huggingface.co
      const url = `https://router.huggingface.co/hf-inference/models/${this.whisperModel}`;

      const response = await fetch(
        url,
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

      let transcription = result.text;
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
   * Gera o vetor (embedding) para busca no MongoDB
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const input = `query: ${text}`;
      // 🎯 Atualizado para router.huggingface.co
      const url = `https://router.huggingface.co/hf-inference/models/${this.modelId}`;

      const response = await fetch(
        url,
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

      if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0];
      }

      return result;
    } catch (error) {
      throw new InternalServerErrorException('Falha ao gerar vetor via HuggingFace: ' + error.message);
    }
  }

  /**
   * ✨ NOVO: Método de Chat para Fallback (Plano B)
   * Usado quando o Groq bate no Rate Limit (429)
   */
  async getChatCompletion(prompt: string, systemInstruction: string): Promise<string> {
    try {
      // 🎯 A URL correta para evitar o erro 410 e 404
      const url = `https://router.huggingface.co/hf-inference/models/${this.chatModel}/v1/chat/completions`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          model: this.chatModel,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // Formato padrão OpenAI retornado pelo Router do HF
      return result.choices?.[0]?.message?.content?.trim() || 'Resposta indisponível no momento.';
    } catch (error) {
      console.error('Erro HF Backup:', error.message);
      throw new InternalServerErrorException('Falha no Backup HuggingFace: ' + error.message);
    }
  }
}