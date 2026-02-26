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
    // ✨ PASSAMOS O CONTEXTO PARA O PROMPT BUILDER
    const systemInstruction = GENERAL_AGENT_PROMPT(query, context);

    const answer = await this.groq.getChatCompletion(query, systemInstruction);

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.98,
      contextUsed: context, // Aqui já estava bem, mas é só para o log
    };
  }
}
