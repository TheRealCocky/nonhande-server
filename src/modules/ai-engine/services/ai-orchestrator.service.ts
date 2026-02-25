// src/modules/ai-engine/services/ai-orchestrator.service.ts
import { Injectable } from '@nestjs/common';
import { LlamaIndexService } from './llamaindex.service';
import { HuggingFaceStrategy } from '../strategies/huggingface.strategy';
import { DocumentAgent } from '../agents/document.agent';
import { TouristAgent } from '../agents/tourist.agent';
import { GeneralAgent } from '../agents/general.agent';
import { ModelSelectorStrategy } from '../strategies/model-selector.strategy'; // Importar o seletor

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llamaIndex: LlamaIndexService,
    private readonly hf: HuggingFaceStrategy,
    private readonly docAgent: DocumentAgent,
    private readonly touristAgent: TouristAgent,
    private readonly generalAgent: GeneralAgent,
    private readonly modelSelector: ModelSelectorStrategy, // Injetar o seletor
  ) {}

  async getSmartResponse(userQuery: string, forcedAgent?: string) {
    const queryLower = userQuery.toLowerCase();

    // 1. TURISMO
    // Nota: Mudei para 'tourist_guide' para bater com o teu name no TouristAgent
    if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
      const model = this.modelSelector.selectModel('tourist');
      const result = await this.touristAgent.execute(userQuery);

      return {
        text: result.answer, // Extraímos a string do objeto
        agent: result.agentUsed,
        model,
        confidence: result.confidence
      };
    }

    // 2. CULTURA / DICIONÁRIO / DOCUMENTOS
    // Nota: 'culture' ou 'document_expert'
    if (forcedAgent === 'culture' || forcedAgent === 'document_expert' || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
      const model = this.modelSelector.selectModel('culture');
      const vector = await this.hf.generateEmbedding(userQuery);
      const culturalContext = await this.llamaIndex.searchCulturalContext(vector);

      // O docAgent agora faz tudo: pensa e gera PDF se necessário
      const result = await this.docAgent.execute(userQuery, culturalContext);

      return {
        text: result.answer,
        sourceContext: culturalContext,
        agent: result.agentUsed,
        model,
        fileUrl: result.fileUrl, // 📄 O link do PDF vai aqui!
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
    // 1. Transcrição bruta do Whisper
    let transcribedText = await this.hf.transcribeAudio(audioFile.buffer);

    // 2. CAMADA DE NORMALIZAÇÃO FONÉTICA (O "Filtro de Sotaque")
    // Aqui mapeamos os erros comuns do Whisper para os termos corretos do Nonhande
    const phoneticMap: Record<string, string> = {
      'duende': 'tuende',
      'kowila': 'ko huila',
      'er det': 'ekumbi',
      'kombi': 'ekumbi',
      'conbi': 'ekumbi',
      'tu em de': 'tuende'
    };

    // Aplicamos a correção de forma case-insensitive
    Object.keys(phoneticMap).forEach((error) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi'); // \b garante que corrige a palavra inteira
      transcribedText = transcribedText.replace(regex, phoneticMap[error]);
    });

    // 3. Agora o Orquestrador recebe o texto já corrigido e decide o agente
    const result = await this.getSmartResponse(transcribedText);

    return {
      transcription: transcribedText, // Devolvemos o texto já limpo para o user
      ...result
    };
  }

  private checkIfTouristIntent(query: string): boolean {
    const touristKeywords = ['visitar', 'onde fica', 'turismo', 'província', 'huíla', 'hotel', 'monumento', 'namibe', 'benguela'];
    return touristKeywords.some(keyword => query.includes(keyword));
  }

  private checkIfCulturalIntent(query: string): boolean {
    const cultureKeywords = ['como se diz', 'tradução', 'nhaneka', 'humbi', 'significa', 'dicionário', 'cultura'];
    return cultureKeywords.some(keyword => query.includes(keyword));
  }
}