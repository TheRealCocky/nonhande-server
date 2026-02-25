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

  async execute(query: string, context: string): Promise<AiResponse> {
    // 1. Gerar o texto sábio através do Groq com o contexto do RAG
    const prompt = NhanekaExpertPrompt(context, query);
    const aiText = await this.groq.getChatCompletion(prompt, context);

    // 2. Detecção robusta de intenção de criação de ficheiro
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

    // 3. Se o mestre pediu um documento, chamamos o escriba (pdfGenerator)
    if (needsPdf) {
      // Nome do ficheiro com timestamp para evitar duplicados
      fileName = `Legado_Nonhande_${Date.now()}.pdf`;

      try {
        // O serviço gera o PDF, sobe para o Cloudinary e devolve o URL seguro
        fileUrl = await this.pdfGenerator.createHistoryPdf(aiText, "Sabedoria Nhaneca - Projeto Nonhande");
      } catch (error) {
        console.error('Erro ao gerar PDF no DocumentAgent:', error);
        // Não travamos a resposta, apenas enviamos sem o link em caso de falha crítica
      }
    }

    // 4. Retornar o objeto completo conforme a interface AiResponse
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