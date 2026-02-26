import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { AiResponse } from '../interfaces/ai-response.interface';
import { GENERAL_AGENT_PROMPT } from '../prompt-builders/agent-general.prompt';

@Injectable()
export class GeneralAgent extends BaseAgent {
  name = 'angoia_general';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  async execute(query: string, context?: any, useBackup = false): Promise<AiResponse> {
    // 1. Definimos um array vazio para os factos
    const facts: string[] = [];

    // 2. Mantemos a geração da instrução de sistema
    const systemInstruction = GENERAL_AGENT_PROMPT(query, context, facts);

    // 3. ✨ O SEGREDO: Passamos o useBackup para a GroqStrategy
    // Agora a Strategy saberá se deve usar a Chave 1 ou a Chave 2
    const answer = await this.groq.getChatCompletion(query, systemInstruction, useBackup);

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.98,
      contextUsed: context,
    };
  }
}
