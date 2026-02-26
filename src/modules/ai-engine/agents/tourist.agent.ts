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
  async execute(query: string, context?: string): Promise<AiResponse> {
    // 1. O prompt continua a ser gerado com a query
    const prompt = TouristExpertPrompt(query);

    // 2. ✨ Tipagem correta e System Instruction
    const systemInstruction = `
      Tu és um Guia Turístico Especialista em Angola. 
      CONTEXTO ANTERIOR COM O UTILIZADOR:
      ${context || 'Início de conversa.'}
      
      Instrução Base: Conhecimento geral sobre o turismo em Angola.
    `.trim();

    const answer = await this.groq.getChatCompletion(
      prompt,
      systemInstruction
    );

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.90,
      contextUsed: context // Agora o linter não chora
    };
  }
}