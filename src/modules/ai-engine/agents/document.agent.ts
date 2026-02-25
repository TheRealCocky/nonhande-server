// src/modules/ai-engine/agents/document.agent.ts
import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { NhanekaExpertPrompt } from '../prompt-builders/agent-doc.prompt';
import { AiResponse } from '../interfaces/ai-response.interface';
// Certifica-te que o nome do ficheiro é exatamente DocumentGeneratorService
import { DocumentGeneratorService } from '../services/DocumentGeneratorService';

@Injectable()
export class DocumentAgent extends BaseAgent {
  name = 'document_expert';

  constructor(
    private readonly groq: GroqStrategy,
    private readonly pdfGenerator: DocumentGeneratorService
  ) {
    super();
  }

  async execute(query: string, context: string): Promise<AiResponse> {
    const prompt = NhanekaExpertPrompt(context, query);
    const aiText = await this.groq.getChatCompletion(prompt, context);

    const needsPdf = query.toLowerCase().includes('gera') || query.toLowerCase().includes('pdf');

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    if (needsPdf) {
      fileName = `Legado_Nonhande_${Date.now()}.pdf`;
      fileUrl = await this.pdfGenerator.createHistoryPdf(aiText, "Sabedoria Nhaneca");
    }

    return {
      answer: aiText,
      agentUsed: this.name,
      confidence: 0.98,
      contextUsed: context,
      fileUrl,
      fileName,
    };
  }
}