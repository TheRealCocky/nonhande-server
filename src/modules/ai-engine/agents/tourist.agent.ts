// src/modules/ai-engine/agents/tourist.agent.ts
import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { TouristExpertPrompt } from '../prompt-builders/agent-tourist.prompt';

@Injectable()
export class TouristAgent extends BaseAgent {
  name = 'tourist_guide';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  async execute(query: string): Promise<string> {
    const prompt = TouristExpertPrompt(query);
    // Para o guia turístico, usamos o conhecimento geral do Llama 3 sobre o mundo
    // sem precisar de contexto do MongoDB (por enquanto)
    return await this.groq.getChatCompletion(prompt, 'Conhecimento geral sobre o turismo em Angola');
  }
}