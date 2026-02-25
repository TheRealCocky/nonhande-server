import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { TouristExpertPrompt } from '../prompt-builders/agent-tourist.prompt';
import { AiResponse } from '../interfaces/ai-response.interface'; // Importar a interface

@Injectable()
export class TouristAgent extends BaseAgent {
  name = 'tourist_guide';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  // Mudamos para Promise<AiResponse> e adicionamos o context opcional para bater com o BaseAgent
  async execute(query: string, context?: any): Promise<AiResponse> {
    const prompt = TouristExpertPrompt(query);

    // Mantemos a tua lógica de passar o conhecimento geral como contexto para o Groq
    const answer = await this.groq.getChatCompletion(
      prompt,
      'Conhecimento geral sobre o turismo em Angola'
    );

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.90, // Confiança alta para turismo
      contextUsed: context || 'Conhecimento geral sobre o turismo em Angola'
    };
  }
}