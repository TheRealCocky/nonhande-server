// src/modules/ai-engine/agents/general.agent.ts
import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';

@Injectable()
export class GeneralAgent extends BaseAgent {
  name = 'angoia_general';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  async execute(query: string): Promise<string> {
    const systemInstruction = `Tu és o AngoIA, um assistente virtual angolano. 
    Se a pergunta for fora do âmbito de cultura ou turismo, responde de forma educada, 
    informando que a tua especialidade é a cultura Nhaneka e Angola.`;

    return await this.groq.getChatCompletion(query, systemInstruction);
  }
}