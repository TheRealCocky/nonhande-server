import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { AiResponse } from '../interfaces/ai-response.interface'; // Importar a interface

@Injectable()
export class GeneralAgent extends BaseAgent {
  name = 'angoia_general';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  // Mudamos o retorno para Promise<AiResponse> e aceitamos o contexto opcional
  async execute(query: string, context?: any): Promise<AiResponse> {
    const systemInstruction = `Tu és o Nonhande AI, um assistente virtual angolano. 
    Se a pergunta for fora do âmbito de cultura ou turismo, responde de forma educada, 
    informando que a tua especialidade é a cultura Nhaneka e Angola.`;

    const answer = await this.groq.getChatCompletion(query, systemInstruction);

    // Retornamos o objeto completo conforme a interface exige
    return {
      answer,
      agentUsed: this.name,
      confidence: 0.85, // Confiança base para o modelo geral
      contextUsed: context
    };
  }
}