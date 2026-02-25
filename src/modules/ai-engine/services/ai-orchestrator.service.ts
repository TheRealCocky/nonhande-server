import { Injectable } from '@nestjs/common';
import { LlamaIndexService } from './llamaindex.service';
import { HuggingFaceStrategy } from '../strategies/huggingface.strategy';
import { DocumentAgent } from '../agents/document.agent';
import { TouristAgent } from '../agents/tourist.agent';
import { GeneralAgent } from '../agents/general.agent';
import { ModelSelectorStrategy } from '../strategies/model-selector.strategy';

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llamaIndex: LlamaIndexService,
    private readonly hf: HuggingFaceStrategy,
    private readonly docAgent: DocumentAgent,
    private readonly touristAgent: TouristAgent,
    private readonly generalAgent: GeneralAgent,
    private readonly modelSelector: ModelSelectorStrategy,
  ) {}

  async getSmartResponse(userQuery: string, forcedAgent?: string) {
    const queryLower = userQuery.toLowerCase();

    // 🕵️ Detecção de intenção de documento para priorizar o DocumentAgent
    const isDocRequest =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça');

    // 1. TURISMO
    if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
      const model = this.modelSelector.selectModel('tourist');
      const result = await this.touristAgent.execute(userQuery);

      return {
        text: result.answer,
        agent: result.agentUsed,
        model,
        confidence: result.confidence
      };
    }

    // 2. CULTURA / DICIONÁRIO / DOCUMENTOS
    if (forcedAgent === 'culture' || forcedAgent === 'document_expert' || isDocRequest || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
      const model = this.modelSelector.selectModel('document');
      const vector = await this.hf.generateEmbedding(userQuery);
      const culturalContext = await this.llamaIndex.searchCulturalContext(vector);

      // O DocumentAgent decide se gera PDF internamente com base no texto
      const result = await this.docAgent.execute(userQuery, culturalContext);

      return {
        text: result.answer,
        sourceContext: culturalContext,
        agent: result.agentUsed,
        model,
        fileUrl: result.fileUrl, // Flui do Agente para o Frontend
        fileName: result.fileName,
        confidence: result.confidence
      };
    }

    // 3. PADRÃO (FALLBACK - AngoIA)
    const model = this.modelSelector.selectModel('general');
    const result = await this.generalAgent.execute(userQuery);

    return {
      text: result.answer,
      agent: result.agentUsed,
      model,
      confidence: result.confidence
    };
  }

  async handleVoiceQuery(audioFile: Express.Multer.File) {
    let transcribedText = await this.hf.transcribeAudio(audioFile.buffer);

    // Camada de Normalização Fonética Nonhande
    const phoneticMap: Record<string, string> = {
      'duende': 'tuende',
      'kowila': 'ko huila',
      'er det': 'ekumbi',
      'kombi': 'ekumbi',
      'conbi': 'ekumbi',
      'tu em de': 'tuende'
    };

    Object.keys(phoneticMap).forEach((error) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      transcribedText = transcribedText.replace(regex, phoneticMap[error]);
    });

    const result = await this.getSmartResponse(transcribedText);

    return {
      transcription: transcribedText,
      ...result
    };
  }

  private checkIfTouristIntent(query: string): boolean {
    const touristKeywords = ['visitar', 'onde fica', 'turismo', 'província', 'huíla', 'hotel', 'monumento', 'namibe', 'benguela', 'serra da leba'];
    return touristKeywords.some(keyword => query.includes(keyword));
  }

  private checkIfCulturalIntent(query: string): boolean {
    const cultureKeywords = ['como se diz', 'tradução', 'nhaneka', 'humbi', 'significa', 'dicionário', 'cultura', 'tradição', 'vátua'];
    return cultureKeywords.some(keyword => query.includes(keyword));
  }
}