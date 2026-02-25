// src/modules/ai-engine/agents/document.agent.ts
import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { NhanekaExpertPrompt } from '../prompt-builders/agent-doc.prompt';

@Injectable()
export class DocumentAgent extends BaseAgent {
  name = 'document_expert';

  constructor(private readonly groq: GroqStrategy) {
    super();
  }

  async execute(query: string, context: string): Promise<string> {
    // Agora o TS vai encontrar a função NhanekaExpertPrompt
    const prompt = NhanekaExpertPrompt(context, query);
    return await this.groq.getChatCompletion(prompt, context);
  }
}