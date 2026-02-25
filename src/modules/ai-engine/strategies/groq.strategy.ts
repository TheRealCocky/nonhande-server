// src/modules/ai-engine/strategies/groq.strategy.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import * as process from 'node:process';

@Injectable()
export class GroqStrategy {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('GROQ_API_KEY não encontrada');
    }
    this.groq = new Groq({ apiKey });
  }

  async getChatCompletion(prompt: string, context: string): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Tu és o Nonhande AI, um especialista na cultura e língua Nhaneka de Angola. 
                     Usa o seguinte contexto para responder, mas fala de forma natural e educativa: ${context}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        // ATUALIZAÇÃO DO MODELO AQUI
        model: 'llama-3.3-70b-versatile', // Modelo potente e atualizado
        temperature: 0.5,
        max_tokens: 1024,
      });

      return completion.choices[0]?.message?.content || 'Sem resposta do oráculo.';
    } catch (error) {
      throw new InternalServerErrorException('Erro ao comunicar com Groq: ' + error.message);
    }
  }
}