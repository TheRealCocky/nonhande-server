import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { AiResponse } from '../interfaces/ai-response.interface';
import { GENERAL_SYSTEM_INSTRUCTION, GENERAL_USER_PROMPT } from '../prompt-builders/agent-general.prompt';

@Injectable()
export class GeneralAgent extends BaseAgent {
  name = 'angoia_general';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

async execute(query: string, context?: any, useBackup = false): Promise<AiResponse> {
  // GATEKEEPER: Se não há documentos, aborta antes de chamar o LLM
  const isContextEmpty = !context || 
                         (typeof context === 'string' && context.trim() === "") ||
                         (typeof context === 'object' && Object.keys(context).length === 0);

  if (isContextEmpty) {
    console.warn(`[Nonhande Debug] RAG falhou para a query: "${query}". Abortando chamada ao LLM.`);
    return {
      answer: "Desculpa, não encontrei informações sobre isso na nossa base de dados.",
      agentUsed: this.name,
      confidence: 0,
      contextUsed: null,
    };
  }

  const system = GENERAL_SYSTEM_INSTRUCTION;
  const userPrompt = GENERAL_USER_PROMPT(query, context);
  
  // Só chegamos aqui se o contexto não estiver vazio
  const answer = await this.groq.getChatCompletion(userPrompt, system, useBackup);

  return {
    answer,
    agentUsed: this.name,
    confidence: 0.98,
    contextUsed: context,
  };
}
}
