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
    // ✨ O AJUSTE ESTÁ AQUI:
    // Como GENERAL_AGENT_PROMPT é uma função, temos de a executar passando a query.
    const systemInstruction = GENERAL_AGENT_PROMPT(query);

    // Agora enviamos a instrução já montada com a query lá dentro
    const answer = await this.groq.getChatCompletion(query, systemInstruction);

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.98,
      contextUsed: context,
    };
  }
}
