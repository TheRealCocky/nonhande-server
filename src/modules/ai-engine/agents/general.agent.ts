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

  async execute(query: string, context?: any): Promise<AiResponse> {
    // 1. Definimos um array vazio para os factos (por enquanto)
    const facts: string[] = [];

    // 2. ✨ PASSAMOS OS 3 ARGUMENTOS NA ORDEM CORRETA
    const systemInstruction = GENERAL_AGENT_PROMPT(query, context, facts);

    // 3. Chamamos a Groq
    const answer = await this.groq.getChatCompletion(query, systemInstruction);

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.98,
      contextUsed: context,
    };
  }
}