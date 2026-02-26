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

  /**
   * Executa a lógica de especialista em cultura e geração de documentos.
   * 🎯 Adicionamos 'useBackup' para garantir que o PDF seja gerado mesmo sob tráfego alto.
   */
  async execute(query: string, context: string, memoryContext?: string, useBackup = false): Promise<AiResponse> {

    // 1. Enriquecer o contexto com a memória do utilizador
    const enrichedContext = memoryContext
      ? `${context}\n\n[HISTÓRICO DO UTILIZADOR]: ${memoryContext}`
      : context;

    // 2. Gerar o texto sábio através do Groq (Passando o sinal de backup)
    const prompt = NhanekaExpertPrompt(enrichedContext, query);

    // ✨ O SEGREDO: Passamos o useBackup para a GroqStrategy
    const aiText = await this.groq.getChatCompletion(
      prompt,
      enrichedContext,
      useBackup
    );

    // 3. Deteção de intenção de criação de ficheiro
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

    // 4. Se o mestre pediu um documento, chamamos o escriba
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
      contextUsed: enrichedContext,
      fileUrl,
      fileName,
    };
  }
}