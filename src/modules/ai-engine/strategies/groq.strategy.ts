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
  userPrompt: string,      // Isto vem do GENERAL_USER_PROMPT
  systemInstruction: string, // Isto é o GENERAL_SYSTEM_INSTRUCTION
  useBackup = false
): Promise<string> {
  const client = (useBackup && this.groqBackup) ? this.groqBackup : this.groqPrimary;

  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt }, // O contexto e a pergunta vêm aqui
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content || 'Sem resposta do oráculo.';
}
}