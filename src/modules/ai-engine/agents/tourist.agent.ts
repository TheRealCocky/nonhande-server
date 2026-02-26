import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { TouristExpertPrompt } from '../prompt-builders/agent-tourist.prompt';
import { AiResponse } from '../interfaces/ai-response.interface';

@Injectable()
export class TouristAgent extends BaseAgent {
  name = 'tourist_guide';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  /**
   * Executa a lógica de guia turístico.
   * 🎯 Adicionamos 'useBackup' para permitir a troca de chave da Groq.
   */
  async execute(query: string, context?: string, useBackup = false): Promise<AiResponse> {
    // 1. O prompt continua a ser gerado com a query
    const prompt = TouristExpertPrompt(query);

    // 2. ✨ System Instruction com contexto de memória
    const systemInstruction = `
      Tu és um Guia Turístico Especialista em Angola (Nonhande AI). 
      CONTEXTO ANTERIOR COM O UTILIZADOR:
      ${context || 'Início de conversa.'}
      
      Instrução Base: Fornece informações precisas sobre províncias, hotéis, gastronomia e monumentos em Angola.
    `.trim();

    // 3. ✨ PASSAMOS O 'useBackup' para a strategy
    const answer = await this.groq.getChatCompletion(
      prompt,
      systemInstruction,
      useBackup // 🎯 Agora o agente sabe usar a Conta 2 se necessário
    );

    return {
      answer,
      agentUsed: this.name,
      confidence: 0.90,
      contextUsed: context
    };
  }
}