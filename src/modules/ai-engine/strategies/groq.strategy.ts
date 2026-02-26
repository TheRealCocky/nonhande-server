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

  async getChatCompletion(prompt: string, systemInstruction: string): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemInstruction, // ✨ AGORA ELA RECEBE AS ORDENS DO PROMPTBUILDER
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2, // 🎯 BAIXAMOS A TEMPERATURA: Mais obediência, menos conversa fiada.
        max_tokens: 1024,
      });

      return completion.choices[0]?.message?.content || 'Sem resposta do oráculo.';
    } catch (error) {
      throw new InternalServerErrorException('Erro ao comunicar com Groq: ' + error.message);
    }
  }
}