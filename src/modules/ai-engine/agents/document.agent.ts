import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { GroqStrategy } from '../strategies/groq.strategy';
import { NhanekaExpertPrompt } from '../prompt-builders/agent-doc.prompt';
import { AiResponse } from '../interfaces/ai-response.interface';
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

  // ✨ Ajuste 1: A assinatura agora aceita memoryContext (opcional)
  async execute(query: string, context: string, memoryContext?: string): Promise<AiResponse> {

    // ✨ Ajuste 2: Injetar a memória no prompt
    // Se houver memória, adicionamos ao contexto para o Groq saber com quem fala
    const enrichedContext = memoryContext
      ? `${context}\n\n[HISTÓRICO DO UTILIZADOR]: ${memoryContext}`
      : context;

    // 1. Gerar o texto sábio através do Groq
    const prompt = NhanekaExpertPrompt(enrichedContext, query);
    const aiText = await this.groq.getChatCompletion(prompt, enrichedContext);

    // 2. Detecção robusta de intenção de criação de ficheiro (Perfeito!)
    const queryLower = query.toLowerCase();
    const needsPdf =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça') ||
      queryLower.includes('escreve') ||
      queryLower.includes('cria');

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    // 3. Se o mestre pediu um documento, chamamos o escriba
    if (needsPdf) {
      fileName = `Legado_Nonhande_${Date.now()}.pdf`;

      try {
        fileUrl = await this.pdfGenerator.createHistoryPdf(aiText, "Sabedoria Nhaneca - Projeto Nonhande");
      } catch (error) {
        console.error('Erro ao gerar PDF no DocumentAgent:', error);
      }
    }

    return {
      answer: aiText,
      agentUsed: this.name,
      confidence: 0.98,
      contextUsed: enrichedContext, // Agora inclui a memória
      fileUrl,
      fileName,
    };
  }
}