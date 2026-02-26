import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import * as process from 'node:process';

@Injectable()
export class GroqStrategy {
  private groqPrimary: Groq;
  private groqBackup: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    const apiKeyBackup = process.env.GROQ_API_KEY_BACKUP;

    if (!apiKey) {
      throw new InternalServerErrorException('GROQ_API_KEY não encontrada');
    }

    this.groqPrimary = new Groq({ apiKey });

    if (apiKeyBackup) {
      this.groqBackup = new Groq({ apiKey: apiKeyBackup });
    }
  }

  async getChatCompletion(
    prompt: string,
    systemInstruction: string,
    useBackup = false
  ): Promise<string> {
    const client = (useBackup && this.groqBackup) ? this.groqBackup : this.groqPrimary;

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || 'Sem resposta do oráculo.';
  }
}