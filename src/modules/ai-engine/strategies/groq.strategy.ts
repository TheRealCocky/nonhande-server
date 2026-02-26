import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import * as process from 'node:process';

@Injectable()
export class GroqStrategy {
  // Criamos duas instâncias separadas para as duas contas
  private groqPrimary: Groq;
  private groqBackup: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    const apiKeyBackup = process.env.GROQ_API_KEY_BACKUP;

    if (!apiKey) {
      throw new InternalServerErrorException('GROQ_API_KEY não encontrada');
    }

    this.groqPrimary = new Groq({ apiKey });

    // Só inicializa a backup se ela existir no .env
    if (apiKeyBackup) {
      this.groqBackup = new Groq({ apiKey: apiKeyBackup });
    }
  }

  /**
   * Adicionamos o parâmetro 'useBackup' para o Orquestrador decidir qual chave usar
   */
  async getChatCompletion(
    prompt: string,
    systemInstruction: string,
    useBackup = false
  ): Promise<string> {
    try {
      // Seleciona a conta baseada no erro anterior
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
    } catch (error) {
      // Se estourar o limite, passamos o erro para o Orquestrador tratar o Fallback
      throw error;
    }
  }
}